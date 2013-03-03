$('#chrome-ext-delicious-frame').remove();

var html = [
   '<div id="chrome-ext-delicious-frame">',
      '<iframe id="chrome-ext-delicious-iframe" src="chrome-extension://pplcoloalmjgljnbpkhcojpjnjbggppe/popup.html?url=' + location.href + '&title=' + document.title + '" />',
      '<button class="close_frame" title="close">&times;</button>',
   '</div>'
].join('');

$('body').append(html);

//Events
$('#chrome-ext-delicious-frame button.close_frame').on('click', function () {
  $('#chrome-ext-delicious-frame').remove();
});
