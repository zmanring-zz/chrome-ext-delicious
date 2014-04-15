'use strict'

# Controllers
controllers = angular.module('yum.controllers', [])

controllers.controller 'AppCtrl', ($scope, $rootScope, $location, delicious, syncStorage) ->
  $scope.menu = [
    path: '/new'
    text: 'Add link'
  ,
    path: '/bookmarks'
    text: 'My links'
  ]

  $scope.isSelected = (item) ->
    path = $location.path()
    path is item.path

  $scope.logout = (link) ->
    delicious.logout()
    $rootScope.loggedIn = false
    $location.path '/login'

  $scope.extVersion = ->
    manifest = chrome.runtime.getManifest()
    manifest.name + ' ' + manifest.version

  # TODO: Redo in angular?
  $(document).keydown (e) ->
    if e.keyCode is 27 || e.altKey and e.shiftKey and e.keyCode is 68 || e.altKey and e.shiftKey and e.keyCode is 66
      # esc || shift-alt-d || shift-alt-b
      window.parent.postMessage('closeModal', '*')

controllers.controller 'LoginCtrl', ($scope, $rootScope, $location, delicious, syncStorage) ->
  $scope.login = ->
    $scope.loading = true
    delicious.authenticate($scope.username, $scope.password).success((data) ->
      obj = {}
      obj['username'] = $scope.username
      syncStorage.setLocal(obj)

      $rootScope.loggedIn = true
      $location.path '/new'

    ).error (data, code) ->

      json = xml.xmlToJSON(data)
      verboseResult = (if (json.result) then ' ' + json.result['@code'] else '')
      syncStorage.getLocal('username').then (username) ->
        syncStorage.removeLocal(username) if username
      $rootScope.errorCode = code + verboseResult
      $rootScope.loginFailed = true
      $location.path '/new'

controllers.controller 'NewLinkCtrl', ($scope, $location, tab, delicious, analytics, syncStorage) ->
  $scope.description = tab.title
  $scope.header = 'Add link to Delicious'
  $scope.myTags = []
  $scope.myTagsLoaded = false
  $scope.note = tab.selectionText
  $scope.share = syncStorage.getSync('setting-share').then (settingShare) -> settingShare
  $scope.submitLabel = 'Add'
  $scope.suggestedTags = []
  $scope.tags = []
  $scope.url = tab.url

  $scope.add = ->
    $scope.loading = true
    delicious.addLink(
      url: $scope.url
      description: $scope.description
      extended: (if ($scope.note) then $scope.note else '')
      shared: ((if not $scope.share then 'yes' else 'no'))
      tags: $scope.tags.join(', ')
      replace: 'yes'
    ).then ->
      $location.path '/bookmarks'
      analytics.push ['_trackEvent', 'link-added', 'action']

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
      $scope.description = link['description']
      $scope.note = link['extended']
      $scope.header = 'Modify your Delicious link'
      $scope.menu[0]['text'] = 'Modify link'
      $scope.share = link['private']
      $scope.submitLabel = 'Modify'
      $scope.tags = link['tags']
    else
      delicious.getPopularSuggestedTags($scope.url).then (tags) ->
        $scope.suggestedTags = tags

  delicious.getAllMyTags().then (myTags) ->
    $scope.myTags = myTags
    $scope.myTagsLoaded = true

    #init (way faster than directive) | TODO: move this out to a function
    select = angular.element('#tag') # only target the 'New' page
    select.select2
      tags: myTags
      tokenSeparators: [',']
      placeholder: 'tag'

    # Needed for saving link
    select.bind 'change', (e) ->
      $scope.$apply ->
        $scope.tags = e.val

    # Used during suggest click event
    $scope.$watch 'tags', (newVal) ->
      select.select2 'val', newVal

  $scope.$watch 'share', (value) ->
    syncStorage.setSync({'setting-share': value})

controllers.controller 'BookmarksCtrl', ($scope, $timeout, $filter, delicious, analytics, syncStorage) ->
  $scope.limit = 0
  $scope.links = []
  $scope.linksLength = 0
  $scope.myTags = []
  $scope.query = ''
  $scope.urlListToOpen = []

  syncStorage.getSync('setting-order').then (settingOrder) -> $scope.order = settingOrder
  syncStorage.getSync('setting-reverse').then (settingReverse) -> $scope.reverse = settingReverse
  syncStorage.getSync('hide-my-link-tags').then (hideMyLinkTags) -> $scope.hideTags = hideMyLinkTags

  $scope.addUrlToList = (link) ->
    link.linkAdded = true
    $scope.urlListToOpen.push link
    analytics.push ['_trackEvent', 'link-btn-add-link-to-list', 'clicked']

  $scope.removeUrlToList = (link) ->
    link.linkAdded = false
    index = $scope.urlListToOpen.indexOf(link)
    $scope.urlListToOpen.splice index, 1
    analytics.push ['_trackEvent', 'link-btn-remove-link-from-list', 'clicked']

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
    analytics.push ['_trackEvent', 'link-btn-open-links', 'open-' + $scope.urlListToOpen.length]

    # last thing is to clear the list
    $scope.clearUrlList()

  $scope.confirmRemove = (link) ->
    link.confirmRemoval = true

  $scope.cancelRemove = (link) ->
    link.confirmRemoval = false

  $scope.confirmUpdate = (link) ->
    link.confirmUpdate = true
    link.clean = angular.copy(link)
    analytics.push ['_trackEvent', 'link-btn-edit', 'clicked']

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
      shared: ((if (link['private']) then 'no' else 'yes'))
      tags: link.tags.join(', ')
      replace: 'yes'
    ).then ->
      $scope.getAllMyTags()
      analytics.push ['_trackEvent', 'link-updated', 'action']

  $scope.remove = (link) ->
    link.removed = true
    $timeout (->
      index = $scope.links.indexOf(link)
      $scope.links.splice index, 1
      $scope.setLinksLength()
      delicious.removeLink(link).then null, ->
        $scope.links.splice index, 0, link
        $scope.setLinksLength()
        analytics.push ['_trackEvent', 'link-removed', 'action']

    ), 500

  $scope.isPrivate = (link) ->
    link['private']

  $scope.appendQuery = (word) ->
    query = (if $scope.query then ($scope.query + ' ' + word) else word)
    $scope.query = query.trim()

  $scope.getAllMyTags = ->
    delicious.getAllMyTags().then (myTags) ->
      $scope.myTags = myTags

  $scope.setLinksLength = ->
    $scope.linksLength = $filter('filterByWord')($scope.links, $scope.query).length

  $scope.loadMore = ->
    count = (if $scope.hideTags then 12 else 8)

    if $scope.limit < $scope.links.length
      $scope.limit += count
      analytics.push ['_trackEvent', 'link-pages-loaded', ($scope.limit / count).toString()]

  delicious.getLinks().then (links) ->
    $scope.links = links.map (link) ->
      angular.extend link,
        confirmUpdate: false
        confirmRemoval: false
        tempDescription: link.description
        note: link.extended

    $scope.loadMore()
    return

  $scope.getAllMyTags()
  $scope.$watch 'query', $scope.setLinksLength()
  $scope.$watch 'links', $scope.setLinksLength()
  $scope.$watch 'order', (value) ->
    syncStorage.setSync({'setting-order': value})

  $scope.$watch 'reverse', (value) ->
    syncStorage.setSync({'setting-reverse': value})
