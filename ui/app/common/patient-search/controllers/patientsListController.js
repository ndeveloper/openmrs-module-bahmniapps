'use strict';

angular.module('bahmni.common.patientSearch')
.controller('PatientsListController', ['$scope', '$window', 'patientService', '$rootScope', 'appService', 'spinner', '$stateParams', 'retrospectiveEntryService',
    function ($scope, $window, patientService, $rootScope, appService, spinner, $stateParams, retrospectiveEntryService) {
        var initialize = function () {
            var searchTypes = appService.getAppDescriptor().getExtensions("org.bahmni.patient.search", "config").map(mapExtensionToSearchType);
            $scope.search = new Bahmni.Common.PatientSearch.Search(searchTypes);
            $scope.search.markPatientEntry();
            $scope.$watch('search.searchType', fetchPatients);
        };

        $scope.searchPatients = function () {
            return spinner.forPromise(patientService.search($scope.search.searchParameter)).then(function (response) {
                $scope.search.updateSearchResults(response.data.pageOfResults);
                if ($scope.search.hasSingleActivePatient()) {
                    $scope.forwardPatient($scope.search.activePatients[0]);
                }
            });
        };

        $scope.filterPatientsAndSubmit = function() {
            if ($scope.search.searchResults.length == 1) {
                $scope.forwardPatient($scope.search.searchResults[0]);
            }
        };

        $scope.getPatientCount = function (searchType) {
            var params = { q: searchType.handler, v: "full", provider_uuid: $rootScope.currentProvider.uuid };
            patientService.findPatients(params).then(function (response) {
                searchType.patientCount = response.data.length;
                if ($scope.search.isSelectedSearch(searchType)) {
                    $scope.search.updatePatientList(response.data);
                }
            });
        };

        $scope.getHeadings = function(patients){
            if(patients && patients.length > 0){
                var headings = _.chain(patients[0])
                    .keys()
                    .filter(function(heading){
                        return _.indexOf(Bahmni.Common.PatientSearch.Constants.tabularViewIgnoreHeadingsList,heading) === -1;
                    })
                    .value();

                return headings;
            }
            return [];
        };

        var mapExtensionToSearchType = function(appExtn) {
            return {
                    name: appExtn.label,
                    display: appExtn.extensionParams.display,
                    handler: appExtn.extensionParams.searchHandler,
                    forwardUrl: appExtn.extensionParams.forwardUrl,
                    forwardButtonTitle:appExtn.extensionParams.forwardButtonTitle || "View",
                    id: appExtn.id,
                    params:appExtn.extensionParams.searchParams,
                    refreshTime: appExtn.extensionParams.refreshTime || 0,
                    view: appExtn.extensionParams.view || Bahmni.Common.PatientSearch.Constants.searchExtensionTileViewType
            }
        };

        var fetchPatients = function () {
            if($scope.search.isCurrentSearchLookUp()) {
                var params = { q: $scope.search.searchType.handler, v: "full", provider_uuid: $rootScope.currentProvider.uuid };
                return spinner.forPromise(patientService.findPatients(params)).then(function (response) {
                    $scope.search.updatePatientList(response.data);
                })
            }
        };

        $scope.forwardPatient = function (patient) {
            var options = $.extend({}, $stateParams);
            $.extend(options, { patientUuid: patient.uuid, visitUuid: patient.activeVisitUuid || null});
            $window.location = appService.getAppDescriptor().formatUrl($scope.search.searchType.forwardUrl, options, true);
        };

        initialize();
    }
]);
