'use strict';

# Analytics
_gaq = _gaq or []
_gaq.push ["_setAccount", "UA-38039307-2"]

# Had to load it via js or google analytics throws a tantrum
do ->
  ga = document.createElement("script")
  ga.src = "https://ssl.google-analytics.com/ga.js"
  s = document.getElementsByTagName("script")[0]
  s.parentNode.insertBefore ga, s

# Function
YUM = {}
YUM.createContextMenu = ->
  allowContext = (if localStorage.getItem('chrome-ext-delicious-allow-context-menu') is 'true' then true else false)

  if allowContext

    chrome.contextMenus.create
      id: "chrome-ext-delicious-private-context"
      contexts: ["page", "selection"]
      title: "Add link"
      onclick: YUM.injectModal

YUM.getSuggestion = (query) ->
  links = JSON.parse(localStorage.getItem("chrome-ext-delicious-links"))
  words = query.toLowerCase().split(" ")
  if links
    filteredList = links.filter((link) ->
      search = [link["description"], link["extended"], link["href"], ((if (link["shared"] is "no") then "private" else "")), link["tags"].join(" "), link["time"]].join(" ").toLowerCase()
      words.every (word) ->
        search.indexOf(word) isnt -1

    )
    suggestedList = []
    i = 0

    while i < filteredList.length and i < 5
      obj = {}
      obj.content = filteredList[i].href
      obj.description = YUM.htmlSpecialChars((if (filteredList[i].extended isnt "") then filteredList[i].description + " | " + filteredList[i].extended else filteredList[i].description))
      suggestedList.push obj
      i++
    suggestedList

YUM.htmlSpecialChars = (unsafe) ->
  unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace /"/g, "&quot;"

YUM.injectModal = (info, tab) ->

  chrome.tabs.executeScript null,
    file: "/scripts/context.js"

  chrome.tabs.query
    active: true
    currentWindow: true
  , (tabs) ->
    chrome.tabs.sendMessage tabs[0].id,
      data: info


  _gaq.push ["_trackEvent", "modalOpened", "contextMenu"]

YUM.isCurrentTabSaved = ->
  searchString = localStorage.getItem("chrome-ext-delicious-links")
  if searchString
    chrome.tabs.getSelected null, (tab) ->
      if searchString.indexOf("\"" + tab.url + "\"") >= 0
        chrome.browserAction.setBadgeText text: "√"
        chrome.browserAction.setBadgeBackgroundColor color: "#468ED9"
        chrome.contextMenus.update "chrome-ext-delicious-private-context",
          title: "Modify link"

      else
        chrome.browserAction.setBadgeText text: ""
        chrome.contextMenus.update "chrome-ext-delicious-private-context",
          title: "Add link"

YUM.openNewTab = (url) ->
  chrome.tabs.create
    url: url
    active: false

YUM.openSelectedSuggestion = (selection) ->
  urlExpression = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/g
  regex = new RegExp(urlExpression)
  if selection.match(regex)
    _gaq.push ["_trackEvent", "onInputEntered", "omnibox"]
    chrome.tabs.update null,
      url: selection


# Events
YUM.createContextMenu()
chrome.omnibox.onInputChanged.addListener (query, suggest) ->
  suggest YUM.getSuggestion(query)

chrome.omnibox.onInputEntered.addListener (input) ->
  YUM.openSelectedSuggestion input

chrome.omnibox.setDefaultSuggestion description: " "
chrome.runtime.onMessage.addListener (message) ->
  YUM.openNewTab message.url  if message.url

chrome.tabs.onActivated.addListener ->
  YUM.isCurrentTabSaved()

chrome.tabs.onUpdated.addListener ->
  YUM.isCurrentTabSaved()
