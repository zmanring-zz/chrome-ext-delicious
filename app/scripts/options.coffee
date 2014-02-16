$ ->
  'use strict'

  # Sync with Chrome
  chrome.storage.sync.get (SYNC_STORAGE) ->

    localStoragePrefix = 'chrome-ext-delicious-'

    $('input').each( (i, elem) ->
      $this = $(elem)
      $this.prop('checked', (if SYNC_STORAGE[$this.attr('id')] then true else false))
    )

    $('input').on('change', ->
      $this = $(this)

      obj = {}
      obj[$this.attr('id')] = $this.prop('checked')
      chrome.storage.sync.set(obj, ->
        $this.next('label').addClass('saved')
      )

    )
