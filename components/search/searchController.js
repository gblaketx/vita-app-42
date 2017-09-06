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

    function loadModels() {
      var Phrases = $resource('/search/phrases/:term');
      Phrases.get({term: $scope.search.term }, function(phrases) {
        console.log(phrases);
        google.charts.setOnLoadCallback(function() {
          drawWordChart(phrases.res, $scope.search.term );
        });
      });

      var SearchWordCounts = $resource('/search/counts/:term');
      SearchWordCounts.get({term: $scope.search.term}, function(res) {
        console.log("search_frequency_chart", "Count", 
          res.entries.timestamp, res.entries.data, res.max);
        $scope.search.searchWordCount = res.count;
        $scope.search.searchWordEntryCount = res.entries.data.length;
        $scope.main.drawAreaChart("search_frequency_chart", "Count", 
          res.entries.timestamp, res.entries.data, res.max);
        $scope.main.drawPieChart("searchSentimentPieChart", 
          res.sentiment.labels, res.sentiment.data);
      });      
    }

    if($scope.search.term) loadModels(); //TODO: probably only want to load on search

}]);