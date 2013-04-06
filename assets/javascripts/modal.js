$('#chrome-ext-delicious-frame').remove();

var html = [
  '<a accesskey="d">',
   '<div id="chrome-ext-delicious-frame">',
      '<iframe seamless id="chrome-ext-delicious-iframe" src="chrome-extension://' + chrome.i18n.getMessage('@@extension_id') + '/popup.html?url=' + document.URL + '&title=' + document.title + '" />',
      '<button class="close_frame" title="close">&times;</button>',
   '</div>'
].join('');

$('body').append(html);

//Events
$('#chrome-ext-delicious-frame button.close_frame').on('click', function () {
  $('#chrome-ext-delicious-frame').remove();
});
