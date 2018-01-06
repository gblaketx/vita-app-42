"use strict";

vitaApp.controller("SearchController", ["$scope", "$resource", "$routeParams", "$location",
  function($scope, $resource, $routeParams, $location) {
    $scope.search = {};
    $scope.search.term = $routeParams.term;
    $scope.search.searchbox = "";
    console.log($scope.search.term);
    
    function drawWordChart(input, targetWord) {
      var data = google.visualization.arrayToDataTable(input);
      var options = {
        wordtree: {
          format: 'implicit',
          word: targetWord
        }
      };

      var chart = new google.visualization.WordTree(document.getElementById('word_tree_chart'));
      chart.draw(data, options);
    }

    $scope.search.submitSearch = function() {
      console.log($scope.search.searchbox);
      $location.path('/search/' + $scope.search.searchbox.toLowerCase());
    }

    $(window).resize(function() {
      if(this.resizeTO) clearTimeout(this.resizeTO);
      this.resizeTO = setTimeout(function() {
        $(this).trigger('resizeEndSearch');
      }, 500);
    });

    $(window).on('resizeEndSearch', function() {
      console.log("resize end search called");
      if($scope.search.term) {
        $scope.main.drawCalendarChart("searchCalendarChart", "Frequency", $scope.search.entries);
        drawWordChart($scope.search.phrases, $scope.search.term);
      }
    });

    function loadModels() {
      if(!$scope.search.term) return;

      var Phrases = $resource('/search/phrases/:term');
      Phrases.get({term: $scope.search.term }, function(phrases) {
        console.log(phrases);
        google.charts.setOnLoadCallback(function() {
          drawWordChart(phrases.res, $scope.search.term);
        });
        $scope.search.phrases = phrases.res;
      });

      var SearchWordCounts = $resource('/search/counts/:term');
      SearchWordCounts.get({term: $scope.search.term}, function(res) {
        console.log(res);
        $scope.search.searchWordCount = res.count;
        $scope.search.searchWordEntryCount = res.entries.length;
        // $scope.main.drawAreaChart("search_frequency_chart", "Count", 
        //   res.entries.timestamp, res.entries.data, res.max);
        for (var i = 0; i < res.entries.length; i++) {
          res.entries[i][0] = new Date(res.entries[i][0]);
        }
        google.charts.setOnLoadCallback(function() {
          $scope.main.drawCalendarChart("searchCalendarChart", "Frequency", res.entries);
        });        
        
        $scope.main.drawPieChart("searchSentimentPieChart", 
          res.sentiment.labels, res.sentiment.data);

        $scope.search.entries = res.entries;
      });
    }

    loadModels(); //TODO: probably only want to load on search

    $scope.$on('setAuthor', loadModels);

}]);