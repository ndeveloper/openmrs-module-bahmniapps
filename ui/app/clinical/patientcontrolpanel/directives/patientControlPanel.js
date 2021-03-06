'use strict';

angular.module('bahmni.common.patient')
.directive('patientControlPanel', ['$q', '$rootScope', '$stateParams', '$state', 'contextChangeHandler', 'encounterService', 'configurations', 'clinicalAppConfigService',
        function($q, $rootScope, $stateParams, $state, contextChangeHandler, encounterService, configurations, clinicalAppConfigService) {
            
    var controller = function ($scope) {
        $scope.activeVisit = $scope.visitHistory.activeVisit;

        var DateUtil = Bahmni.Common.Util.DateUtil;
        $scope.retrospectivePrivilege = Bahmni.Common.Constants.retrospectivePrivilege;

        $scope.today = DateUtil.getDateWithoutTime(DateUtil.now());

        $scope.getDashboardLink = function() {
            return "#/patient/" + $scope.patient.uuid + "/dashboard";
        };

        $scope.changeContext = function($event) {
            var allowContextChange = contextChangeHandler.execute()["allow"];

            if(!allowContextChange) {
                $event.preventDefault();
                return;
            }
            $rootScope.toggleControlPanel();
        };

        $scope.isCurrentVisit = function (visit) {
            return $stateParams.visitUuid === visit.uuid;
        };

        var getLinks = function () {
            var state = $state.current.name;
            if (state.match("patient.consultation")) {
                return ([{text: "Dashboard", icon: "btn-summary dashboard-btn", href: $scope.getDashboardLink()}]);
            } else {
                var links = [];
                if ($scope.activeVisit) {
                    links.push({text: "Consultation", icon: "btn-consultation dashboard-btn", href: "#" + clinicalAppConfigService.getConsultationBoardLink()});
                }
                if (state.match("patient.dashboard")) {
                    links.push({text: "Trends", icon: "btn-trends dashboard-btn", href: "../trends/#/patients/" + $scope.patient.uuid});
                } else if (state.match("patient.visit")) {
                    links.push({text: "Dashboard", icon: "btn-summary dashboard-btn", href: "#/patient/" + $scope.patient.uuid + "/dashboard"});
                }
                return links;
            }
        };

        var getStartDateTime = function () {
            return $scope.visitHistory.visits.filter(function (visit) {
                return visit.uuid === $scope.visit.uuid;
            })[0].startDatetime;
        };

        $scope.links = getLinks();
        $rootScope.$on('$stateChangeSuccess', function() {
            $scope.links = getLinks($state.current.name);
        });

        var encounterTypeUuid =  configurations.encounterConfig().getPatientDocumentEncounterTypeUuid();
        $scope.documentsPromise = encounterService.getEncountersForEncounterType($scope.patient.uuid, encounterTypeUuid).then(function(response) {
            return new Bahmni.Clinical.PatientFileObservationsMapper().map(response.data.results);
        });
    };

    return {
        restrict: 'E',
        templateUrl: 'patientcontrolpanel/views/controlPanel.html',
        controller: controller,
        scope: {
            patient: "=",
            visitHistory: "=",
            visit: "="
        }
    };
}]);