
function injectModal(info, tab) {
  chrome.tabs.insertCSS(null, { file:"background.css" });
  chrome.tabs.executeScript(null, { file:"vendor/jquery-1.9.0.min.js" });
  chrome.tabs.executeScript(null, { file:"modal.js" });
}

chrome.contextMenus.create({
  'id': 'chrome-ext-delicious-private-context',
  'title':'Add to Delicious',
  'onclick': injectModal
});

//Omnibox
// chrome.omnibox.onInputChanged.addListener(
//   function(text, suggest) {
//     console.log('inputChanged: ' + text);
//     // alert(suggest);
//     // getListOfLinks();
//     suggest([
//       {content: text + " one", description: "the first one"},
//       {content: text + " number two", description: "the second entry"}
//     ]);
//   }
// );

// // This event is fired with the user accepts the input in the omnibox.
// chrome.omnibox.onInputEntered.addListener(
//   function(text) {
//     console.log('inputEntered: ' + text);
//     alert('You just typed "' + text + '"');
//   }
// );
