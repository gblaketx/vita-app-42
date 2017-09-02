'use strict';

var vitaApp = angular.module('vitaApp', ['ngRoute', 'ngMaterial', 'ngResource']);

vitaApp.config(function ($routeProvider) {
    $routeProvider.
        when('/dashboard', {
            templateUrl: 'components/dashboard/dashboardTemplate.html',
            controller: 'DashboardController'
        }).
        when('/search/:term', {
            templateUrl: 'components/user-detail/user-detailTemplate.html',
            controller: 'UserDetailController'
        }).
        when('/learn', {
            templateUrl: 'components/user-photos/user-photosTemplate.html',
            controller: 'UserPhotosController'
        }).
        when('/relate', {
            templateUrl: 'components/login-register/login-registerTemplate.html',
            controller: 'LoginRegisterController'
        }).
        otherwise({
            redirectTo: '/dashboard'
        });
});

vitaApp.controller('MainController', ['$scope', '$resource', 
    '$rootScope', 
    function($scope, $resource, $rootScope) {
        $scope.main = {};
        $scope.main.title = "Vita - Journal Insights"
    }]);