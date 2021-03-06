'use strict';

angular.module('bahmni.registration')
    .controller('CreatePatientController', ['$scope', '$rootScope', '$state', 'patientService', 
        'encounterService','$location', 'Preferences', 'patient', '$window', 'spinner', 'appService', 'sessionService',
    function ($scope, $rootScope, $state, patientService, encounterService, $location, preferences, patientModel,
              $window, spinner, appService, sessionService) {
        var dateUtil = Bahmni.Common.Util.DateUtil;
        var createActionsConfig = [];
        var defaultActions = ["save", "startVisit"];
        var defaultVisitType = appService.getAppDescriptor().getConfigValue('defaultVisitType');
        var locationUuid = sessionService.getLoginLocationUuid();
        var regEncounterTypeUuid = $rootScope.regEncounterConfiguration.encounterTypes[Bahmni.Registration.Constants.registrationEncounterType];
        var configValueForEnterId = appService.getAppDescriptor().getConfigValue('showEnterID');
        $scope.showEnterID = configValueForEnterId === null ? true : configValueForEnterId;

        var identifyEditActions = function() {
            createActionsConfig = appService.getAppDescriptor().getExtensions("org.bahmni.registration.patient.create.action", "config");
            var createActions = createActionsConfig.filter(function(config) {
                if (config.extensionParams) {
                    return config.extensionParams.action ? defaultActions.indexOf(config.extensionParams.action) > -1 : false;
                } else {
                    return false;
                }
            });
            $scope.createActions = createActions;
        };

        (function () {
            $scope.patient = patientModel.create();
            $scope.identifierSources = $rootScope.patientConfiguration.identifierSources;
            var identifierPrefix = $scope.identifierSources.filter(function (identifierSource) {
                return identifierSource.prefix === preferences.identifierPrefix;
            });
            $scope.patient.identifierPrefix = identifierPrefix[0] || $scope.identifierSources[0];
            $scope.hasOldIdentifier = preferences.hasOldIdentifier;
            identifyEditActions();
        })();

        $scope.visitControl = new Bahmni.Common.VisitControl($rootScope.regEncounterConfiguration.getVistTypesAsArray(), defaultVisitType, encounterService);
        $scope.visitControl.onStartVisit = function() {
            $scope.setSubmitSource('startVisit');
        };

        $scope.setSubmitSource = function (source) {
            $scope.submitSource = source;
        };

        var setPreferences = function () {
            preferences.identifierPrefix = $scope.patient.identifierPrefix.prefix;
            preferences.hasOldIdentifier = $scope.hasOldIdentifier;
        };

        var successCallback = function (patientProfileData) {
            $scope.patient.uuid = patientProfileData.patient.uuid;
            $scope.patient.identifier = patientProfileData.patient.identifiers[0].identifier;
            $scope.patient.name = patientProfileData.patient.person.names[0].display;
            $scope.patient.isNew = true;
            $scope.patient.registrationDate = dateUtil.now();
        };

        var createEncounterObject = function() {
            var encounter = { locationUuid : locationUuid, providers: [], encounterTypeUuid: regEncounterTypeUuid};
            if ($rootScope.currentProvider && $rootScope.currentProvider.uuid) {
                encounter.providers.push( { "uuid" : $rootScope.currentProvider.uuid, newpatient: 'true'} );
            }
            return encounter;
        };

        var onCreateVisitFailure = function() {
            $state.go('patient.edit', {patientUuid: $scope.patient.uuid});
        };

        var createVisit = function (patientProfileData) {
            return $scope.visitControl.createVisit(patientProfileData.patient.uuid, createEncounterObject()).success(function () {
                $scope.patient.registrationDate = dateUtil.now();
                goToActionUrl($scope.submitSource, patientProfileData, {newpatient: 'true'});
            }).error(onCreateVisitFailure);
        };

        var followUpAction = function(patientProfileData) {
            if($scope.submitSource === 'startVisit') {
                return spinner.forPromise(createVisit(patientProfileData));
            } else {
                goToActionUrl($scope.submitSource, patientProfileData);
            }
        };

        var goToActionUrl = function(actionName, patientProfileData, queryParams) {
            if ($scope.createActions) {
                var matchedExtensions = $scope.createActions.filter(function(extension) {
                    return extension.extensionParams && extension.extensionParams.action === actionName;
                });
                if (matchedExtensions.length > 0) {
                    var extensionParams = matchedExtensions[0].extensionParams;
                    if (extensionParams && extensionParams.forwardUrl) {
                        var fwdUrl = appService.getAppDescriptor().formatUrl(extensionParams.forwardUrl, {'patientUuid' : patientProfileData.patient.uuid} );
                        $window.location.href = fwdUrl;
                    }
                }
            }
        };

        $scope.create = function () {
            setPreferences();
            if (!$scope.patient.identifier) {
                spinner.forPromise(patientService.generateIdentifier($scope.patient).then(function (response) {
                    $scope.patient.identifier = response.data;
                    return patientService.create($scope.patient).success(successCallback).success(followUpAction);
                }));
            } else {
                spinner.forPromise(patientService.create($scope.patient).success(successCallback).success(followUpAction));
            }
        };

    }]);
