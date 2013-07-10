// Analytics
var _gaq = _gaq || [];
  _gaq.push(['_setAccount', 'UA-38039307-2']);

// Had to load it via js or it throws a tantrum
(function() {
  var ga = document.createElement('script');
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();

// Context menu
function injectModal(info, tab) {
  chrome.tabs.insertCSS(null, { file:"/assets/stylesheets/background.css" });
  chrome.tabs.executeScript(null, { file:"/assets/javascripts/context.js" });
}

chrome.contextMenus.create({
  'id': 'chrome-ext-delicious-private-context',
  'title':'Add to Delicious',
  'onclick': injectModal
});


// Omnibox
function htmlSpecialChars(unsafe) {
  return unsafe
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");
}

chrome.omnibox.onInputChanged.addListener(
function(query, suggest) {

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
      obj.description = htmlSpecialChars((filteredList[i].extended !== '') ? filteredList[i].description + ' | ' + filteredList[i].extended : filteredList[i].description);

      suggestedList.push(obj);
    }

    suggest(suggestedList);
  }

});

chrome.omnibox.onInputEntered.addListener(function(input) {

  var urlExpression = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi;
  var regex = new RegExp(urlExpression);

  if (input.match(regex)) {
    _gaq.push(['_trackEvent', 'onInputEntered', 'omnibox']);
    chrome.tabs.update(null, {url: input});
  }

});

chrome.omnibox.setDefaultSuggestion({"description":" "});
