$('#chrome-ext-delicious-frame').remove();

var html = '';

html += '<div id="chrome-ext-delicious-frame">';
html += '<iframe id="chrome-ext-delicious-iframe" src="chrome-extension://pppfobacghabbdebfkkabiecefefopmi/popup.html?url=' + location.href + '&title=' + document.title + '" />';
html += '<button class="close_frame" title="close">x</button>';
html += '</div>';

$('body').append(html);

//Events
$('#chrome-ext-delicious-frame button.close_frame').on('click', function() {
  $('#chrome-ext-delicious-frame').remove();
});
