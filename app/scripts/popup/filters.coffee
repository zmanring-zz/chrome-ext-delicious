'use strict'

# Filters
filters = angular.module('yum.filters', [])
filters.filter 'list', [->
  (arr) ->
    arr.join ', '
]
filters.filter 'filterByWord', ($rootScope) ->

  (links, query) ->

    # Only filter if there's a query string
    if angular.isString(query)

      # Get array of words from query
      words = query.toLowerCase().split(' ')

      # Filter the links and return them
      links.filter (link) ->

        # Combine link properties to search into string
        search = [
          # link['description'] if SYNC_STORAGE['filter-description']
          # link['extended'] if SYNC_STORAGE['filter-extended']
          # link['url'] if SYNC_STORAGE['filter-url']
          # link['tags'] if SYNC_STORAGE['filter-tags']
          # link['time'] if SYNC_STORAGE['filter-time']
          ((if (link['shared'] is 'no') then 'private' else ''))
        ].join(' ').toLowerCase()

        # all of the words
        words.every (word) ->
          search.indexOf(word) isnt -1

    else
      # Else just pass all the links through
      links
