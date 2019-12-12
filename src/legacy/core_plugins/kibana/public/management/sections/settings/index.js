/*
 * THIS FILE HAS BEEN MODIFIED FROM THE ORIGINAL SOURCE
 * This comment only applies to modifications applied after the e633644c43a0a0271e0b6c32c382ce1db6b413c3 commit
 *
 * Copyright 2019 LogRhythm, Inc
 * Licensed under the LogRhythm Global End User License Agreement,
 * which can be found through this page: https://logrhythm.com/about/logrhythm-terms-and-conditions/
 */

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { management } from 'ui/management';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import { capabilities } from 'ui/capabilities';
import { I18nContext } from 'ui/i18n';
import indexTemplate from './index.html';
import {
  FeatureCatalogueRegistryProvider,
  FeatureCatalogueCategory,
} from 'ui/registry/feature_catalogue';

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { AdvancedSettings } from './advanced_settings';
import { i18n } from '@kbn/i18n';
import { getBreadcrumbs } from './breadcrumbs';

const REACT_ADVANCED_SETTINGS_DOM_ELEMENT_ID = 'reactAdvancedSettings';

function updateAdvancedSettings($scope, config, query) {
  $scope.$$postDigest(() => {
    const node = document.getElementById(REACT_ADVANCED_SETTINGS_DOM_ELEMENT_ID);
    if (!node) {
      return;
    }

    render(
      <I18nContext>
        <AdvancedSettings
          config={config}
          query={query}
          enableSaving={capabilities.get().advancedSettings.save}
        />
      </I18nContext>,
      node
    );
  });
}

function destroyAdvancedSettings() {
  const node = document.getElementById(REACT_ADVANCED_SETTINGS_DOM_ELEMENT_ID);
  node && unmountComponentAtNode(node);
}

uiRoutes.when('/management/kibana/settings/:setting?', {
  template: indexTemplate,
  k7Breadcrumbs: getBreadcrumbs,
  requireUICapability: 'management.kibana.settings',
  badge: uiCapabilities => {
    if (uiCapabilities.advancedSettings.save) {
      return undefined;
    }

    return {
      text: i18n.translate('kbn.management.advancedSettings.badge.readOnly.text', {
        defaultMessage: 'Read only',
      }),
      tooltip: i18n.translate('kbn.management.advancedSettings.badge.readOnly.tooltip', {
        defaultMessage: 'Unable to save advanced settings',
      }),
      iconType: 'glasses',
    };
  },
});

uiModules.get('apps/management').directive('kbnManagementAdvanced', function(config, $route) {
  return {
    restrict: 'E',
    link: function($scope) {
      config.watchAll(() => {
        updateAdvancedSettings($scope, config, $route.current.params.setting || '');
      }, $scope);

      $scope.$on('$destroy', () => {
        destroyAdvancedSettings();
      });

      $route.updateParams({ setting: null });
    },
  };
});

management.getSection('kibana').register('settings', {
  display: i18n.translate('kbn.management.settings.sectionLabel', {
    defaultMessage: 'Advanced Settings',
  }),
  order: 20,
  url: '#/management/kibana/settings',
});

FeatureCatalogueRegistryProvider.register(() => {
  return {
    id: 'advanced_settings',
    title: i18n.translate('kbn.management.settings.advancedSettingsLabel', {
      defaultMessage: 'Advanced Settings',
    }),
    description: i18n.translate('kbn.management.settings.advancedSettingsDescription', {
      defaultMessage: 'Directly edit settings that control behavior in NetMon-UI.',
    }),
    icon: 'advancedSettingsApp',
    path: '/app/kibana#/management/kibana/settings',
    showOnHomePage: false,
    category: FeatureCatalogueCategory.ADMIN,
  };
});
