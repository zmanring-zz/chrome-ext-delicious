
function injectModal(info, tab) {
  chrome.tabs.insertCSS(null, { file:"/assets/stylesheets/background.css" });
  chrome.tabs.executeScript(null, { file:"/assets/javascripts/modal.js" });
}

chrome.contextMenus.create({
  'id': 'chrome-ext-delicious-private-context',
  'title':'Add to Delicious',
  'onclick': injectModal
});
