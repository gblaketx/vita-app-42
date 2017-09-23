'use strict';

var vitaApp = angular.module('vitaApp', ['ngRoute', 'ngMaterial', 'ngResource']);

vitaApp.config(function ($routeProvider, $mdThemingProvider) {
    $routeProvider.
        when('/dashboard', {
            templateUrl: 'components/dashboard/dashboardTemplate.html',
            controller: 'DashboardController'
        }).
        when('/search', {
            templateUrl: 'components/search/searchTemplate.html',
            controller: 'SearchController'
        }).
        when('/search/:term', {
            templateUrl: 'components/search/searchTemplate.html',
            controller: 'SearchController'
        }).
        when('/learn', {
            templateUrl: 'components/learn/learnTemplate.html',
            controller: 'LearnController'
        }).
        when('/relate', {
            templateUrl: 'components/relate/relateTemplate.html',
            controller: 'RelateController'
        }).
        otherwise({
            redirectTo: '/dashboard'
        });
        $mdThemingProvider
            .theme('default')
            .primaryPalette('indigo')
            .accentPalette('blue');   
        $mdThemingProvider
            .theme('dark')
            .primaryPalette('indigo')
            .dark();
});

vitaApp.controller('MainController', ['$scope', '$resource', 
    '$rootScope', '$location', '$anchorScroll',
    function($scope, $resource, $rootScope, $location, $anchorScroll) {

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
        };

        // Chart.js scripts
        // -- Set new default font family and font color to mimic Bootstrap's default styling
        Chart.defaults.global.defaultFontFamily = '-apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
        Chart.defaults.global.defaultFontColor = '#292b2c';
        // google.charts.load('current', {packages: ['corechart', 'bar', 'calendar', 'geochart', 'wordtree'],
        //   'mapsApiKey': 'AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY'});
        //TODO: add back when get internet

        (function($) {


          // Configure tooltips for collapsed side navigation
          $('.navbar-sidenav [data-toggle="tooltip"]').tooltip({
            template: '<div class="tooltip navbar-sidenav-tooltip" role="tooltip"><div class="arrow"></div><div class="tooltip-inner"></div></div>'
          })

          // Toggle the side navigation
          $("#sidenavToggler").click(function(e) {
            e.preventDefault();
            $("body").toggleClass("sidenav-toggled");
            $(".navbar-sidenav .nav-link-collapse").addClass("collapsed");
            $(".navbar-sidenav .sidenav-second-level, .navbar-sidenav .sidenav-third-level").removeClass("show");
          });

          // Force the toggled class to be removed when a collapsible nav link is clicked
          $(".navbar-sidenav .nav-link-collapse").click(function(e) {
            e.preventDefault();
            $("body").removeClass("sidenav-toggled");
          });

          // Prevent the content wrapper from scrolling when the fixed side navigation hovered over
          $('body.fixed-nav .navbar-sidenav, body.fixed-nav .sidenav-toggler, body.fixed-nav .navbar-collapse').on('mousewheel DOMMouseScroll', function(e) {
            var e0 = e.originalEvent,
              delta = e0.wheelDelta || -e0.detail;
            this.scrollTop += (delta < 0 ? 1 : -1) * 30;
            e.preventDefault();
          });

          // Scroll to top button appear
          $(document).scroll(function() {
            var scrollDistance = $(this).scrollTop();
            if (scrollDistance > 100) {
              $('.scroll-to-top').fadeIn();
            } else {
              $('.scroll-to-top').fadeOut();
            }
          });

          // Configure tooltips globally
          $('[data-toggle="tooltip"]').tooltip()

          // Smooth scrolling using jQuery easing
          $(document).on('click', 'a.scroll-to-top', function(event) {
            var $anchor = $(this);
            $('html, body').stop().animate({
              scrollTop: ($($anchor.attr('href')).offset().top)
            }, 1000, 'easeInOutExpo');
            event.preventDefault();
          });

          // Call the dataTables jQuery plugin
          $(document).ready(function() {
            $('#dataTable').DataTable();
          });

        })(jQuery);

        // $rootScope.$on('$routeChangeSuccess', function(newRoute, oldRoute) {
        //   if($location.hash()) $anchorScroll();
        // });

        $scope.main = {};
        $scope.title = "Vita - Journal Insights";
        $scope.main.navbaritems = { //TODO: get to work with refesh
          "dash" : false,
          "search": false,
          "learn": false,
          "relate": false
        }
        $scope.main.navbaritems[$location.path().slice(1)] = true;

        $scope.main.scrollTo = function(id) {
          let old = $location.hash();
          $location.hash(id);
          $anchorScroll();
          $location.hash(old);
        }

        $scope.main.markSelected = function(item) {
          $scope.main.navbaritems[item] = true;
          // $scope.main.navbaritems.filter(function(x){ return x.key != item.key; }).map(function(x){  
          //  x.selected=false;
          // });
          for(var key in $scope.main.navbaritems) {
            if(key !== item) $scope.main.navbaritems[key] = false;
          }
          console.log($scope.main.navbaritems);
        };

        $scope.main.drawAreaChart = function(id, hoverLabel, labels, data, maxval, color) {
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
        };

        $scope.main.drawBarChart = function(id, hoverLabel, labels, data, maxval, color) {
          if(!color) color = "rgba(2,117,216,1)";

          var ctx = document.getElementById(id);
            var myLineChart = new Chart(ctx, {
                type: 'bar',
                data: {
                  labels: labels,
                  datasets: [{
                    label: hoverLabel,
                    backgroundColor: color,
                    borderColor: color,
                    data: data,
                  }],
                },
                options: {
                  scales: {
                    xAxes: [{
                      gridLines: {
                        display: false
                      },
                      ticks: {
                        maxTicksLimit: 8
                      }
                    }],
                    yAxes: [{
                      ticks: {
                        min: 0,
                        max: maxval,
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
        };

        $scope.main.drawPieChart = function(id, labels, data) {
          // -- Pie Chart Example
          var ctx = document.getElementById(id);
          var myPieChart = new Chart(ctx, {
            type: 'pie',
            data: {
              labels: labels,
              datasets: [{
                data: data,
                backgroundColor: ['#007bff', '#dc3545', '#ffc107', '#28a745'],
              }],
            },
          });
        };

        $scope.main.drawCalendarChart = function(id, title, data) {
          var dataTable = new google.visualization.DataTable();
          dataTable.addColumn({ type: 'datetime', id: 'Date' });
          dataTable.addColumn({ type: 'number', id: 'Mentions' });
          dataTable.addRows(data);

          var chart = new google.visualization.Calendar(document.getElementById(id));

          var options = {
            title: title,
            height: 500
          };

          chart.draw(dataTable, options);
        }

        $scope.main.timestampToDate = function(timestamp) {
            let stamp = new Date(timestamp);
            return(monthNames[stamp.getMonth()] + ' ' + 
             stamp.getDate() + ', ' + stamp.getFullYear()); 
        };

    }]);