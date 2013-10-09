$(function () {

  var closeModal = function() {
    $('.chrome-ext-delicious-blur-me').removeClass('chrome-ext-delicious-blur-me');
    $('#chrome-ext-delicious-frame').remove();
  };

  var loadModal = function (view) {

    var html = [
      '<div id="chrome-ext-delicious-frame">',
        '<a accesskey="d"></a>',
        '<iframe seamless id="chrome-ext-delicious-iframe" src="chrome-extension://' + chrome.i18n.getMessage('@@extension_id') + '/popup.html?origin=shortcut&url=' + encodeURIComponent(document.URL) + '&title=' + encodeURIComponent(document.title) + view + '" />',
        '<button class="close_frame" title="close">&times;</button>',
      '</div>'
    ].join('');

    $('body > *').addClass('chrome-ext-delicious-blur-me');
    $('body').append(html);

    //Events
    $('#chrome-ext-delicious-frame button.close_frame').on('click', function () {
      closeModal();
    });

  };


  //Events
  $(document).keydown(function (e) {

    // shift-alt-d
    if (e.altKey && e.shiftKey && e.keyCode === 68) {
      loadModal('#/new');
    }

    // shift-alt-b
    if (e.altKey && e.shiftKey && e.keyCode === 66) {
      loadModal('#/bookmarks');
    }

  });

  $(document).on('click', function() {
    closeModal();
  });

});