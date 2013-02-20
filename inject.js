$(function () {

   var loadModal = function () {

      $('#chrome-ext-delicious-frame').remove();

      var html = '';

      html += '<div id="chrome-ext-delicious-frame">';
      html += '<iframe id="chrome-ext-delicious-iframe" src="chrome-extension://pplcoloalmjgljnbpkhcojpjnjbggppe/popup.html?url=' + location.href + '&title=' + document.title + '" />';
      html += '<button class="close_frame" title="close">&times;</button>';
      html += '</div>';

      $('body').append(html);

      //Events
      $('#chrome-ext-delicious-frame button.close_frame').on('click', function () {
        $('#chrome-ext-delicious-frame').remove();
      });

   };

   //Events
   $(document).keydown(function (e) {
      if (e.altKey && e.shiftKey && e.keyCode === 68) {
         loadModal();
      }

   });

});



// window.addEventListener("keyup", keyListener(e), false);

// var keyListener = function(e) {
//    console.log(e);
//    if (e.ctrlKey && e.keyCode) {
//      if (e.keyCode == 220 || e.keyCode == 191 || (e.altKey && e.keyCode == 80)) {
//        chrome.extension.sendRequest({name: "openPopUp"});
//      }
//    }
// };

// window.addEventListener("keydown", function(event){

//   console.log(event);
//    // Bind to both control (for Win/Linux) and command (for Mac)
//    // var modifier = event.ctrlKey || event.metaKey;
//    // if (modifier &amp;&amp; event.altKey &amp;&amp; event.keyCode == 80)
//    // {
//    // // Send message to background page to toggle tab
//    // chrome.extension.sendRequest({pinit_keyboard_shortcut: true}, function(response)
//    // {
//    // });
//    // }

// }, false);

// jwerty.key('ctrl+shift+P', function () {

//   $('#chrome-ext-delicious-frame').remove();

//   var html = '';

//   html += '<div id="chrome-ext-delicious-frame">';
//   html += '<iframe id="chrome-ext-delicious-iframe" src="chrome-extension://pplcoloalmjgljnbpkhcojpjnjbggppe/popup.html?url=' + location.href + '&title=' + document.title + '" />';
//   html += '<button class="close_frame" title="close">&times;</button>';
//   html += '</div>';

//   $('body').append(html);

//   //Events
//   $('#chrome-ext-delicious-frame button.close_frame').on('click', function() {
//     $('#chrome-ext-delicious-frame').remove();
//   });


// });