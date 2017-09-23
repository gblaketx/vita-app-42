"use strict";

vitaApp.controller("RelateController", ["$scope", "$resource",
  function($scope, $resource) {
    $scope.relate = {};

    var TempTime = $resource('/relate/tempTime');
    TempTime.get({}, function(res) {
      $scope.main.drawAreaChart("tempsAreaChart", "Temperature (F)", res["dates"], res["data"], 90, "red");
    });

    var WalkDistance = $resource('/relate/WalkDistance');
    WalkDistance.get({}, function(res) {
      $scope.main.drawAreaChart("walkDistanceAreaChart", "Distance (Miles)", res["dates"], res["data"], 12);
    });

    var WeekdayLength = $resource('/relate/weekdayLength');
    WeekdayLength.get({}, function(res) {
      $scope.main.drawBarChart("weekdayLengthBarChart", "Length (Words)", 
        res["labels"], res["data"], 350), "#28a745";
    });

    var WeekdaySentiment = $resource('/relate/weekdaySentiment');
    WeekdaySentiment.get({}, function(res) {
      console.log(res);
      $scope.main.drawBarChart("weekdaySentimentBarChart", "Sentiment Score", res["labels"], res["data"], 5);
    })

}]);