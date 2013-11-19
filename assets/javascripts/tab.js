$(function () {

  var closeModal = function() {
    $('#chrome-ext-delicious-frame').remove();
  };

  var loadModal = function (view) {

    var html = [
      '<div id="chrome-ext-delicious-frame">',
        '<a accesskey="d"></a>',
        '<iframe seamless id="chrome-ext-delicious-iframe" src="chrome-extension://' + chrome.i18n.getMessage('@@extension_id') + '/popup.html?origin=shortcut&url=' + encodeURIComponent(document.URL) + '&title=' + encodeURIComponent(document.title) + view + '" />',
        '<button class="close_frame" title="close">&times;</button>',
      '</div>'
    ].join('\n');

    $('body').append(html);

  };


  //Events
  $(document).keydown(function (e) {

    if (e.altKey && e.shiftKey && e.keyCode === 68) {
      // shift-alt-d
      loadModal('#/new');
    } else if (e.altKey && e.shiftKey && e.keyCode === 66) {
      // shift-alt-b
      loadModal('#/bookmarks');
    }

  });

  $(document).on('click', '#chrome-ext-delicious-frame button.close_frame', function () {
    closeModal();
  });

  $(document).on('click', function(e) {
    // On windows the shortcut keys cause a "click" event, using the screen attributes tell the difference
    if (e.screenX !== 0 && e.screenY !== 0) {
      closeModal();
    }
  });

});