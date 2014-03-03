'use strict'

# App
app = angular.module('yum', ['ngRoute', 'yum.filters', 'yum.services', 'yum.controllers', 'yum.directives'])

app.config ['$routeProvider', ($routeProvider) ->

  $routeProvider.when '/login',
    templateUrl: 'login.html'
    controller: 'LoginCtrl'

  $routeProvider.when '/new',
    templateUrl: 'new.html'
    controller: 'NewLinkCtrl'
    resolve:
      tab: ($q, delicious) ->
        delicious.getTab()

  $routeProvider.when '/bookmarks',
    templateUrl: 'bookmarks.html'
    controller: 'BookmarksCtrl'

  $routeProvider.otherwise redirectTo: '/login'
]

app.config ($compileProvider) ->
  $compileProvider.aHrefSanitizationWhitelist /^\s*(https?|ftp|mailto|file|chrome-extension):/

app.run ($rootScope, $location, analytics, $q, syncStorage) ->

  syncStorage.getLocal('auth-token').then (authToken) ->
    syncStorage.getSync().then (syncStorage) ->

      $rootScope.loggedIn = (if authToken then true else false)
      defaultTab = (if syncStorage['default-tab'] then true else false)
      firstTimeFilter = (if syncStorage['filter-description'] then true else false)

      if !firstTimeFilter
        syncStorage.set
          'filter-description': true,
          'filter-extended': true,
          'filter-url': true,
          'filter-tags': true,
          'filter-time': true

      if $location.$$path isnt '/bookmarks' and $location.$$path isnt '/new'
        if defaultTab
          $location.path '/bookmarks'
        else
          $location.path '/new' if $rootScope.loggedIn

      $rootScope.$on '$routeChangeStart', (e, next, current) ->
        $location.path '/login' if not $rootScope.loggedIn and next.controller isnt 'LoginCtrl'

      $rootScope.$on '$viewContentLoaded', (e) ->
        analytics.push ['_trackPageview', $location.path()]
