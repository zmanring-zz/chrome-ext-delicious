$('#chrome-ext-delicious-frame').remove();

var html = [
   '<div id="chrome-ext-delicious-frame">',
      '<a accesskey="d"></a>',
      '<iframe seamless id="chrome-ext-delicious-iframe" src="chrome-extension://' + chrome.i18n.getMessage('@@extension_id') + '/popup.html?url=' + encodeURIComponent(document.URL) + '&title=' + encodeURIComponent(document.title) + '" />',
      '<button class="close_frame" title="close">&times;</button>',
   '</div>'
].join('');

$('body').append(html);

//Events
$('#chrome-ext-delicious-frame button.close_frame').on('click', function () {
  $('#chrome-ext-delicious-frame').remove();
});
