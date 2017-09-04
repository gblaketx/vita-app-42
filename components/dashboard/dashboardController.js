"use strict";

vitaApp.controller("DashboardController", ["$scope", "$resource", 
  function($scope, $resource) {

    // Chart.js scripts
    // -- Set new default font family and font color to mimic Bootstrap's default styling
    Chart.defaults.global.defaultFontFamily = '-apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
    Chart.defaults.global.defaultFontColor = '#292b2c';
    google.charts.load('current', {packages: ['corechart', 'bar', 'calendar', 'geochart']});
    
    let monthNames = {
      0 : "January",
      1 : "February",
      2 : "March",
      3 : "April",
      4 : "May",
      5 : "June",
      6 : "July",
      7 : "August",
      8 : "September",
      9 : "October",
      10: "November",
      11: "December"
    }

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

    // -- Google Bar and Calendar Charts
    // google.charts.setOnLoadCallback(drawBasic);

    // function drawBasic() {
    //   var data = 
    //   google.visualization.arrayToDataTable([
    //         ['City', '2010 Population',],
    //         ['New York City, NY', 8175000],
    //         ['Los Angeles, CA', 3792000],
    //         ['Chicago, IL', 2695000],
    //         ['Houston, TX', 2099000],
    //         ['Philadelphia, PA', 1526000]
    //   ]);

    //   var options = {
    //     title: 'Population of Largest U.S. Cities',
    //     chartArea: {width: '50%'},
    //     hAxis: {
    //       title: 'Total Population',
    //       minValue: 0
    //     },
    //     vAxis: {
    //       title: 'City'
    //     }
    //   };

    //   var chart = new google.visualization.BarChart(document.getElementById('barchart_div'));
    //   chart.draw(data, options);

    //   var dataTable = new google.visualization.DataTable();
    //   dataTable.addColumn({ type: 'date', id: 'Date' });
    //   dataTable.addColumn({ type: 'number', id: 'Won/Loss' });
    //   dataTable.addRows([
    //     [ new Date(2012, 3, 13), 37032 ],
    //     [ new Date(2012, 3, 14), 38024 ],
    //     [ new Date(2012, 3, 15), 38024 ],
    //     [ new Date(2012, 3, 16), 38108 ],
    //     [ new Date(2012, 3, 17), 38229 ],
    //     // Many rows omitted for brevity.
    //     [ new Date(2013, 9, 4), 38177 ],
    //     [ new Date(2013, 9, 5), 38705 ],
    //     [ new Date(2013, 9, 12), 38210 ],
    //     [ new Date(2013, 9, 13), 38029 ],
    //     [ new Date(2013, 9, 19), 38823 ],
    //     [ new Date(2013, 9, 23), 38345 ],
    //     [ new Date(2013, 9, 24), 38436 ],
    //     [ new Date(2013, 9, 30), 38447 ]
    //   ]);

    //   var calChart = new google.visualization.Calendar(document.getElementById('calendar_basic'));

    //   var calOptions = {
    //    title: "Red Sox Attendance",
    //    height: 350,
    //   };

    //   calChart.draw(dataTable, calOptions);  

    // }

    loadAssets();


    var Summary = $resource('/dashboard/summary');
    Summary.get({}, function(stats) {
      console.log('Entry Count', stats.numEntries);
      $scope.stats = stats;
    });

    var EntryLengths = $resource('/dashboard/entryLengths', {}, {
      get: {method: 'get', isArray: true}
    });

    EntryLengths.get({}, function(entries) {
      var dates = [];
      var data = [];
      for (var i = 0; i < entries.length; i++) {
        var stamp = new Date(entries[i].timestamp); //TODO: way w/o date conversion?
        var datestring = monthNames[stamp.getMonth()] + ' ' +  stamp.getDate() + ', ' + stamp.getFullYear(); 
        dates.push(datestring);
        data.push(entries[i].length);
      }
      areaChart("lengthsAreaChart", "Entry Lengths", dates, data);
    });

    var LocationCounts = $resource('/dashboard/locationCounts');
    LocationCounts.get({}, function(locCounts) {
      console.log(locCounts);
    });


    function areaChart(id, hoverLabel, labels, data) {
      // -- Area Chart Example
      var ctx = document.getElementById(id);
      var myLineChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: hoverLabel,
            lineTension: 0.3,
            backgroundColor: "rgba(2,117,216,0.2)",
            borderColor: "rgba(2,117,216,1)",
            pointRadius: 5,
            pointBackgroundColor: "rgba(2,117,216,1)",
            pointBorderColor: "rgba(255,255,255,0.8)",
            pointHoverRadius: 5,
            pointHoverBackgroundColor: "rgba(2,117,216,1)",
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
                max: 1100,
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




    google.charts.setOnLoadCallback(drawMapChart);

    //TODO: Set maps API key
    function drawMapChart() {
      var data = google.visualization.arrayToDataTable([
        ['Country',   'Population', 'Area Percentage'],
        ['France',  65700000, 50],
        ['Germany', 81890000, 27],
        ['Poland',  38540000, 23]
      ]);

      var options = {
        sizeAxis: { minValue: 0, maxValue: 100 },
        region: '155', // Western Europe
        displayMode: 'markers',
        colorAxis: {colors: ['#e7711c', '#4374e0']} // orange to blue
      };

      var chart = new google.visualization.GeoChart(document.getElementById('map_chart_div'));
      chart.draw(data, options);
    }      

  }]);

