((angular) ->
  "use strict"

  # App
  app = angular.module("yum", ["ngRoute", "yum.filters", "yum.services", "yum.controllers", "yum.directives"])
  app.config ["$routeProvider", ($routeProvider) ->
    $routeProvider.when "/login",
      templateUrl: "login.html"
      controller: "LoginCtrl"

    $routeProvider.when "/new",
      templateUrl: "new.html"
      controller: "NewLinkCtrl"
      resolve:
        tab: ($q, delicious) ->
          delicious.getTab()

    $routeProvider.when "/bookmarks",
      templateUrl: "bookmarks.html"
      controller: "BookmarksCtrl"

    $routeProvider.otherwise redirectTo: "/login"
  ]
  app.config ($compileProvider) ->
    $compileProvider.aHrefSanitizationWhitelist /^\s*(https?|ftp|mailto|file|chrome-extension):/

  app.run ($rootScope, $location, analytics) ->
    $rootScope.loggedIn = (if localStorage.getItem("chrome-ext-delicious") then true else false)
    $rootScope.defaultTab = (if (localStorage.getItem("chrome-ext-delicious-default-tab")) is "true" then true else false)
    $rootScope.firstTimeFilter = localStorage.getItem("chrome-ext-delicious-filter-description")

    #  first time loading without filters (all checked by default)
    if $rootScope.firstTimeFilter is null
      localStorage.setItem "chrome-ext-delicious-filter-description", "true"
      localStorage.setItem "chrome-ext-delicious-filter-extended", "true"
      localStorage.setItem "chrome-ext-delicious-filter-url", "true"
      localStorage.setItem "chrome-ext-delicious-filter-tags", "true"
      localStorage.setItem "chrome-ext-delicious-filter-time", "true"
    if $location.$$path isnt "/bookmarks" and $location.$$path isnt "/new"
      if $rootScope.defaultTab
        $location.path "/bookmarks"
      else
        $location.path "/new"  if $rootScope.loggedIn
    $rootScope.$on "$routeChangeStart", (e, next, current) ->
      $location.path "/login"  if not $rootScope.loggedIn and next.controller isnt "LoginCtrl"

    $rootScope.$on "$viewContentLoaded", (e) ->
      analytics.push ["_trackPageview", $location.path()]


  # Filters
  filters = angular.module("yum.filters", [])
  filters.filter "list", [->
    (arr) ->
      arr.join ", "
  ]
  filters.filter "filterByWord", ->
    (links, query) ->

      # Only filter if there's a query string
      if angular.isString(query)

        # Get array of words from query
        words = query.toLowerCase().split(" ")

        # Filter the links and return them
        links.filter (link) ->

          # Combine link properties to search into string
          search = [(if (localStorage.getItem("chrome-ext-delicious-filter-description")) is "true" then link["description"] else ""), (if (localStorage.getItem("chrome-ext-delicious-filter-extended")) is "true" then link["extended"] else ""), (if (localStorage.getItem("chrome-ext-delicious-filter-url")) is "true" then link["href"] else ""), ((if (link["shared"] is "no") then "private" else "")), (if (localStorage.getItem("chrome-ext-delicious-filter-tags")) is "true" then link["tags"].join(" ") else ""), (if (localStorage.getItem("chrome-ext-delicious-filter-time")) is "true" then link["time"] else "")].join(" ").toLowerCase()

          # all of the words
          words.every (word) ->
            search.indexOf(word) isnt -1

      else
        # Else just pass all the links through
        links


  # Services
  services = angular.module("yum.services", [])
  services.factory "delicious", ($http, $q, $rootScope, $location) ->

    Delicious = {}

    Delicious.authenticate = (username, password) ->
      hash = btoa(username + ":" + password)
      options =
        method: "GET"
        url: "https://api.del.icio.us/v1/posts/update"
        headers:
          Authorization: "Basic " + hash

      $http(options).success ->
        localStorage.setItem "chrome-ext-delicious", hash

    Delicious.OAuth = ->

      # https://delicious.com/auth/authorize?client_id=f5dad5a834775d3811cdcfd6a37af312&redirect_uri=http://www.example.com/redirect

    #   options =
    #     method: "GET"
    #     url: "https://delicious.com/auth/authorize"
    #     client_id: "bb6ec67264d020a19d427e1c1d1ee22c"
    #     redirect_uri: "http://www.zachmanring.com"

    #   $http(options).success (data) ->
    #     console.log('-------');
    #     console.log(data);
    #     # localStorage.setItem "chrome-ext-delicious", hash
    # Delicious.OAuth();


    Delicious.addLink = (linkData) ->
      hash = localStorage.getItem("chrome-ext-delicious")
      options =
        method: "POST"
        url: "https://api.del.icio.us/v1/posts/add"
        headers:
          Authorization: "Basic " + hash
          "Content-Type": "application/x-www-form-urlencoded"

        transformRequest: (obj) ->
          str = []
          for p of obj
            str.push encodeURIComponent(p) + "=" + encodeURIComponent(obj[p])
          str.join "&"

        data: linkData

      $http(options).success ->

        # Clear out links cache
        localStorage.removeItem "chrome-ext-delicious-links"

    Delicious.removeLink = (link) ->
      hash = localStorage.getItem("chrome-ext-delicious")
      options =
        method: "GET"
        url: "https://api.del.icio.us/v1/posts/delete"
        headers:
          Authorization: "Basic " + hash

        params:
          md5: link.hash

      $http(options).success ->

        # Clear out links cache
        localStorage.removeItem "chrome-ext-delicious-links"

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
          url: Delicious.getQueryStringByName("url")
          selectionText: Delicious.getQueryStringByName("selected")
          title: Delicious.getQueryStringByName("title")

      defer.promise

    Delicious.getLinks = ->
      defer = $q.defer()
      links = JSON.parse(localStorage.getItem("chrome-ext-delicious-links"))
      if links
        defer.resolve links
      else
        @fetchLinks().then defer.resolve
      defer.promise

    Delicious.parseLinks = do ->
      parseLinksResponse = (data) ->
        _parseLink = (rawLink) ->
          link = {}

          # Remove '@' symbols from keys
          for key of rawLink
            k = key.split("@")[1]
            link[k] = rawLink[key]

          # domain root
          link["domain"] = link["href"].replace(/^(.*\/\/[^\/?#]*).*$/, "$1")
          link["private"] = (if (link.shared is "no") then true else false)
          split = (if (localStorage.getItem("chrome-ext-delicious-parse-single-space")) is "true" then RegExp(" [ ]?") else "  ")
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
        hash = localStorage.getItem("chrome-ext-delicious")
        options =
          method: "GET"
          url: "https://api.del.icio.us/v1/posts/all?results=10000"
          headers:
            Authorization: "Basic " + hash

          transformResponse: Delicious.parseLinks

        $http(options).then (resp) ->
          localStorage.setItem "chrome-ext-delicious-links", JSON.stringify(resp.data)
          defer.resolve resp.data

        defer.promise

    Delicious.getDeliciousLinkDataByUrl = do ->
      getDeliciousLinkDataByUrl = (url) ->
        defer = $q.defer()
        hash = localStorage.getItem("chrome-ext-delicious")
        options =
          method: "GET"
          url: "https://api.del.icio.us/v1/posts/get?url=" + url
          headers:
            Authorization: "Basic " + hash

          transformResponse: Delicious.parseLinks

        $http(options).then (resp) ->
          defer.resolve resp.data

        defer.promise

    Delicious.getUpdate = do ->
      _parseUpdateResponse = (data) ->
        rawUpdate = xml.xmlToJSON(data).update
        update = {}

        # Remove '@' symbols from keys
        for key of rawUpdate
          k = key.split("@")[1]
          update[k] = rawUpdate[key]

        # Convert time string to time integer
        update.time = new Date(update.time).getTime()
        update
      return getUpdate = ->
        defer = $q.defer()
        hash = localStorage.getItem("chrome-ext-delicious")
        options =
          method: "GET"
          url: "https://api.del.icio.us/v1/posts/update"
          headers:
            Authorization: "Basic " + hash

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
              k = key.split("@")[1]
              suggestedTag[k] = rawSuggestionTag[key]
            suggestedTag.tag

      return getPopularSuggestedTags = (url) ->
        defer = $q.defer()
        hash = localStorage.getItem("chrome-ext-delicious")
        options =
          method: "GET"
          url: "https://api.del.icio.us/v1/posts/suggest?url=" + url
          headers:
            Authorization: "Basic " + hash

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
            k = key.split("@")[1]
            tag[k] = rawTag[key]
          tag.tag
        json = xml.xmlToJSON(data)

        unless json.tags
          []
        else if angular.isArray(json.tags.tag)
          json.tags.tag.map _parseTag
        else
          [_parseTag(json.tags.tag)]
      return getAllMyTags = ->
        defer = $q.defer()
        hash = localStorage.getItem("chrome-ext-delicious")
        options =
          method: "GET"
          url: "https://api.del.icio.us/v1/tags/get"
          headers:
            Authorization: "Basic " + hash

          transformResponse: _parseTags

        $http(options).then (resp) ->
          defer.resolve resp.data

        defer.promise

    Delicious.logout = ->
      localStorage.clear()

    Delicious.setting = do ->
      getSetting = (key) ->
        setting = localStorage.getItem(prefix + key)
        defaultSetting = defaults[key]
        (if setting then JSON.parse(setting) else defaultSetting)
      setSetting = (key, value) ->
        localStorage.setItem prefix + key, JSON.stringify(value)
      prefix = "chrome-ext-delicious-setting-"
      defaults =
        share: false
        order: "time"
        reverse: true

      setting = (key, value) ->
        (if angular.isUndefined(value) then getSetting(key) else setSetting(key, value))


    # Check for updates
    Delicious.getUpdate().then (update) ->
      data = localStorage.getItem("chrome-ext-delicious-last-update")
      lastUpdate = undefined
      if data isnt "NaN"
        lastUpdate = JSON.parse(data)
      else
        lastUpdate = 0
      if update.time isnt lastUpdate

        # Clear storage before fetching new links, this will keep it up to date if the fetch fails for any reason
        delete localStorage["chrome-ext-delicious-last-update"]

        delete localStorage["chrome-ext-delicious-links"]

        Delicious.fetchLinks().then ->
          localStorage.setItem "chrome-ext-delicious-last-update", update.time


    Delicious

  services.factory "analytics", ($window) ->
    $window._gaq.push ["_setAccount", "UA-38039307-2"]
    $window._gaq


  # Controllers
  controllers = angular.module("yum.controllers", [])
  controllers.controller "AppCtrl", ($scope, $rootScope, $location, delicious) ->
    $scope.menu = [
      path: "/new"
      text: "Add link"
    ,
      path: "/bookmarks"
      text: "My links"
    ]
    $scope.isSelected = (item) ->
      path = $location.path()
      path is item.path

    $scope.logout = (link) ->
      delicious.logout()
      $rootScope.loggedIn = false
      $location.path "/login"

    $scope.extVersion = ->
      manifest = chrome.runtime.getManifest()
      manifest.name + " " + manifest.version

    $scope.username = ->
      localStorage.getItem "chrome-ext-delicious-username"

    # TODO: Redo in angular?
    $(document).keydown (e) ->
      if e.keyCode is 27 || e.altKey and e.shiftKey and e.keyCode is 68 || e.altKey and e.shiftKey and e.keyCode is 66
        # esc || shift-alt-d || shift-alt-b
        window.parent.postMessage('closeModal', '*')

  controllers.controller "LoginCtrl", ($scope, $rootScope, $location, delicious) ->
    $scope.login = ->
      $scope.loading = true
      delicious.authenticate($scope.username, $scope.password).success((data) ->
        localStorage.setItem "chrome-ext-delicious-username", $scope.username
        $rootScope.loggedIn = true
        $location.path "/new"
      ).error (data, code) ->
        json = xml.xmlToJSON(data)
        verboseResult = (if (json.result) then " " + json.result["@code"] else "")
        localStorage.removeItem "chrome-ext-delicious-username", $scope.username
        $rootScope.errorCode = code + verboseResult
        $rootScope.loginFailed = true
        $location.path "/new"


  controllers.controller "NewLinkCtrl", ($scope, $location, tab, delicious, analytics) ->
    $scope.description = tab.title
    $scope.header = "Add link to Delicious"
    $scope.myTags = []
    $scope.myTagsLoaded = false
    $scope.note = tab.selectionText
    $scope.submitLabel = "Add"
    $scope.suggestedTags = []
    $scope.tags = []
    $scope.url = tab.url

    # Get presistant private checkmark
    $scope.share = delicious.setting("share")
    $scope.add = ->
      $scope.loading = true
      delicious.addLink(
        url: $scope.url
        description: $scope.description
        extended: (if ($scope.note) then $scope.note else "")
        shared: ((if not $scope.share then "yes" else "no"))
        tags: $scope.tags.join(", ")
        replace: "yes"
      ).then ->
        $location.path "/bookmarks"
        analytics.push ["_trackEvent", "link-added", "action"]

    $scope.addSuggestedTag = (tag) ->
      tags = angular.copy($scope.tags)
      tags.push tag
      $scope.tags = tags

      # remove from suggestedTags arary
      index = $scope.suggestedTags.indexOf(tag)
      $scope.suggestedTags.splice index, 1

    delicious.getDeliciousLinkDataByUrl($scope.url).then (data) ->
      link = data[0]
      if link
        $scope.description = link["description"]
        $scope.note = link["extended"]
        $scope.header = "Modify your Delicious link"
        $scope.menu[0]["text"] = "Modify link"
        $scope.share = link["private"]
        $scope.submitLabel = "Modify"
        $scope.tags = link["tags"]
      else
        delicious.getPopularSuggestedTags($scope.url).then (tags) ->
          $scope.suggestedTags = tags

    delicious.getAllMyTags().then (myTags) ->
      $scope.myTags = myTags
      $scope.myTagsLoaded = true

      #init (way faster than directive) | Todo: move this out to a function
      select = angular.element("#tag") # only target the 'New' page
      select.select2
        tags: myTags
        tokenSeparators: [","]
        placeholder: "tag"


      # Needed for saving link
      select.bind "change", (e) ->
        $scope.$apply ->
          $scope.tags = e.val



      # Used during suggest click event
      $scope.$watch "tags", (newVal) ->
        select.select2 "val", newVal

    $scope.$watch "share", (value) ->

      # Set presistant private checkmark
      delicious.setting "share", value


  controllers.controller "BookmarksCtrl", ($scope, $timeout, $filter, delicious, analytics) ->
    $scope.limit = 0
    $scope.links = []
    $scope.linksLength = 0
    $scope.myTags = []
    $scope.query = ""
    $scope.order = delicious.setting("order")
    $scope.reverse = delicious.setting("reverse")
    $scope.urlListToOpen = []
    $scope.hideTags = (if (localStorage.getItem("chrome-ext-delicious-hide-my-link-tags")) is "true" then true else false)

    $scope.addUrlToList = (link) ->
      link.linkAdded = true
      $scope.urlListToOpen.push link
      analytics.push ["_trackEvent", "link-btn-add-link-to-list", "clicked"]

    $scope.removeUrlToList = (link) ->
      link.linkAdded = false
      index = $scope.urlListToOpen.indexOf(link)
      $scope.urlListToOpen.splice index, 1
      analytics.push ["_trackEvent", "link-btn-remove-link-from-list", "clicked"]

    $scope.clearUrlList = ->

      # clear links
      i = 0

      while i < $scope.urlListToOpen.length
        $scope.urlListToOpen[i].linkAdded = false
        i++

      # reset list
      $scope.urlListToOpen = []

    $scope.openUrlList = ->
      i = 0

      while i < $scope.urlListToOpen.length
        if chrome.tabs
          chrome.tabs.create
            url: $scope.urlListToOpen[i].href
            active: false

        else

          # Send message to background to open!
          chrome.runtime.sendMessage url: $scope.urlListToOpen[i].href
        i++
      analytics.push ["_trackEvent", "link-btn-open-links", "open-" + $scope.urlListToOpen.length]

      # last thing is to clear the list
      $scope.clearUrlList()

    $scope.confirmRemove = (link) ->
      link.confirmRemoval = true

    $scope.cancelRemove = (link) ->
      link.confirmRemoval = false

    $scope.confirmUpdate = (link) ->
      link.confirmUpdate = true
      link.clean = angular.copy(link)
      analytics.push ["_trackEvent", "link-btn-edit", "clicked"]

    $scope.cancelUpdate = (link) ->
      angular.copy link.clean, link
      link.confirmUpdate = false

    $scope.update = (link) ->
      link.confirmUpdate = false
      link.description = link.tempDescription
      delicious.addLink(
        url: link.href
        description: link.description
        extended: link.note
        shared: ((if (link["private"]) then "no" else "yes"))
        tags: link.tags.join(", ")
        replace: "yes"
      ).then ->
        $scope.getAllMyTags()
        analytics.push ["_trackEvent", "link-updated", "action"]

    $scope.remove = (link) ->
      link.removed = true
      $timeout (->
        index = $scope.links.indexOf(link)
        $scope.links.splice index, 1
        $scope.setLinksLength()
        delicious.removeLink(link).then null, ->
          $scope.links.splice index, 0, link
          $scope.setLinksLength()
          analytics.push ["_trackEvent", "link-removed", "action"]

      ), 500

    $scope.isPrivate = (link) ->
      link["private"]

    $scope.appendQuery = (word) ->
      query = (if $scope.query then ($scope.query + " " + word) else word)
      $scope.query = query.trim()

    $scope.getAllMyTags = ->
      delicious.getAllMyTags().then (myTags) ->
        $scope.myTags = myTags

    $scope.setLinksLength = ->
      $scope.linksLength = $filter("filterByWord")($scope.links, $scope.query).length

    $scope.loadMore = ->
      count = (if $scope.hideTags then 12 else 8)
      if $scope.limit < $scope.links.length
        $scope.limit += count
        analytics.push ["_trackEvent", "link-pages-loaded", ($scope.limit / count).toString()]

    delicious.getLinks().then (links) ->
      $scope.links = links.map((link) ->
        angular.extend link,
          confirmUpdate: false
          confirmRemoval: false
          tempDescription: link.description
          note: link.extended

      )
      $scope.loadMore()

    $scope.getAllMyTags()
    $scope.$watch "query", $scope.setLinksLength
    $scope.$watch "links", $scope.setLinksLength
    $scope.$watch "order", (value) ->
      delicious.setting "order", value

    $scope.$watch "reverse", (value) ->
      delicious.setting "reverse", value

  # Directives
  directives = angular.module("yum.directives", [])
  directives.directive "appVersion", ["version", (version) ->
    (scope, elm, attrs) ->
      elm.text version
  ]

  # TODO: Make select-two-show optional
  directives.directive "selectTwo", [->
    link = (scope, element, attrs, a) ->
      initSelectTwo = ->
        return  unless scope.show
        select.select2
          tags: scope.tags
          tokenSeparators: [","]

        select.select2 "val", scope.val
      select = angular.element(element)
      scope.$watch "show", ->
        initSelectTwo()  if scope.tags.length > 0

      scope.$watch "tags", ->
        initSelectTwo()  if scope.tags.length > 0

      scope.$watch "val", (newVal) ->
        select.select2 "val", newVal

      select.bind "change", (e) ->
        scope.$apply ->
          scope.val = e.val

    restrict: "A"
    scope:
      val: "=ngModel"
      tags: "=selectTwo"
      show: "=selectTwoShow"

    link: link
  ]
  directives.directive "customCheckbox", [->
    link = (scope, element, attrs) ->
      className = attrs["customCheckbox"]
      $wrapper = undefined
      element.wrap "<div class=\"" + className + "\" />"
      $wrapper = element.parent()
      $wrapper.on "click", (e) ->
        scope.$apply ->
          scope[attrs["ngModel"]] = not scope[attrs["ngModel"]]


      scope.$watch attrs["ngModel"], (value) ->
        $wrapper.toggleClass className + "-checked", value

    restrict: "A"
    link: link
  ]
  directives.directive "whenScrolled", ->
    (scope, elm, attr) ->
      raw = elm[0]
      elm.bind "scroll", ->
        scope.$apply attr.whenScrolled  if raw.scrollTop + raw.offsetHeight >= raw.scrollHeight


) angular
