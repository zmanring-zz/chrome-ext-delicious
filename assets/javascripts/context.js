
chrome.runtime.onMessage.addListener(
  function(request) {

    if (request.data) {
      var data = request.data;

      $('#chrome-ext-delicious-frame').remove();

      var html = [
        '<div id="chrome-ext-delicious-frame">',
          '<a accesskey="d"></a>',
          '<iframe seamless id="chrome-ext-delicious-iframe" src="chrome-extension://' + chrome.i18n.getMessage('@@extension_id') + '/popup.html?origin=context&url=' + encodeURIComponent(document.URL) + '&title=' + encodeURIComponent(document.title) + ((data.selectionText) ? '&selected=' + encodeURIComponent(data.selectionText) : '') + '#/new" />',
          '<button class="close_frame" title="close">&times;</button>',
        '</div>'
      ].join('\n');

      $('body').append(html);

    }

  });