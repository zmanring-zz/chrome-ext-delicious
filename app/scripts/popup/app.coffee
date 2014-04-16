'use strict'

# App
app = angular.module('yum', ['ui.router','yum.filters', 'yum.services', 'yum.controllers', 'yum.directives'])

app.config ($stateProvider, $urlRouterProvider) ->

    $stateProvider.state('new',
      url: '/new'
      templateUrl: 'new.html'
      controller: 'NewLinkCtrl'
      resolve:
        tab: ($q, delicious) ->
          delicious.getTab()
      # authenticate: true

    ).state('bookmarks',
      url: '/bookmarks'
      templateUrl: 'bookmarks.html'
      controller: 'BookmarksCtrl'
      # authenticate: true

    ).state 'login',
      url: '/login'
      templateUrl: 'login.html'
      controller: 'LoginCtrl'
      # authenticate: false

    # Send to login if the URL was not found
    $urlRouterProvider.otherwise '/login'


app.config ($compileProvider) ->
  $compileProvider.aHrefSanitizationWhitelist /^\s*(https?|ftp|mailto|file|chrome-extension):/

# Run
app.run ($rootScope, $state, syncStorage) ->

  # async get storage
  async.parallel [
    (callback) ->
      syncStorage.getLocal().then (local) ->
        callback(null, local);

    (callback) ->
      syncStorage.getSync().then (sync) ->
        callback(null, sync);
  ],
  (err, results) ->
    obj = {
      local: results[0],
      sync: results[1]
    }

    $rootScope.dataStorage = obj
    $rootScope.$broadcast 'synced', obj


  $rootScope.$on '$stateChangeStart', (event, toState, toParams, fromState, fromParams) ->
    # console.log toState


  $rootScope.$on 'synced', (event, data) ->

    $rootScope.authenticated = $rootScope.dataStorage.local['auth-token']

    # first time?
    filter = $rootScope.dataStorage.sync
    syncStorage.setSync({'filter-description':true}) if filter['filter-description'] == undefined
    syncStorage.setSync({'filter-extended':true}) if filter['filter-extended'] == undefined
    syncStorage.setSync({'filter-tags':true}) if filter['filter-tags'] == undefined
    syncStorage.setSync({'filter-time':true}) if filter['filter-time'] == undefined
    syncStorage.setSync({'filter-url':true}) if filter['filter-url'] == undefined
    syncStorage.setSync({'setting-private':false}) if filter['setting-private'] == undefined

    # if authenticated
    if $rootScope.authenticated

      if $rootScope.dataStorage.sync['default-tab']
        $state.transitionTo 'bookmarks'
      else
        $state.transitionTo 'new'

    else
      $state.transitionTo 'login'
