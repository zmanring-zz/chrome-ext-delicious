'use strict'

# async.series [
#   (callback) ->
#     callback null, "one"

#   (callback) ->
#     callback null, "two"

# ], (err, results) ->
#   console.log results

# window.syncStorage = {

#   getLocal: (item) ->

#     async.series {

#       data: (callback) ->
#         chrome.storage.local.get (items) ->
#           if item
#             callback(null, items[item])
#           else
#             callback(null, items)

#     }, (err, results) ->

#       console.log results
#       results.data

# }

# syncStorage.getLocal('username')




  # defer = $q.defer()

  # if $rootScope.LOCAL_STORAGE
  #   if item
  #     defer.resolve $rootScope.LOCAL_STORAGE[item]
  #   else
  #     defer.resolve $rootScope.LOCAL_STORAGE

  # else

  #   chrome.storage.local.get (items) ->
  #     $rootScope.LOCAL_STORAGE = items

  #     if item
  #       defer.resolve items[item]
  #     else
  #       defer.resolve items

  # defer.promise

# syncStorage.getSync = (item) ->
#   defer = $q.defer()

#   if $rootScope.SYNC_STORAGE
#     if item
#       defer.resolve $rootScope.SYNC_STORAGE[item]
#     else
#       defer.resolve $rootScope.SYNC_STORAGE

#   else

#     chrome.storage.sync.get (items) ->
#       $rootScope.SYNC_STORAGE = items

#       if item
#         defer.resolve items[item]
#       else
#         defer.resolve items

#   defer.promise

# syncStorage.clearLocal = ->
#   chrome.storage.local.clear()
#   syncStorage.updateLocal()

# syncStorage.clearSync = ->
#   chrome.storage.sync.clear()
#   syncStorage.updateSync()

# syncStorage.removeSync = (key) ->
#   chrome.storage.sync.remove(key)
#   syncStorage.updateSync()

# syncStorage.removeLocal = (key) ->
#   chrome.storage.local.remove(key)
#   syncStorage.updateLocal()

# syncStorage.setSync = (obj) ->
#   chrome.storage.sync.set(obj)
#   syncStorage.updateSync()

# syncStorage.setLocal = (obj) ->
#   chrome.storage.local.set(obj)
#   syncStorage.updateLocal()

# syncStorage.updateSync = ->
#   chrome.storage.sync.get (items) ->
#     $rootScope.SYNC_STORAGE = items

# syncStorage.updateLocal = ->
#   chrome.storage.local.get (items) ->
#     $rootScope.LOCAL_STORAGE = items
