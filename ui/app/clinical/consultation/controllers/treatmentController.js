'use strict';

angular.module('bahmni.clinical')

    .controller('TreatmentController', ['$scope', '$rootScope', 'TreatmentService', 'contextChangeHandler', 'treatmentConfig', 'DrugService', '$timeout', 
        'clinicalAppConfigService','ngDialog', '$window', 'retrospectiveEntryService',
        function ($scope, $rootScope, treatmentService, contextChangeHandler, treatmentConfig, drugService, $timeout,
                  clinicalAppConfigService, ngDialog, $window, retrospectiveEntryService) {

            var DateUtil = Bahmni.Common.Util.DateUtil;

            $scope.treatments = $scope.consultation.newlyAddedTreatments || [];
            $scope.treatmentConfig = treatmentConfig;
            $scope.treatmentActionLinks = clinicalAppConfigService.getTreatmentActionLink();
            var drugOrderAppConfig = clinicalAppConfigService.getDrugOrderConfig();


            function markVariable(variable){
                $scope[variable] = true;
                $timeout(function () {
                    $scope[variable] = false;
                });
            }
            function markEitherVariableDrugOrUniformDrug(drug){
                if(drug.isVariableDosingType()){
                    markVariable('editDrugEntryVariableFrequency');
                }
                else {
                    markVariable('editDrugEntryUniformFrequency');
                }
            }

            markVariable("startNewDrugEntry");

            var drugOrderHistory = null;
            $scope.treatmentConfig.durationUnits = [
                {name: "Hour(s)", factor: 1 / 24},
                {name: "Day(s)", factor: 1},
                {name: "Week(s)", factor: 7},
                {name: "Month(s)", factor: 30},
                {name: "Minute(s)", factor: 1/(24*60)}
            ];

            var newTreatment = function () {

                var newTreatment = new Bahmni.Clinical.DrugOrderViewModel(drugOrderAppConfig, $scope.treatmentConfig, null, retrospectiveEntryService.getRetrospectiveEntry().encounterDate);
                newTreatment.isEditAllowed = false;
                return newTreatment;
            };

            //$scope.today = new Date();
            $scope.today = retrospectiveEntryService.getRetrospectiveEntry().encounterDate;
            $rootScope.$watch(Bahmni.Common.Constants.rootScopeRetrospectiveEntry, function(){
                $scope.today = retrospectiveEntryService.getRetrospectiveEntry().encounterDate;
            });

            $scope.treatment = $scope.consultation.incompleteTreatment || newTreatment();
            $scope.treatmentConfig.durationUnits.forEach(function (durationUnit) {
                if (_.isEqual(durationUnit, $scope.treatment.durationUnit)) {
                    $scope.treatment.durationUnit = durationUnit;
                }
            });

            var watchFunctionForQuantity = function () {
                var treatment = $scope.treatment;
                return {
                    uniformDosingType: treatment.uniformDosingType,
                    variableDosingType: treatment.variableDosingType,
                    doseUnits:treatment.doseUnits,
                    duration: treatment.duration,
                    durationUnit: treatment.durationUnit
                };
            };

            var isSameDrugBeingDiscontinuedAndOrdered = function(){
                var existingTreatment = false;
                angular.forEach($scope.consultation.discontinuedDrugs, function(drugOrder){
                    existingTreatment = _.some($scope.treatments, function (treatment) {
                        return treatment.drug.uuid === drugOrder.drug.uuid;
                    }) && drugOrder.isMarkedForDiscontinue;
                });
                return existingTreatment;
            };

            $scope.$on("event:refillDrugOrder", function (event, drugOrder) {
                var refill = drugOrder.refill();
                drugOrderHistory = drugOrder;
                $scope.treatments.push(refill);
                markVariable("startNewDrugEntry");
            });

            $scope.$on("event:refillDrugOrders", function (event, drugOrders) {
                drugOrders.forEach(function (drugOrder) {
                    var refill = drugOrder.refill();
                    $scope.treatments.push(refill);
                });
            });

            $scope.$on("event:reviseDrugOrder", function (event, drugOrder) {
                $scope.treatments.map(setIsNotBeingEdited);
                drugOrderHistory = drugOrder;
                $scope.treatment = drugOrder.revise();
                markEitherVariableDrugOrUniformDrug($scope.treatment);
                $scope.treatment.currentIndex = $scope.treatments.length + 1;
            });

            $scope.$watch(watchFunctionForQuantity, function () {
                $scope.treatment.calculateQuantityAndUnit();
            }, true);

            $scope.add = function () {
                clearHighlights();

                $scope.treatment.dosingInstructionType = Bahmni.Clinical.Constants.flexibleDosingInstructionsClass;
                var newDrugOrder = $scope.treatment;
                newDrugOrder.effectiveStopDate = DateUtil.addDays(DateUtil.parse(newDrugOrder.effectiveStartDate), newDrugOrder.durationInDays);
                var existingDrugOrders = $rootScope.activeAndScheduledDrugOrders.concat($scope.treatments);
                if ($scope.treatment.isBeingEdited) {
                    $scope.treatments.splice($scope.treatment.currentIndex, 1);
                    $scope.treatment.isBeingEdited = false;
                }

                var potentiallyOverlappingOrders = existingDrugOrders.filter(function (drugOrder) {
                    return (drugOrder.drug.uuid == newDrugOrder.drug.uuid && drugOrder.overlappingScheduledWith(newDrugOrder));
                });

                setEffectiveDates(newDrugOrder, potentiallyOverlappingOrders);


                var alreadyActiveSimilarOrders = existingDrugOrders.filter(function (drugOrder) {
                    return (drugOrder.drug.uuid == newDrugOrder.drug.uuid && drugOrder.overlappingScheduledWith(newDrugOrder));
                });

                if (alreadyActiveSimilarOrders.length > 0) {
                    $scope.alreadyActiveSimilarOrder = _.sortBy(potentiallyOverlappingOrders, 'effectiveStartDate').reverse()[0];
                    ngDialog.open({ template: 'consultation/views/treatmentSections/reviseRefillDrugOrderModal.html', scope: $scope});
                    $scope.popupActive = true;
                    return;
                }
                $scope.treatments.push($scope.treatment);
                $scope.treatment = newTreatment();
                $scope.formInvalid = false;
                markVariable("startNewDrugEntry");
            };
            var setEffectiveDates = function(newDrugOrder, existingDrugOrders){
                existingDrugOrders.forEach(function(existingDrugOrder){
                        if(DateUtil.isSameDate(existingDrugOrder.effectiveStartDate, newDrugOrder.effectiveStopDate)){ //compare date part only of datetime
                            newDrugOrder.effectiveStopDate  = DateUtil.subtractMilliSeconds(existingDrugOrder.effectiveStartDate, 1);
                            if (newDrugOrder.uuid){
                                newDrugOrder.autoExpireDate = newDrugOrder.effectiveStopDate;
                            }
                        }
                        if(DateUtil.isSameDate(existingDrugOrder.effectiveStopDate, newDrugOrder.effectiveStartDate)){ //compare date part only of datetime
                            newDrugOrder.effectiveStartDate = DateUtil.addMilliSeconds(existingDrugOrder.effectiveStopDate, 1) ;
                        }
                });
            };

            $scope.refill = function (drugOrder) {
                $scope.popupActive = false;
                ngDialog.close();
                $scope.clearForm();
                $rootScope.$broadcast("event:refillDrugOrder", drugOrder);
            };

            $scope.revise = function (treatment) {
                $scope.popupActive = false;
                ngDialog.close();
                $rootScope.$broadcast("event:reviseDrugOrder", treatment);
            };

            $scope.toggleShowAdditionalInstructions = function (line) {
                line.showAdditionalInstructions = !line.showAdditionalInstructions;
            };

            $scope.toggleAsNeeded = function (treatment) {
                treatment.asNeeded = !treatment.asNeeded;
            };

            var clearHighlights = function(){
                $scope.treatments.map(setIsNotBeingEdited);
                drugOrderHistory ? drugOrderHistory.isBeingEdited = false : null;
                drugOrderHistory ? drugOrderHistory.isDiscontinuedAllowed = true : null;
            };

            $scope.edit = function (index) {
                clearHighlights();
                markEitherVariableDrugOrUniformDrug($scope.treatments[index]);
                $scope.treatments[index].isBeingEdited = true;
                $scope.treatment = $scope.treatments[index].cloneForEdit(index, drugOrderAppConfig, $scope.treatmentConfig);
            };

            $scope.incompleteDrugOrders = function(){
                var anyValuesFilled =  $scope.treatment.drug || $scope.treatment.uniformDosingType.dose || $scope.treatment.uniformDosingType.frequency || $scope.treatment.variableDosingType.morningDose || $scope.treatment.variableDosingType.afternoonDose || $scope.treatment.variableDosingType.eveningDose || $scope.treatment.duration || $scope.treatment.quantity
                return (anyValuesFilled && $scope.addForm.$invalid);
            };
            $scope.unaddedDrugOrders = function () {
                return $scope.addForm.$valid;
            };

            var contextChange = function () {
                var errorMessages = Bahmni.Clinical.Constants.errorMessages;
                if(isSameDrugBeingDiscontinuedAndOrdered()) {
                    return {allow: false, errorMessage: errorMessages.discontinuingAndOrderingSameDrug};
                }
                if($scope.incompleteDrugOrders()){
                    $scope.formInvalid = true;
                    return {allow: false};
                }
                if($scope.unaddedDrugOrders()){
                    return {allow: false, errorMessage: errorMessages.incompleteForm};
                }
                var valid = _.every($scope.treatments, function(drugOrder){
                    return drugOrder.validate();
                });
                if (!valid) {
                    return {allow: false, errorMessage: errorMessages.invalidItems};
                }
                $scope.consultation.newlyAddedTreatments = $scope.treatments || [];
                $scope.consultation.incompleteTreatment = $scope.treatment;
                return {allow: true};
            };

            $scope.remove = function (index) {
                $scope.treatments.splice(index, 1);
            }

            $scope.getDrugs = function (request) {
                return drugService.search(request.term);
            };

            var setIsNotBeingEdited = function (treatment) {
                treatment.isBeingEdited = false;
                return treatment;
            };

            var constructDrugNameDisplay = function (drug) {
                var drugSearchResult = new Bahmni.Clinical.DrugSearchResult(drug, $scope.treatment.drugNameDisplay);
                return {
                    label: drugSearchResult.getLabel(),
                    value: drugSearchResult.getValue(),
                    drug: drug
                };
            };

            $scope.getDataResults = function (data) {
                return data.map(constructDrugNameDisplay);
            };

            $scope.populateBackingFields = function (item) {
                $scope.treatment.changeDrug({
                    name: item.drug.name,
                    form: item.drug.dosageForm.display,
                    uuid: item.drug.uuid
                });
            };

            $scope.clearForm = function () {
                $scope.treatment = newTreatment();
                clearHighlights();
                markVariable("startNewDrugEntry");
            };

            $scope.openActionLink = function (extension) {
                var url = extension.url.replace("{{patient_ref}}", $scope.patient.identifier);
                $window.open(url, "_blank");
            };

            $scope.toggleTabIndexWithinModal = function(){
                var buttonsToFocusOn = ["reviseButton", "refillButton"];
                var focusedButton = event.target;
                focusedButton.tabIndex = 1;

                buttonsToFocusOn.splice(buttonsToFocusOn.indexOf(focusedButton.id),1);
                var otherButton = buttonsToFocusOn[0];
                $("#"+otherButton)[0].tabIndex = 2;
            };

            contextChangeHandler.add(contextChange);

        }]);