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
      $location.path('/search/' + $scope.search.searchbox);
    }

    function loadModels() {
      var Phrases = $resource('/search/phrases/:term');
      Phrases.get({term: $scope.search.term }, function(phrases) {
        console.log(phrases);
        google.charts.setOnLoadCallback(function() {
          drawWordChart(phrases.res, $scope.search.term );
        });
      });        
    }

    if($scope.search.term !== "") loadModels(); //TODO: probably only want to load on search

}]);