"use strict";

vitaApp.controller("LearnController", ["$scope", "$resource",
  function($scope, $resource) {
    $scope.learn = {};
    $scope.learn.gramSize = null;
    $scope.learn.outputText = "";
    $scope.learn.generateNGrams = function() {
        let textLength = 50; //TODO: potentially add slider
        var NGramText = $resource('/learn/:n/:length');
        NGramText.get({n: $scope.learn.gramSize, length: textLength}, function(res) {
            $scope.learn.outputText = res.text;
        });
    }

    // $scope.learn.generateNGrams();

}]);