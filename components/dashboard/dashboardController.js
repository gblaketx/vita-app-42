"use strict";

vitaApp.controller("DashboardController", ["$scope", "$resource", 
  function($scope, $resource) {
    $scope.dashboard = {};
    $scope.dashboard.details = {"entries": false, "streak": false, "longest": false, "total": false};

    $scope.dashboard.getYearCounts = function() {
      $scope.dashboard.details.entries = !$scope.dashboard.details.entries;
      if($scope.dashboard.yearCounts) return;
      var YearCounts = $resource('/dashboard/yearCounts');
      YearCounts.get({}, function(res) {
        console.log(res);
        $scope.dashboard.yearCounts = res;
        console.log(Object.keys($scope.dashboard.yearCounts).sort());
      });
    }

    //TODO: Set maps API key
    function drawMapChart(input, region) {
      var div;
      var data = google.visualization.arrayToDataTable(input);

      var options = {
        sizeAxis: { minValue: 0, maxValue: 550, maxSize: 32 },
        // region: '155', // Western Europe
        region: region, // North America
        displayMode: 'markers',
        colorAxis: {colors: ['green', 'green']},
        legend: 'none'
      };

      if(region === "US") {
        div = "map_chart_us_div";
      } else {
        div = "map_chart_europe_div"
      }

      var chart = new google.visualization.GeoChart(document.getElementById(div));
      chart.draw(data, options);
    }

    $(window).resize(function() {
      if(this.resizeTO) clearTimeout(this.resizeTO);
      this.resizeTO = setTimeout(function() {
        $(this).trigger('resizeEndDash');
      }, 500);
    });

    $(window).on('resizeEndDash', function() {
      console.log("resize end dash called");
      drawMapChart($scope.locCounts, 'US');
      drawMapChart($scope.locCounts, '155');
    });

    var Summary = $resource('/dashboard/summary');
    Summary.get({}, function(stats) {
      console.log('Entry Count', stats.numEntries);
      stats.longestEntry.timestamp = $scope.main.timestampToDate(stats.longestEntry.timestamp);
      $scope.stats = stats;
    });

    var EntryLengths = $resource('/dashboard/entryLengths');
    EntryLengths.get({}, function(entries) {
      $scope.main.drawAreaChart("lengthsAreaChart", "Entry Length", entries["dates"], entries["data"], 1100);
    });

    var LocationCounts = $resource('/dashboard/locationCounts');
    LocationCounts.get({}, function(locCounts) {

      console.log(locCounts);
      $scope.locCounts = locCounts["res"];
      google.charts.setOnLoadCallback(function() { 
        drawMapChart($scope.locCounts, 'US'); 
        drawMapChart($scope.locCounts, '155');
      });
    });

    var PeopleCounts = $resource('/dashboard/people');
    PeopleCounts.get({}, function(res) {
      console.log(res);
      $scope.main.drawBarChart("commonPeopleChart", "Count", res.people, res.data, 350);
      $scope.dashboard.totalDistinctPeople = res.totalDistinctPeople;
      $scope.dashboard.totalPeopleCount = res.totalPeopleCount;
      $scope.dashboard.noPeopleMentions = res.noPeopleMentions;
    });

    var TopWords = $resource('/dashboard/topWords');
    TopWords.get({}, function(words) {
      console.log(words);
      $scope.topWordsList = words;
    });

    var Sentiment = $resource('/dashboard/sentiment');
    Sentiment.get({}, function(res) {
      console.log(res);
      $scope.main.drawPieChart("sentimentPieChart", res.labels, res.data);
    });

  }]);

