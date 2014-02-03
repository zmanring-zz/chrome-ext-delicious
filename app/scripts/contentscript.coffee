'use strict';

$ ->
  closeModal = ->
    $("#chrome-ext-delicious-frame").remove()

  loadModal = (view) ->
    html = [
      '<div id="chrome-ext-delicious-frame">',
        '<a accesskey="d"></a>',
        '<iframe seamless id="chrome-ext-delicious-iframe" src="chrome-extension://' + chrome.i18n.getMessage("@@extension_id") + '/popup.html?origin=shortcut&url=' + encodeURIComponent(document.URL) + '&title=' + encodeURIComponent(document.title) + view + '" />',
        '<button class="close_frame" title="close">&times;</button>',
      '</div>'
    ].join("\n")
    $("body").append html


  #Events
  $(document).keydown (e) ->
    if e.altKey and e.shiftKey and e.keyCode is 68

      # shift-alt-d
      loadModal "#/new"

    # shift-alt-b
    else loadModal "#/bookmarks"  if e.altKey and e.shiftKey and e.keyCode is 66

  $(document).on "click", "#chrome-ext-delicious-frame button.close_frame", ->
    closeModal()

  $(document).on "click", (e) ->

    # On windows the shortcut keys cause a "click" event, using the screen attributes tell the difference
    closeModal()  if e.screenX isnt 0 and e.screenY isnt 0

  # Messages from the child
  window.addEventListener "message", (e) ->
    if e.data is 'closeModal'
      closeModal()

