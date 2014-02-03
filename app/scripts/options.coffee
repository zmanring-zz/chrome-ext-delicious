$ ->
  'use strict';

  localStoragePrefix = 'chrome-ext-delicious-'

  $('input').each( (i, elem) ->
    $this = $(elem)
    $this.prop('checked', (if (localStorage.getItem(localStoragePrefix + $this.attr('id'))) is 'true' then true else false))
  )

  $('input').on('change', ->
    $this = $(this)
    localStorage.setItem(localStoragePrefix + $this.attr('id'), $this.prop('checked'))
    $this.next('label').addClass('saved')
  )
