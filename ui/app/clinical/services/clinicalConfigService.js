'use strict';

angular.module('bahmni.clinical')
    .service('clinicalConfigService', ['appService', function (appService) {

        this.getConceptSetUIConfig = function (name) {
            var config = appService.getAppDescriptor().getConfigValue("conceptSetUI") || {};
            return config[name];
        };

        this.getObsIgnoreList = function () {
            return appService.getAppDescriptor().getConfigValue("obsIgnoreList") || {};
        };

        this.getAllConsultationBoards = function () {
            return appService.getAppDescriptor().getExtensions("org.bahmni.clinical.consultation.board", "link");
        };

        this.getAllConceptSetExtensions = function (conceptSetGroupName) {
            return appService.getAppDescriptor().getExtensions("org.bahmni.clinical.conceptSetGroup." + conceptSetGroupName, "config")
        };

        this.getAllPatientDashboardSections = function () {
            return appService.getAppDescriptor().getConfigValue("patientDashboardSections") || {};
        };
        
        this.getOtherInvestigationsMap = function () {
            return appService.getAppDescriptor().getConfig("otherInvestigationsMap");  
        };

    }]);