'use strict';

describe("Radiology Display Control", function () {
    var scope, element, $compile, encounterService, spinner, configurations, params;
    beforeEach(module('bahmni.common.displaycontrol.documents'));
    beforeEach(module('foo'));

    beforeEach(module(function ($provide) {
        var encounterConfig = {
            getEncounterTypeUuid: function (type) {
            }
        };
        configurations = {
            encounterConfig: function(){
                return encounterConfig;
            }
        };
        params = {"RADIOLOGY": "radiology-uuid", "radiology-uuid": specUtil.respondWith([])};
        spyOn(encounterConfig, 'getEncounterTypeUuid').and.callFake(function(myParam) {
            return params[myParam]
        });
        spinner = jasmine.createSpyObj('spinner', ['forPromise']);
        encounterService = {getEncountersForEncounterType: {}};

        $provide.value('configurations', configurations);
        $provide.value('spinner', spinner);
        $provide.value('encounterService', encounterService);
    }));

    beforeEach(inject(function (_$compile_, $rootScope) {
        scope = $rootScope;
        $compile = _$compile_;
        scope.patient = {
            "name": "Patient name",
            "genderText": "Female",
            "identifier": "Some identifier",
            "ageText": "21 years"
        };
    }));

    beforeEach(function(){
        element = angular.element('<bm-documents patient="patient" config="config" encounter-type="\'RADIOLOGY\'"></bm-documents>');
        $compile(element)(scope);
        spyOn(encounterService, 'getEncountersForEncounterType').and.callFake(function(param1, param2){
            return params[param2];
        });
    });

    it("should show active visit star if visit stop date is not present", function () {
        var records_group1 = [{
            visitStopDate: null
        }, {
            visitStopDate: "2014-10-02T16:10:11.000+0530"
        }];

        var records_group2 = [{
            visitStopDate: "2014-11-02T16:10:11.000+0530"
        }, {
            visitStopDate: "2014-10-02T16:10:11.000+0530"
        }];

        var radiologyRecords = [records_group1, records_group2]

        scope.config = {};
        scope.$digest();

        var isoScope = element.isolateScope();

        expect(isoScope.shouldShowActiveVisitStar(radiologyRecords[0])).toBe(true);
        expect(isoScope.shouldShowActiveVisitStar(radiologyRecords[1])).toBe(false);
    });

    it("should not show active visit star if it is on the visit page", function(){
        scope.config = {
            visitUuids: ["uuid1"]
        };
        scope.$digest();

        var isoScope = element.isolateScope();
        expect(isoScope.shouldShowActiveVisitStar()).toBe(false);
    })
});