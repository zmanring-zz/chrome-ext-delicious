chrome.runtime.onMessage.addListener (request) ->

  if request.data
    data = request.data

    $('#chrome-ext-delicious-frame').remove()

    html = [
      "<div id=\"chrome-ext-delicious-frame\">",
        "<a accesskey=\"d\"></a>",
        "<iframe seamless id=\"chrome-ext-delicious-iframe\" src=\"chrome-extension://" + chrome.i18n.getMessage("@@extension_id") + "/popup.html?origin=context&url=" + encodeURIComponent(document.URL) + "&title=" + encodeURIComponent(document.title) + ((if (data.selectionText) then "&selected=" + encodeURIComponent(data.selectionText.match(/.{1,1000}/g)[0]) else "")) + "#/new\" />",
        "<button class=\"close_frame\" title=\"close\">&times;</button>",
      "</div>"
    ].join("\n")

    $('body').append(html)
