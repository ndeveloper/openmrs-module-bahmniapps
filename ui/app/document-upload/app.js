'use strict';

angular.module('documentupload', ['ui.router', 'bahmni.common.config', 'opd.documentupload', 'bahmni.common.patient', 
    'authentication', 'bahmni.common.appFramework', 'ngDialog', 'httpErrorInterceptor', 'bahmni.common.domain', 
    'bahmni.common.uiHelper', 'ngSanitize', 'bahmni.common.patientSearch', 'bahmni.common.util', 'bahmni.common.routeErrorHandler']);
angular.module('documentupload').config(['$stateProvider', '$httpProvider', '$urlRouterProvider', 
        function ($stateProvider, $httpProvider, $urlRouterProvider) {
        $urlRouterProvider.otherwise('/search');
        var patientSearchBackLink = {label: "", state: "patientsearch", accessKey: "p", id: "patients-link", icon: "icon-users"};
        var homeBackLink = {label: "", url: "../home/", icon: "icon-home"};
        $stateProvider.state('search', {
                url:'/search',
                data: {
                    backLinks: [homeBackLink]
                },
                views: {
                    'content': {
                        templateUrl: '../common/patient-search/views/patientsList.html',
                        controller: 'PatientsListController'
                    },
                    'additional-header': { 
                        templateUrl: '../common/ui-helper/header.html' 
                    }
                },
                resolve: {
                    initialization: 'initialization'
                }
            })
            .state('upload', {
                url: '/patient/:patientUuid/document',
                data: {
                    backLinks: [homeBackLink,patientSearchBackLink]
                },
                views: {
                    'content': {
                        templateUrl: 'views/documentUpload.html',
                        controller: 'DocumentController'
                    },
                    'additional-header': { 
                        templateUrl: 'views/patientHeader.html' 
                    }
                },
                resolve: {
                    initialization: 'initialization'
                }
            })
            .state('error', {
                url: '/error',
                views: {
                    'content': {
                        templateUrl: '../common/ui-helper/error.html'
                    }
                }
            });

        $httpProvider.defaults.headers.common['Disable-WWW-Authenticate'] = true;
    }]).run(['backlinkService', function (backlinkService) {
        FastClick.attach(document.body);

        backlinkService.addBackUrl();
    }]);
