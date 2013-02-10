
function openPopup(info, tab) {

  chrome.tabs.insertCSS(null,
    {
      file:"background.css"
    }
  );

  chrome.tabs.executeScript(null,
    {
      file:"vendor/jquery-1.9.0.min.js"
    }
  );

  chrome.tabs.executeScript(null,
    {
      file:"local_popup.js"
    }
  );

}

chrome.contextMenus.create({
  'id': 'chrome-ext-delicious-private-context',
  'title':'Add to Delicious',
  'onclick': openPopup
});
