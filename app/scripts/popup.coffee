# ((angular) ->
#   'use strict'

#   # Sync with Chrome
#   chrome.storage.sync.get (SYNC_STORAGE) ->
#     chrome.storage.local.get (LOCAL_STORAGE) ->

#       # App
#       app = angular.module('yum', ['ngRoute', 'yum.filters', 'yum.services', 'yum.controllers', 'yum.directives'])

#       app.config ['$routeProvider', ($routeProvider) ->

#         $routeProvider.when '/login',
#           templateUrl: 'login.html'
#           controller: 'LoginCtrl'

#         $routeProvider.when '/new',
#           templateUrl: 'new.html'
#           controller: 'NewLinkCtrl'
#           resolve:
#             tab: ($q, delicious) ->
#               delicious.getTab()

#         $routeProvider.when '/bookmarks',
#           templateUrl: 'bookmarks.html'
#           controller: 'BookmarksCtrl'

#         $routeProvider.otherwise redirectTo: '/login'
#       ]

#       app.config ($compileProvider) ->
#         $compileProvider.aHrefSanitizationWhitelist /^\s*(https?|ftp|mailto|file|chrome-extension):/

#       app.run ($rootScope, $location, analytics, $q, syncStorage) ->

#         $rootScope.loggedIn = (if LOCAL_STORAGE['auth-token'] then true else false)
#         defaultTab = (if SYNC_STORAGE['default-tab'] then true else false)
#         firstTimeFilter = (if SYNC_STORAGE['filter-description'] then true else false)

#         if !firstTimeFilter
#           syncStorage.set
#             'filter-description': true,
#             'filter-extended': true,
#             'filter-url': true,
#             'filter-tags': true,
#             'filter-time': true

#         if $location.$$path isnt '/bookmarks' and $location.$$path isnt '/new'
#           if defaultTab
#             $location.path '/bookmarks'
#           else
#             $location.path '/new' if $rootScope.loggedIn

#         $rootScope.$on '$routeChangeStart', (e, next, current) ->
#           $location.path '/login' if not $rootScope.loggedIn and next.controller isnt 'LoginCtrl'

#         $rootScope.$on '$viewContentLoaded', (e) ->
#           analytics.push ['_trackPageview', $location.path()]

#       app.factory('syncStorage', ->
#         clear: ->
#           chrome.storage.local.clear()
#           @syncLocal()

#         remove: (keys) ->
#           chrome.storage.sync.remove(keys)
#           @sync()

#         removeLocal: (keys) ->
#           chrome.storage.local.remove(keys)
#           @syncLocal()

#         set: (obj) ->
#           chrome.storage.sync.set(obj)
#           @sync()

#         setLocal: (obj) ->
#           chrome.storage.local.set(obj)
#           @syncLocal()

#         sync: ->
#           chrome.storage.sync.get (items) ->
#             SYNC_STORAGE = items

#         syncLocal: ->
#           chrome.storage.local.get (items) ->
#             LOCAL_STORAGE = items
#       )


#       # Filters
#       filters = angular.module('yum.filters', [])
#       filters.filter 'list', [->
#         (arr) ->
#           arr.join ', '
#       ]
#       filters.filter 'filterByWord', ($rootScope) ->

#         (links, query) ->

#           # Only filter if there's a query string
#           if angular.isString(query)

#             # Get array of words from query
#             words = query.toLowerCase().split(' ')

#             # Filter the links and return them
#             links.filter (link) ->

#               # Combine link properties to search into string
#               search = [
#                 link['description'] if SYNC_STORAGE['filter-description']
#                 link['extended'] if SYNC_STORAGE['filter-extended']
#                 link['url'] if SYNC_STORAGE['filter-url']
#                 link['tags'] if SYNC_STORAGE['filter-tags']
#                 link['time'] if SYNC_STORAGE['filter-time']
#                 ((if (link['shared'] is 'no') then 'private' else ''))
#               ].join(' ').toLowerCase()

#               # all of the words
#               words.every (word) ->
#                 search.indexOf(word) isnt -1

#           else
#             # Else just pass all the links through
#             links


#       # Services
#       services = angular.module('yum.services', [])
#       services.factory 'delicious', ($http, $q, $rootScope, $location, syncStorage) ->

#         Delicious = {}

#         Delicious.authenticate = (username, password) ->
#           hash = btoa(username + ':' + password)
#           options =
#             method: 'GET'
#             url: 'https://api.del.icio.us/v1/posts/update'
#             headers:
#               Authorization: 'Basic ' + hash

#           $http(options).success ->
#             syncStorage.setLocal 'auth-token': hash

#         Delicious.addLink = (linkData) ->
#           options =
#             method: 'POST'
#             url: 'https://api.del.icio.us/v1/posts/add'
#             headers:
#               Authorization: 'Basic ' + LOCAL_STORAGE['auth-token']
#               'Content-Type': 'application/x-www-form-urlencoded'

#             transformRequest: (obj) ->
#               str = []
#               for p of obj
#                 str.push encodeURIComponent(p) + '=' + encodeURIComponent(obj[p])
#               str.join '&'

#             data: linkData

#           $http(options).success ->

#             # Clear out links cache
#             syncStorage.removeLocal 'links'

#         Delicious.removeLink = (link) ->
#           options =
#             method: 'GET'
#             url: 'https://api.del.icio.us/v1/posts/delete'
#             headers:
#               Authorization: 'Basic ' + LOCAL_STORAGE['auth-token']

#             params:
#               md5: link.hash

#           $http(options).success ->

#             # Clear out links cache
#             syncStorage.removeLocal 'links'

#         Delicious.getQueryStringByName = (name) ->
#           name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]")
#           regexS = "[\\?&]" + name + "=([^&#]*)"
#           regex = new RegExp(regexS)
#           results = regex.exec($location.$$absUrl)
#           (if results then decodeURIComponent(results[1].replace(/\+/g, " ")) else "")

#         Delicious.getTab = ->
#           defer = $q.defer()
#           if chrome.tabs
#             chrome.tabs.query
#               windowId: chrome.windows.WINDOW_ID_CURRENT
#               active: true
#             , (tab) ->
#               $rootScope.$apply ->
#                 defer.resolve tab[0]

#           else
#             defer.resolve
#               url: Delicious.getQueryStringByName('url')
#               selectionText: Delicious.getQueryStringByName('selected')
#               title: Delicious.getQueryStringByName('title')

#           defer.promise

#         Delicious.getLinks = ->
#           defer = $q.defer()

#           if LOCAL_STORAGE['links']
#             defer.resolve LOCAL_STORAGE['links']
#           else
#             Delicious.fetchLinks().then (links) ->
#               defer.resolve links

#           defer.promise

#         Delicious.parseLinks = do ->
#           parseLinksResponse = (data) ->
#             _parseLink = (rawLink) ->
#               link = {}

#               # Remove '@' symbols from keys
#               for key of rawLink
#                 k = key.split('@')[1]
#                 link[k] = rawLink[key]

#               # domain root
#               link['domain'] = link['href'].replace(/^(.*\/\/[^\/?#]*).*$/, "$1")
#               link['private'] = (if (link.shared is 'no') then true else false)
#               split = (if SYNC_STORAGE['parse-single-space'] then RegExp(" [ ]?") else "  ")
#               link.tags = link.tag.split(split)
#               delete link.tag

#               link
#             json = xml.xmlToJSON(data)
#             unless json.posts
#               []
#             else if angular.isArray(json.posts.post)
#               json.posts.post.map _parseLink
#             else
#               [_parseLink(json.posts.post)]

#         Delicious.fetchLinks = do ->
#           fetchLinks = ->
#             defer = $q.defer()

#             options =
#               method: 'GET'
#               url: 'https://api.del.icio.us/v1/posts/all?results=10000&meta=yes'
#               headers:
#                 Authorization: 'Basic ' + LOCAL_STORAGE['auth-token']

#               transformResponse: Delicious.parseLinks

#             $http(options).then (resp) ->
#               syncStorage.setLocal 'links': resp.data
#               defer.resolve resp.data

#             defer.promise

#         Delicious.getDeliciousLinkDataByUrl = do ->
#           getDeliciousLinkDataByUrl = (url) ->
#             defer = $q.defer()

#             options =
#               method: 'GET'
#               url: 'https://api.del.icio.us/v1/posts/get?url=' + url
#               headers:
#                 Authorization: 'Basic ' + LOCAL_STORAGE['auth-token']

#               transformResponse: Delicious.parseLinks

#             $http(options).then (resp) ->
#               defer.resolve resp.data

#             defer.promise

#         Delicious.getHashes = do ->
#           getHashes = ->
#             defer = $q.defer()

#             options =
#               method: 'GET'
#               url: 'https://api.del.icio.us/v1/posts/all?hashes'
#               headers:
#                 Authorization: 'Basic ' + LOCAL_STORAGE['auth-token']

#               # transformResponse: Delicious.parseLinks

#             $http(options).then (resp) ->
#               defer.resolve resp.data

#             defer.promise

#         # Delicious.getHashes()

#         Delicious.getUpdate = do ->
#           _parseUpdateResponse = (data) ->
#             rawUpdate = xml.xmlToJSON(data).update
#             update = {}

#             # Remove '@' symbols from keys
#             for key of rawUpdate
#               k = key.split('@')[1]
#               update[k] = rawUpdate[key]

#             # Convert time string to time integer
#             update.time = new Date(update.time).getTime()
#             update
#           return getUpdate = ->
#             defer = $q.defer()

#             options =
#               method: 'GET'
#               url: 'https://api.del.icio.us/v1/posts/update'
#               headers:
#                 Authorization: 'Basic ' + LOCAL_STORAGE['auth-token']

#               transformResponse: _parseUpdateResponse

#             if $rootScope.loggedIn
#               $http(options).then (resp) ->
#                 defer.resolve resp.data

#             defer.promise

#         Delicious.getPopularSuggestedTags = do ->
#           _parseSuggestionsResponse = (data) ->
#             json = xml.xmlToJSON(data)
#             if json.suggest
#               json.suggest.popular.map (rawSuggestionTag) ->
#                 suggestedTag = {}

#                 # Remove '@' symbols from keys
#                 for key of rawSuggestionTag
#                   k = key.split('@')[1]
#                   suggestedTag[k] = rawSuggestionTag[key]
#                 suggestedTag.tag

#           return getPopularSuggestedTags = (url) ->
#             defer = $q.defer()

#             options =
#               method: 'GET'
#               url: 'https://api.del.icio.us/v1/posts/suggest?url=' + url
#               headers:
#                 Authorization: 'Basic ' + LOCAL_STORAGE['auth-token']

#               transformResponse: _parseSuggestionsResponse

#             $http(options).then (resp) ->
#               defer.resolve resp.data

#             defer.promise

#         Delicious.getAllMyTags = do ->
#           _parseTags = (data) ->
#             _parseTag = (rawTag) ->
#               tag = {}

#               # Remove '@' symbols from keys
#               for key of rawTag
#                 k = key.split('@')[1]
#                 tag[k] = rawTag[key]
#               tag.tag
#             json = xml.xmlToJSON(data)

#             unless json.tags
#               []
#             else if angular.isArray(json.tags.tag)
#               json.tags.tag.map _parseTag
#             else
#               [_parseTag(json.tags.tag)]
#           return getAllMyTags = ->
#             defer = $q.defer()

#             options =
#               method: 'GET'
#               url: 'https://api.del.icio.us/v1/tags/get'
#               headers:
#                 Authorization: 'Basic ' + LOCAL_STORAGE['auth-token']

#               transformResponse: _parseTags

#             $http(options).then (resp) ->
#               defer.resolve resp.data

#             defer.promise

#         Delicious.logout = ->
#           syncStorage.clear()

#         Delicious.setting = do ->

#           getSetting = (key) ->
#             setting = SYNC_STORAGE[prefix + key]
#             defaultSetting = defaults[key]
#             (if setting then setting else defaultSetting)

#           setSetting = (key, value) ->
#             obj = {}
#             obj[prefix + key] = value
#             syncStorage.set(obj)

#           prefix = 'setting-'
#           defaults =
#             share: false
#             order: 'time'
#             reverse: true

#           setting = (key, value) ->
#             (if angular.isUndefined(value) then getSetting(key) else setSetting(key, value))


#         # Check for updates
#         Delicious.getUpdate().then (update) ->

#           lastUpdate = undefined
#           if LOCAL_STORAGE['last-update'] isnt 'NaN'
#             lastUpdate = LOCAL_STORAGE['last-update']
#           else
#             lastUpdate = 0

#           if update.time isnt lastUpdate

#             # Clear storage before fetching new links, this will keep it up to date if the fetch fails for any reason
#             syncStorage.removeLocal(['last-update', 'links'])

#             Delicious.fetchLinks().then ->
#               syncStorage.setLocal 'last-update': update.time

#         Delicious

#       services.factory 'analytics', ($window) ->
#         $window._gaq.push ['_setAccount', 'UA-38039307-2']
#         $window._gaq


#       # Controllers
#       controllers = angular.module('yum.controllers', [])
#       controllers.controller 'AppCtrl', ($scope, $rootScope, $location, delicious) ->
#         $scope.menu = [
#           path: '/new'
#           text: 'Add link'
#         ,
#           path: '/bookmarks'
#           text: 'My links'
#         ]
#         $scope.isSelected = (item) ->
#           path = $location.path()
#           path is item.path

#         $scope.logout = (link) ->
#           delicious.logout()
#           $rootScope.loggedIn = false
#           $location.path '/login'

#         $scope.extVersion = ->
#           manifest = chrome.runtime.getManifest()
#           manifest.name + ' ' + manifest.version

#         $scope.username = ->
#           LOCAL_STORAGE['username']

#         # TODO: Redo in angular?
#         $(document).keydown (e) ->
#           if e.keyCode is 27 || e.altKey and e.shiftKey and e.keyCode is 68 || e.altKey and e.shiftKey and e.keyCode is 66
#             # esc || shift-alt-d || shift-alt-b
#             window.parent.postMessage('closeModal', '*')

#       controllers.controller 'LoginCtrl', ($scope, $rootScope, $location, delicious, syncStorage) ->
#         $scope.login = ->
#           $scope.loading = true
#           delicious.authenticate($scope.username, $scope.password).success((data) ->
#             obj = {}
#             obj['username'] = $scope.username
#             syncStorage.setLocal(obj)

#             $rootScope.loggedIn = true
#             $location.path '/new'

#           ).error (data, code) ->

#             json = xml.xmlToJSON(data)
#             verboseResult = (if (json.result) then ' ' + json.result['@code'] else '')
#             syncStorage.removeLocal($scope.username)
#             $rootScope.errorCode = code + verboseResult
#             $rootScope.loginFailed = true
#             $location.path '/new'

#       controllers.controller 'NewLinkCtrl', ($scope, $location, tab, delicious, analytics) ->
#         $scope.description = tab.title
#         $scope.header = 'Add link to Delicious'
#         $scope.myTags = []
#         $scope.myTagsLoaded = false
#         $scope.note = tab.selectionText
#         $scope.share = delicious.setting('share')
#         $scope.submitLabel = 'Add'
#         $scope.suggestedTags = []
#         $scope.tags = []
#         $scope.url = tab.url

#         $scope.add = ->
#           $scope.loading = true
#           delicious.addLink(
#             url: $scope.url
#             description: $scope.description
#             extended: (if ($scope.note) then $scope.note else '')
#             shared: ((if not $scope.share then 'yes' else 'no'))
#             tags: $scope.tags.join(', ')
#             replace: 'yes'
#           ).then ->
#             $location.path '/bookmarks'
#             analytics.push ['_trackEvent', 'link-added', 'action']

#         $scope.addSuggestedTag = (tag) ->
#           tags = angular.copy($scope.tags)
#           tags.push tag
#           $scope.tags = tags

#           # remove from suggestedTags arary
#           index = $scope.suggestedTags.indexOf(tag)
#           $scope.suggestedTags.splice index, 1

#         delicious.getDeliciousLinkDataByUrl($scope.url).then (data) ->
#           link = data[0]
#           if link
#             $scope.description = link['description']
#             $scope.note = link['extended']
#             $scope.header = 'Modify your Delicious link'
#             $scope.menu[0]['text'] = 'Modify link'
#             $scope.share = link['private']
#             $scope.submitLabel = 'Modify'
#             $scope.tags = link['tags']
#           else
#             delicious.getPopularSuggestedTags($scope.url).then (tags) ->
#               $scope.suggestedTags = tags

#         delicious.getAllMyTags().then (myTags) ->
#           $scope.myTags = myTags
#           $scope.myTagsLoaded = true

#           #init (way faster than directive) | Todo: move this out to a function
#           select = angular.element('#tag') # only target the 'New' page
#           select.select2
#             tags: myTags
#             tokenSeparators: [',']
#             placeholder: 'tag'

#           # Needed for saving link
#           select.bind 'change', (e) ->
#             $scope.$apply ->
#               $scope.tags = e.val

#           # Used during suggest click event
#           $scope.$watch 'tags', (newVal) ->
#             select.select2 'val', newVal

#         $scope.$watch 'share', (value) ->

#           # Set presistant private checkmark
#           delicious.setting 'share', value

#       controllers.controller 'BookmarksCtrl', ($scope, $timeout, $filter, delicious, analytics) ->
#         $scope.limit = 0
#         $scope.links = []
#         $scope.linksLength = 0
#         $scope.myTags = []
#         $scope.query = ''
#         $scope.order = delicious.setting('order')
#         $scope.reverse = delicious.setting('reverse')
#         $scope.urlListToOpen = []
#         $scope.hideTags = (if SYNC_STORAGE['hide-my-link-tags'] then true else false)

#         $scope.addUrlToList = (link) ->
#           link.linkAdded = true
#           $scope.urlListToOpen.push link
#           analytics.push ['_trackEvent', 'link-btn-add-link-to-list', 'clicked']

#         $scope.removeUrlToList = (link) ->
#           link.linkAdded = false
#           index = $scope.urlListToOpen.indexOf(link)
#           $scope.urlListToOpen.splice index, 1
#           analytics.push ['_trackEvent', 'link-btn-remove-link-from-list', 'clicked']

#         $scope.clearUrlList = ->

#           # clear links
#           i = 0

#           while i < $scope.urlListToOpen.length
#             $scope.urlListToOpen[i].linkAdded = false
#             i++

#           # reset list
#           $scope.urlListToOpen = []

#         $scope.openUrlList = ->
#           i = 0

#           while i < $scope.urlListToOpen.length
#             if chrome.tabs
#               chrome.tabs.create
#                 url: $scope.urlListToOpen[i].href
#                 active: false

#             else

#               # Send message to background to open!
#               chrome.runtime.sendMessage url: $scope.urlListToOpen[i].href
#             i++
#           analytics.push ['_trackEvent', 'link-btn-open-links', 'open-' + $scope.urlListToOpen.length]

#           # last thing is to clear the list
#           $scope.clearUrlList()

#         $scope.confirmRemove = (link) ->
#           link.confirmRemoval = true

#         $scope.cancelRemove = (link) ->
#           link.confirmRemoval = false

#         $scope.confirmUpdate = (link) ->
#           link.confirmUpdate = true
#           link.clean = angular.copy(link)
#           analytics.push ['_trackEvent', 'link-btn-edit', 'clicked']

#         $scope.cancelUpdate = (link) ->
#           angular.copy link.clean, link
#           link.confirmUpdate = false

#         $scope.update = (link) ->
#           link.confirmUpdate = false
#           link.description = link.tempDescription
#           delicious.addLink(
#             url: link.href
#             description: link.description
#             extended: link.note
#             shared: ((if (link['private']) then 'no' else 'yes'))
#             tags: link.tags.join(', ')
#             replace: 'yes'
#           ).then ->
#             $scope.getAllMyTags()
#             analytics.push ['_trackEvent', 'link-updated', 'action']

#         $scope.remove = (link) ->
#           link.removed = true
#           $timeout (->
#             index = $scope.links.indexOf(link)
#             $scope.links.splice index, 1
#             $scope.setLinksLength()
#             delicious.removeLink(link).then null, ->
#               $scope.links.splice index, 0, link
#               $scope.setLinksLength()
#               analytics.push ['_trackEvent', 'link-removed', 'action']

#           ), 500

#         $scope.isPrivate = (link) ->
#           link['private']

#         $scope.appendQuery = (word) ->
#           query = (if $scope.query then ($scope.query + ' ' + word) else word)
#           $scope.query = query.trim()

#         $scope.getAllMyTags = ->
#           delicious.getAllMyTags().then (myTags) ->
#             $scope.myTags = myTags

#         $scope.setLinksLength = ->
#           $scope.linksLength = $filter('filterByWord')($scope.links, $scope.query).length

#         $scope.loadMore = ->
#           count = (if $scope.hideTags then 12 else 8)
#           if $scope.limit < $scope.links.length
#             $scope.limit += count
#             analytics.push ['_trackEvent', 'link-pages-loaded', ($scope.limit / count).toString()]

#         delicious.getLinks().then (links) ->
#           $scope.links = links.map((link) ->
#             angular.extend link,
#               confirmUpdate: false
#               confirmRemoval: false
#               tempDescription: link.description
#               note: link.extended
#           )
#           $scope.loadMore()

#         $scope.getAllMyTags()
#         $scope.$watch 'query', $scope.setLinksLength()
#         $scope.$watch 'links', $scope.setLinksLength()
#         $scope.$watch 'order', (value) ->
#           delicious.setting 'order', value

#         $scope.$watch 'reverse', (value) ->
#           delicious.setting 'reverse', value


#       # Directives
#       directives = angular.module('yum.directives', [])
#       directives.directive 'appVersion', ['version', (version) ->
#         (scope, elm, attrs) ->
#           elm.text version
#       ]

#       # TODO: Make select-two-show optional
#       directives.directive 'selectTwo', [->
#         link = (scope, element, attrs, a) ->
#           initSelectTwo = ->
#             return  unless scope.show
#             select.select2
#               tags: scope.tags
#               tokenSeparators: [',']

#             select.select2 'val', scope.val
#           select = angular.element(element)
#           scope.$watch 'show', ->
#             initSelectTwo()  if scope.tags.length > 0

#           scope.$watch 'tags', ->
#             initSelectTwo()  if scope.tags.length > 0

#           scope.$watch 'val', (newVal) ->
#             select.select2 'val', newVal

#           select.bind 'change', (e) ->
#             scope.$apply ->
#               scope.val = e.val

#         restrict: 'A'
#         scope:
#           val: '=ngModel'
#           tags: '=selectTwo'
#           show: '=selectTwoShow'

#         link: link
#       ]
#       directives.directive 'customCheckbox', [->
#         link = (scope, element, attrs) ->
#           className = attrs['customCheckbox']
#           $wrapper = undefined
#           element.wrap '<div class="' + className + '" />'
#           $wrapper = element.parent()
#           $wrapper.on 'click', (e) ->
#             scope.$apply ->
#               scope[attrs['ngModel']] = not scope[attrs['ngModel']]


#           scope.$watch attrs['ngModel'], (value) ->
#             $wrapper.toggleClass className + '-checked', value

#         restrict: 'A'
#         link: link
#       ]
#       directives.directive 'whenScrolled', ->
#         (scope, elm, attr) ->
#           raw = elm[0]
#           elm.bind 'scroll', ->
#             scope.$apply attr.whenScrolled  if raw.scrollTop + raw.offsetHeight >= raw.scrollHeight

#       angular.bootstrap(document, ['yum'])

# ) angular
