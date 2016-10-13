# File: loadAssets.py
#
# Author: Craig Cogdill

import json
import time
import argparse
from elasticsearch import Elasticsearch
from os import listdir
from os.path import isfile, join, splitext
from util import ElasticsearchUtil
from util import Utility
from util import Logger
es = Elasticsearch(max_retries=5, retry_on_timeout=True)
esUtil = ElasticsearchUtil()
logger = Logger()
logging, rotating_handler = logger.configure_and_return_logging()
UTIL = Utility()

resources = "/usr/local/kibana-" + esUtil.KIBANA_VERSION + "-linux-x64/resources/profileDB"
dashboards_path = resources + "/dashboards" 
visualizations_path = resources + "/visualizations" 
searches_path = resources + "/searches" 

dashboard_type = "dashboard"
visualization_type = "visualization"
search_type = "search"

def create_document_from_file(es_index, es_type, es_id, path_to_updated_json):
    content = UTIL.read_json_from_file(path_to_updated_json)
    return esUtil.function_with_timeout(esUtil.STARTUP_TIMEOUT,
                                      esUtil.create_document,
                                          es_index,
                                          es_type,
                                          es_id,
                                          content)

def get_es_id(filename):
    return splitext(filename)[0]

def get_version_of_file(file):
    file_json = UTIL.read_json_from_file(file)
    version_from_file = UTIL.safe_list_read(file_json, 'version')
    return version_from_file

def update_existing_document(es_index, es_type, es_id, path_to_updated_json):
    deleted, del_ret_val = esUtil.function_with_timeout(esUtil.ES_QUERY_TIMEOUT, 
                                                      esUtil.delete_document,
                                                        es_index,
                                                        es_type,
                                                        es_id)
    logging.info("Delete returns: " + str(json.dumps(del_ret_val)))
    created, create_ret_val = create_document_from_file(es_index,
                                                      es_type,
                                                      es_id,
                                                      path_to_updated_json)
    logging.info("Create returns: " + str(create_ret_val))

def es_version_is_outdated(es_index, es_type, es_id, full_file_path):
    get_response_json = esUtil.get_request_as_json(es_index, es_type, es_id)
    version_of_disk_file = get_version_of_file(full_file_path)
    es_file_source = UTIL.safe_list_read(get_response_json, '_source')
    version_of_es_file = UTIL.safe_list_read(es_file_source, 'version')
    return version_of_disk_file > version_of_es_file, version_of_disk_file, version_of_es_file

def print_error_and_usage(arg_parser, error):
   print "Error:  " + error + "\n"
   print arg_parser.print_help()
   sys.exit(2)

def santize_input_args(arg_parser, args):
   if len(sys.argv) == 1:
      print_error_and_usage(arg_parser, "No arguments supplied.")
   if (args.prof_dir is None):
      print_error_and_usage(arg_parser, "Must have the following flag: -p (--profiledir)")

def load_assets(es_index, es_type, path_to_files, files):
    for file in files:
        logging.info("--------- " + file + " ---------")
        full_file_path = path_to_files + "/" + file
        es_id = get_es_id(file)
        ignored, asset_exists = esUtil.function_with_timeout(esUtil.ES_QUERY_TIMEOUT,
                                      esUtil.document_exists,
                                          es_index,
                                          es_type,
                                          es_id)
        if asset_exists:
            es_outdated, version_of_disk_file, version_of_es_file = es_version_is_outdated(es_index,
                                                                                           es_type,
                                                                                           es_id,
                                                                                           full_file_path)
            if es_outdated:
                logging.info("File \"" + str(file) + "\" is outdated and requires update from version " + str(version_of_es_file) +
                             " to version " + str(version_of_disk_file) + ". Updating it now...")
                update_existing_document(es_index, es_type, es_id, full_file_path)
            else:
                logging.info("Current version of file \"" + str(file) + "\" in Elasticsearch is up-to-date. Version: " + str(version_of_es_file))
        else:
            logging.info("File \"" + str(file) + "\" doesn't exist in Elasticsearch. Creating it now...")
            created, created_ret = create_document_from_file(es_index, es_type, es_id, full_file_path)
            logging.info("Create returns: " + created_ret)


# ----------------- MAIN -----------------
def main():
    argParser = argparse.ArgumentParser(description="Load a custom tagging Profile Dashboard and all of it's assets.")
    argParser.add_argument("-p", "--profiledir", dest="prof_dir", metavar="PROFILE_DIR", help="Profile directory path containing assets to load into ES")
   
    args = argParser.parse_args()

    santize_input_args(arg_parser=argParser, args=args)
    global resources
    resources = args.prof_dir

    # Create arrays of the filenames in each of the resource dirs
    dashboards = [filename for filename in listdir(dashboards_path) if isfile(join(dashboards_path, filename))]
    visualizations = [filename for filename in listdir(visualizations_path) if isfile(join(visualizations_path, filename))]
    searches = [filename for filename in listdir(searches_path) if isfile(join(searches_path, filename))]

    # Load all the artifacts appropriately
    logging.info("================================== DASHBOARDS ==================================")
    load_assets(esUtil.KIBANA_INDEX, dashboard_type, dashboards_path, dashboards)
    logging.info("================================== VISUALIZATIONS ==================================")
    load_assets(esUtil.KIBANA_INDEX, visualization_type, visualizations_path, visualizations)
    logging.info("================================== SEARCHES ==================================")
    load_assets(esUtil.KIBANA_INDEX, search_type, searches_path, searches)

if __name__ == '__main__':
    main()
