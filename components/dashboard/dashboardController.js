"use strict";

vitaApp.controller("DashboardController", ["$scope", "$resource", 
  function($scope, $resource) {

    function loadAssets() {
      // -- Bar Chart Example
      var ctx = document.getElementById("myBarChart");
      var myLineChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ["January", "February", "March", "April", "May", "June"],
          datasets: [{
            label: "Revenue",
            backgroundColor: "rgba(2,117,216,1)",
            borderColor: "rgba(2,117,216,1)",
            data: [4215, 5312, 6251, 7841, 9821, 14984],
          }],
        },
        options: {
          scales: {
            xAxes: [{
              time: {
                unit: 'month'
              },
              gridLines: {
                display: false
              },
              ticks: {
                maxTicksLimit: 6
              }
            }],
            yAxes: [{
              ticks: {
                min: 0,
                max: 15000,
                maxTicksLimit: 5
              },
              gridLines: {
                display: true
              }
            }],
          },
          legend: {
            display: false
          }
        }
      });

      // -- Pie Chart Example
      var ctx = document.getElementById("myPieChart");
      var myPieChart = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: ["Blue", "Red", "Yellow", "Green"],
          datasets: [{
            data: [12.21, 15.58, 11.25, 8.32],
            backgroundColor: ['#007bff', '#dc3545', '#ffc107', '#28a745'],
          }],
        },
      });
    }

    loadAssets();

    function areaChart(id, hoverLabel, labels, data, maxval, color) {
      var colors = {}
      if(color == "red") {
        colors["borderColor"] = "rgba(255, 51, 0, 1)";
        colors["backgroundColor"] = "rgba(255, 51, 0, 0.2)";
        colors["pointBackgroundColor"] = "rgba(255, 51, 0, 1)";
        colors["pointHoverBackgroundColor"] = "rgba(255, 51, 0, 1)";
      } else {
        colors["borderColor"] = "rgba(2,117,216,1)";
        colors["backgroundColor"] = "rgba(2,117,216,0.2)";
        colors["pointBackgroundColor"] = "rgba(2,117,216,1)";
        colors["pointHoverBackgroundColor"] = "rgba(2,117,216,1)";
      }

      // -- Area Chart Example
      var ctx = document.getElementById(id);
      var myLineChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: hoverLabel,
            lineTension: 0.3,
            backgroundColor: colors.backgroundColor,
            borderColor: colors.borderColor,
            pointRadius: 5,
            pointBackgroundColor: colors.pointBackgroundColor,
            pointBorderColor: "rgba(255,255,255,0.8)",
            pointHoverRadius: 5,
            pointHoverBackgroundColor: colors.pointHoverBackgroundColor,
            pointHitRadius: 20,
            pointBorderWidth: 2,
            data: data,
          }],
        },
        options: {
          scales: {
            xAxes: [{
              time: {
                unit: 'date'
              },
              gridLines: {
                display: false
              },
              ticks: {
                maxTicksLimit: 7
              }
            }],
            yAxes: [{
              ticks: {
                min: 0,
                max: maxval,
                maxTicksLimit: 5
              },
              gridLines: {
                color: "rgba(0, 0, 0, .125)",
              }
            }],
          },
          legend: {
            display: false
          }
        }
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
        $(this).trigger('resizeEnd');
      }, 500);
    });

    $(window).on('resizeEnd', function() {
      console.log("resize end called");
      drawMapChart($scope.locCounts, 'US');
      drawMapChart($scope.locCounts, '155');
    });

    var Summary = $resource('/dashboard/summary');
    Summary.get({}, function(stats) {
      console.log('Entry Count', stats.numEntries);
      $scope.stats = stats;
    });

    var EntryLengths = $resource('/dashboard/entryLengths');
    EntryLengths.get({}, function(entries) {
      areaChart("lengthsAreaChart", "Entry Length", entries["dates"], entries["data"], 1100);
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

    var TopWords = $resource('/dashboard/topWords');
    TopWords.get({}, function(words) {
      console.log(words);
      $scope.topWordsList = words;
    });

    var TempTime = $resource('/dashboard/tempTime');
    TempTime.get({}, function(res) {
      areaChart("tempsAreaChart", "Temperature (F)", res["dates"], res["data"], 90, "red");
    });

  }]);

