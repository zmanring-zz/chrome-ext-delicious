$('.chrome-ext-delicious-blur-me').removeClass('chrome-ext-delicious-blur-me');
$('#chrome-ext-delicious-frame').remove();

var html = [
  '<div id="chrome-ext-delicious-frame">',
    '<a accesskey="d"></a>',
    '<iframe seamless id="chrome-ext-delicious-iframe" src="chrome-extension://' + chrome.i18n.getMessage('@@extension_id') + '/popup.html?origin=context&url=' + encodeURIComponent(document.URL) + '&title=' + encodeURIComponent(document.title) + '#/new" />',
    '<button class="close_frame" title="close">&times;</button>',
  '</div>'
].join('');

$('body > *').addClass('chrome-ext-delicious-blur-me');
$('body').append(html);
