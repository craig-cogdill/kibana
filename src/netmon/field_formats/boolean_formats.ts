/*
 * Copyright 2020 LogRhythm, Inc
 * Licensed under the LogRhythm Global End User License Agreement,
 * which can be found through this page: https://logrhythm.com/about/logrhythm-terms-and-conditions/
 */

export const formatAttachDownload = (value: boolean, field: any, hit: any) => {
  if (!value) {
    return '';
  }

  const session = hit && hit._source && hit._source.Session ? hit._source.Session : '';

  const fileName = hit && hit._source && hit._source.FileGenericName ? hit._source.FileGenericName : '';

  const captured = hit && hit._source && hit._source.Captured ? true : false;

  return `<attach-download session="'${session}'" fileName="'${fileName}'" captured="${captured}">true</attach-download>`;
};

export const formatCaptureDownload = (value: boolean, field: any, hit: any) => {
  if (!value) {
    return '';
  }

  const session = hit && hit._source && hit._source.Session ? hit._source.Session : '';

  return `<capture-download session="'${session}'">true</capture-download>`;
};

export const formatNetmonBoolean = (value: boolean, field: any, hit: any) => {
  switch (field.name) {
    case 'Attach':
      return formatAttachDownload(value, field, hit);
    case 'Captured':
      return formatCaptureDownload(value, field, hit);
    default:
      return '';
  }
};
