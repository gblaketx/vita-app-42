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
        $scope.dashboard.yearCounts = res;
      });
    }

    //TODO: Set maps API key
    function drawMapChart(input, region) {
      if($scope.main.getEvernoteAuthor() !== null) return;

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

    function getModelData() {
      var Summary; // Populated conditionally


      //TODO: Revisit multiline
      // if($scope.main.getEvernoteAuthor() === "All") {
      //   var EntryLengths = $resource('/dashboard/allFamilyEntryLengths');
      //   EntryLengths.get({}, function(entries) {
      //     console.log("Family Entry Lengths", entries);
      //     $scope.main.drawMultilineChart("lengthsAreaChart", "Entry Length", entries["data"], 3000); //TODO: Better way?
      //   });  
      // } else {
      //   var EntryLengths = $resource('/dashboard/entryLengths');
      //   EntryLengths.get({}, function(entries) {
      //     $scope.main.drawAreaChart("lengthsAreaChart", "Entry Length", entries["dates"], entries["data"], Math.max.apply(Math, entries["data"]));
      //   });        
      // }

      var EntryLengths = $resource('/dashboard/entryLengths');
      EntryLengths.get({}, function(entries) {
        $scope.main.drawAreaChart("lengthsAreaChart", "Entry Length", entries["dates"], entries["data"], Math.max.apply(Math, entries["data"]));
      });  


      if($scope.main.getEvernoteAuthor() == null) { 
        Summary = $resource('/dashboard/summary');
      } else { // Don't get location on Evernote Entries
        Summary = $resource('/dashboard/familySummary');
        var LocationCounts = $resource('/dashboard/locationCounts');
        LocationCounts.get({}, function(locCounts) {
          $scope.locCounts = locCounts["res"];
          google.charts.setOnLoadCallback(function() { 
            drawMapChart($scope.locCounts, 'US'); 
            drawMapChart($scope.locCounts, '155');
          });
        });
      }


      Summary.get({}, function(stats) {
        stats.longestEntry.timestamp = $scope.main.timestampToDate(stats.longestEntry.timestamp);
        console.log(stats);
        $scope.stats = stats;
      });

      var PeopleCounts = $resource('/dashboard/people');
      PeopleCounts.get({}, function(res) {
        $scope.main.drawBarChart("commonPeopleChart", "Count", res.people, res.data, Math.max.apply(Math, res.data));
        $scope.dashboard.totalDistinctPeople = res.totalDistinctPeople;
        $scope.dashboard.totalPeopleCount = res.totalPeopleCount;
        $scope.dashboard.noPeopleMentions = res.noPeopleMentions;
      });

      var TopWords = $resource('/dashboard/topWords');
      TopWords.get({}, function(words) {
        $scope.topWordsList = words;
      });

      var Sentiment = $resource('/dashboard/sentiment');
      Sentiment.get({}, function(res) {
        $scope.main.drawPieChart("sentimentPieChart", res.labels, res.data);
      });      
    }

    getModelData();

    $scope.$on('setAuthor', getModelData);

  }]);

