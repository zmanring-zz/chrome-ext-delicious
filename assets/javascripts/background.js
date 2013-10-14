// Analytics
var _gaq = _gaq || [];
  _gaq.push(['_setAccount', 'UA-38039307-2']);

// Had to load it via js or google analytics throws a tantrum
(function() {
  var ga = document.createElement('script');
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();


// Function
YUM = {};

YUM.createContextMenu = function() {
  chrome.contextMenus.create({
    'type': 'separator'
  });
  chrome.contextMenus.create({
    'id': 'chrome-ext-delicious-private-context',
    'title':'Add link',
    'onclick': YUM.injectModal
  });
};

YUM.getSuggestion = function(query) {
  var links = JSON.parse(localStorage.getItem('chrome-ext-delicious-links')),
    words = query.toLowerCase().split(' ');

  if (links) {
    var filteredList = links.filter(function(link) {

      var search = [
        link['description'],
        link['extended'],
        link['href'], ((link['shared'] === 'no') ? 'private' : ''),
        link['tags'].join(' '),
        link['time']].join(' ').toLowerCase();

      return words.every(function(word) {
        return (search.indexOf(word) !== -1);
      });

    });

    var suggestedList = [];
    for (var i=0; i<filteredList.length && i<5; i++) {
      var obj = {};

      obj.content = filteredList[i].href;
      obj.description = YUM.htmlSpecialChars((filteredList[i].extended !== '') ? filteredList[i].description + ' | ' + filteredList[i].extended : filteredList[i].description);

      suggestedList.push(obj);
    }

    return suggestedList;
  }
};

YUM.htmlSpecialChars = function(unsafe) {
  return unsafe
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");
};

YUM.injectModal = function(info, tab) {
  chrome.tabs.insertCSS(null, { file:"/assets/stylesheets/tab.css" });
  chrome.tabs.executeScript(null, { file:"/assets/javascripts/context.js" });
  _gaq.push(['_trackEvent', 'modalOpened', 'contextMenu']);
};

YUM.isCurrentTabSaved = function() {
  var searchString = localStorage.getItem('chrome-ext-delicious-links');
  if (searchString) {
    chrome.tabs.getSelected(null,function(tab) {

      if (searchString.indexOf('"' + tab.url + '"') >= 0 ) {
        chrome.browserAction.setBadgeText({text:'√'});
        chrome.browserAction.setBadgeBackgroundColor({color: '#468ED9'});
        chrome.contextMenus.update('chrome-ext-delicious-private-context', {
          'title':'Modify link'
        });
      } else {
        chrome.browserAction.setBadgeText({text:''});
        chrome.contextMenus.update('chrome-ext-delicious-private-context', {
          'title':'Add link'
        });
      }
    });
  }
};

YUM.openNewTab = function(url) {
  chrome.tabs.create({
    url: url,
    active: false
  });
};

YUM.openSelectedSuggestion = function(selection) {
  var urlExpression = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi;
  var regex = new RegExp(urlExpression);

  if (selection.match(regex)) {
    _gaq.push(['_trackEvent', 'onInputEntered', 'omnibox']);
    chrome.tabs.update(null, {url: selection});
  }
};

YUM.openUpdatePage = function() {
  chrome.tabs.create({
    url: '/updated.html',
    active: true
  });
};


// Events
YUM.createContextMenu();

chrome.omnibox.onInputChanged.addListener(function(query, suggest) { suggest(YUM.getSuggestion(query)); });
chrome.omnibox.onInputEntered.addListener(function(input) { YUM.openSelectedSuggestion(input); });
chrome.omnibox.setDefaultSuggestion({"description":" "});
chrome.runtime.onInstalled.addListener(function () { YUM.openUpdatePage(); });
chrome.runtime.onMessage.addListener(function(message) { if (message.url) { YUM.openNewTab(message.url); } });
chrome.tabs.onActivated.addListener(function() { YUM.isCurrentTabSaved(); });
chrome.tabs.onUpdated.addListener(function() { YUM.isCurrentTabSaved(); });
