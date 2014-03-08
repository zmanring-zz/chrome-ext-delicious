'use strict'

# Services
services = angular.module('yum.services', [])
services.factory 'delicious', ($http, $q, $rootScope, $location, syncStorage) ->

  Delicious = {}

  Delicious.authenticate = (username, password) ->
    hash = btoa(username + ':' + password)
    options =
      method: 'GET'
      url: 'https://api.del.icio.us/v1/posts/update'
      headers:
        Authorization: 'Basic ' + hash

    $http(options).success ->
      syncStorage.setLocal 'auth-token' : hash

  Delicious.addLink = (linkData) ->
    syncStorage.getLocal('auth-token').then (authToken) ->
      options =
        method: 'POST'
        url: 'https://api.del.icio.us/v1/posts/add'
        headers:
          Authorization: 'Basic ' + authToken
          'Content-Type': 'application/x-www-form-urlencoded'

        transformRequest: (obj) ->
          str = []
          for p of obj
            str.push encodeURIComponent(p) + '=' + encodeURIComponent(obj[p])
          str.join '&'

        data: linkData

      $http(options).success ->

        # Clear out links cache
        syncStorage.removeLocal 'links'

  Delicious.removeLink = (link) ->
    syncStorage.getLocal('auth-token').then (authToken) ->
      options =
        method: 'GET'
        url: 'https://api.del.icio.us/v1/posts/delete'
        headers:
          Authorization: 'Basic ' + authToken

        params:
          md5: link.hash

      $http(options).success ->

        # Clear out links cache
        syncStorage.removeLocal 'links'

  Delicious.getQueryStringByName = (name) ->
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]")
    regexS = "[\\?&]" + name + "=([^&#]*)"
    regex = new RegExp(regexS)
    results = regex.exec($location.$$absUrl)
    (if results then decodeURIComponent(results[1].replace(/\+/g, " ")) else "")

  Delicious.getTab = ->
    defer = $q.defer()
    if chrome.tabs
      chrome.tabs.query
        windowId: chrome.windows.WINDOW_ID_CURRENT
        active: true
      , (tab) ->
        $rootScope.$apply ->
          defer.resolve tab[0]

    else
      defer.resolve
        url: Delicious.getQueryStringByName('url')
        selectionText: Delicious.getQueryStringByName('selected')
        title: Delicious.getQueryStringByName('title')

    defer.promise

  Delicious.getLinks = ->
    defer = $q.defer()

    syncStorage.getLocal('links').then (links) ->

      if links
        defer.resolve links
      else
        Delicious.fetchLinks().then (links) ->
          defer.resolve links

    defer.promise

  Delicious.parseLinks = do ->
    parseLinksResponse = (data) ->
      _parseLink = (rawLink) ->

        link = {}

        # Remove '@' symbols from keys
        for key of rawLink
          k = key.split('@')[1]
          link[k] = rawLink[key]

        # domain root
        link['domain'] = link['href'].replace(/^(.*\/\/[^\/?#]*).*$/, "$1")
        link['private'] = (if (link.shared is 'no') then true else false)
        split = syncStorage.getSync('parse-single-space').then (parseSingleSpace) ->
          (if parseSingleSpace then RegExp(" [ ]?") else "  ")

        link.tags = link.tag.split(split)
        delete link.tag

        link

      json = xml.xmlToJSON(data)
      unless json.posts
        []
      else if angular.isArray(json.posts.post)
        json.posts.post.map _parseLink
      else
        [_parseLink(json.posts.post)]

  Delicious.fetchLinks = do ->
    fetchLinks = ->
      defer = $q.defer()

      syncStorage.getLocal('auth-token').then (authToken) ->

        options =
          method: 'GET'
          url: 'https://api.del.icio.us/v1/posts/all?results=10000&meta=yes'
          headers:
            Authorization: 'Basic ' + authToken

          transformResponse: Delicious.parseLinks

        $http(options).then (resp) ->

          syncStorage.setLocal 'links' : resp.data
          defer.resolve resp.data

      defer.promise

  Delicious.getDeliciousLinkDataByUrl = do ->
    getDeliciousLinkDataByUrl = (url) ->
      defer = $q.defer()

      syncStorage.getLocal('auth-token').then (authToken) ->
        options =
          method: 'GET'
          url: 'https://api.del.icio.us/v1/posts/get?url=' + url
          headers:
            Authorization: 'Basic ' + authToken

          transformResponse: Delicious.parseLinks

        $http(options).then (resp) ->
          defer.resolve resp.data

      defer.promise

  Delicious.getHashes = do ->
    getHashes = ->
      defer = $q.defer()

      syncStorage.getLocal('auth-token').then (authToken) ->

        options =
          method: 'GET'
          url: 'https://api.del.icio.us/v1/posts/all?hashes'
          headers:
            Authorization: 'Basic ' + authToken

        $http(options).then (resp) ->
          defer.resolve resp.data

      defer.promise

  Delicious.getUpdate = do ->
    _parseUpdateResponse = (data) ->
      rawUpdate = xml.xmlToJSON(data).update
      update = {}

      # Remove '@' symbols from keys
      for key of rawUpdate
        k = key.split('@')[1]
        update[k] = rawUpdate[key]

      # Convert time string to time integer
      update.time = new Date(update.time).getTime()
      update
    getUpdate = ->
      defer = $q.defer()

      syncStorage.getLocal('auth-token').then (authToken) ->

        options =
          method: 'GET'
          url: 'https://api.del.icio.us/v1/posts/update'
          headers:
            Authorization: 'Basic ' + authToken

          transformResponse: _parseUpdateResponse

        if $rootScope.loggedIn
          $http(options).then (resp) ->
            defer.resolve resp.data

      defer.promise

  Delicious.getPopularSuggestedTags = do ->
    _parseSuggestionsResponse = (data) ->
      json = xml.xmlToJSON(data)
      if json.suggest
        json.suggest.popular.map (rawSuggestionTag) ->
          suggestedTag = {}

          # Remove '@' symbols from keys
          for key of rawSuggestionTag
            k = key.split('@')[1]
            suggestedTag[k] = rawSuggestionTag[key]
          suggestedTag.tag

    getPopularSuggestedTags = (url) ->
      defer = $q.defer()

      syncStorage.getLocal('auth-token').then (authToken) ->
        options =
            method: 'GET'
            url: 'https://api.del.icio.us/v1/posts/suggest?url=' + url
            headers:
              Authorization: 'Basic ' + authToken

            transformResponse: _parseSuggestionsResponse

        $http(options).then (resp) ->
          defer.resolve resp.data

      defer.promise

  Delicious.getAllMyTags = do ->
    _parseTags = (data) ->
      _parseTag = (rawTag) ->
        tag = {}

        # Remove '@' symbols from keys
        for key of rawTag
          k = key.split('@')[1]
          tag[k] = rawTag[key]
        tag.tag
      json = xml.xmlToJSON(data)

      unless json.tags
        []
      else if angular.isArray(json.tags.tag)
        json.tags.tag.map _parseTag
      else
        [_parseTag(json.tags.tag)]

    getAllMyTags = ->
      defer = $q.defer()

      syncStorage.getLocal('auth-token').then (authToken) ->

        options =
          method: 'GET'
          url: 'https://api.del.icio.us/v1/tags/get'
          headers:
            Authorization: 'Basic ' + authToken

          transformResponse: _parseTags

        $http(options).then (resp) ->
          defer.resolve resp.data

      defer.promise

  Delicious.logout = ->
    syncStorage.clear()


  # Check for updates
  Delicious.getUpdate().then (update) ->

    syncStorage.getLocal('last-update').then (lastUpdate) ->

      lastUpdate = undefined
      if lastUpdate isnt 'NaN'
        lastUpdate = lastUpdate
      else
        lastUpdate = 0

      if update.time isnt lastUpdate

        # Clear storage before fetching new links, this will keep it up to date if the fetch fails for any reason
        syncStorage.removeLocal(['last-update', 'links'])

        Delicious.fetchLinks().then ->
          syncStorage.setLocal 'last-update' : update.time

  Delicious

services.factory 'analytics', ($window) ->
  $window._gaq.push ['_setAccount', 'UA-38039307-2']
  $window._gaq

services.factory 'syncStorage', ($q, $rootScope) ->

  syncStorage = {}

  syncStorage.getLocal = (item) ->
    defer = $q.defer()

    if $rootScope.LOCAL_STORAGE
      if item
        defer.resolve $rootScope.LOCAL_STORAGE[item]
      else
        defer.resolve $rootScope.LOCAL_STORAGE

    else

      chrome.storage.local.get (items) ->
        $rootScope.LOCAL_STORAGE = items

        if item
          defer.resolve items[item]
        else
          defer.resolve items

    defer.promise

  syncStorage.getSync = (item) ->
    defer = $q.defer()

    if $rootScope.SYNC_STORAGE
      if item
        defer.resolve $rootScope.SYNC_STORAGE[item]
      else
        defer.resolve $rootScope.SYNC_STORAGE

    else

      chrome.storage.sync.get (items) ->
        $rootScope.SYNC_STORAGE = items

        if item
          defer.resolve items[item]
        else
          defer.resolve items

    defer.promise

  syncStorage.clearLocal = ->
    chrome.storage.local.clear()
    syncStorage.updateLocal()

  syncStorage.clearSync = ->
    chrome.storage.sync.clear()
    syncStorage.updateSync()

  syncStorage.removeSync = (key) ->
    chrome.storage.sync.remove(key)
    syncStorage.updateSync()

  syncStorage.removeLocal = (key) ->
    console.log key
    chrome.storage.local.remove(key)
    syncStorage.updateLocal()

  syncStorage.setSync = (obj) ->
    chrome.storage.sync.set(obj)
    syncStorage.updateSync()

  syncStorage.setLocal = (obj) ->
    console.log obj
    chrome.storage.local.set(obj)
    syncStorage.updateLocal()

  syncStorage.updateSync = ->
    chrome.storage.sync.get (items) ->
      $rootScope.SYNC_STORAGE = items

  syncStorage.updateLocal = ->
    chrome.storage.local.get (items) ->
      $rootScope.LOCAL_STORAGE = items

  syncStorage
