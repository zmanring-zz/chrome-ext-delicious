# @Delicious

> When using Delicious.com and this extension, multiple tags could return as one tag. This is a [known](https://github.com/avos/delicious-api/issues/8) issue and Delicious is working on it. @Delicious extension has a work around by selecting "My tags have no spaces" option via [Options](/options.html) page. Sorry for the inconvenience. -Zach

### Follow [@DeliciousExt](https://twitter.com/@deliciousext) on Twitter

--- 
    
## Features

* Bookmark your current tab, change descriptions, add tags, mark private or add notes.
* Multi-word filter your saved bookmarks by description, tag(s), date and more.
* Modify/Delete existing bookmarks
* Direct link to your [Delicious](http://www.delicious.com) account in footer. Thanks *@Rocketraman*
* Option to single-space delimited tags when user's tags contain no spaces, via [Options](/options.html). Thanks *@Rocketraman*
* Visual cue &Sqrt; on the icon if page is already saved in your bookmarks. - Thanks *@Jelle*
* Added new shortcut for modal view. Thanks *@Ian*
  * [`shift`]-[`alt`]-[`d`] will open add link view 
  * [`shift`]-[`alt`]-[`b`] will open your bookmarks view.
* Ability to change what you want to filter on, via [Options](/options.html). Thanks *@Jelle*
* Ability to open more than one link at a time! Thanks *@Robert*
  * Click the `+` button after hovering over the link you want to open. 
* Omnibox | Search from within Chrome's address bar, just type `@del`+ space + keyword.
* Context menu access, just 'right click' on the page and select 'Add to Delicious'
  * Selected text will auto-fill extended description field when using context menu. Thanks for the idea *@Tomasz*

## Changelog

Found an issue or want to see a feature implemented? [Send Feedback](https://chrome.google.com/webstore/support/pplcoloalmjgljnbpkhcojpjnjbggppe?hl=en&gl=US#bug)

### Version 3.0.0
* All new version!

### Version 2.9.7
* Removed auto update/changelog page to show on new installs

### Version 2.9.6
* Feature - add link to delicious.com.
* Feature - handle single space delimited tags via user option.

### Version 2.9.5
* Fixed - increased limitation of bookmarks from 1000 to 10000 - Thanks @Matteo
* Bug - Some users were experiencing less than cool pop-up sizes.
* Feature - Added ability for selected text to auto-fill extended description field

### Version 2.9.4
* Bug - Fixed issue where the shortcut [shift]-[alt]-[d] would only sometimes work... silly click events, why register as mouse when you're a keyboard? Thanks *@Ian*
* Bug - Removed the blur due to performance, now ultra-fast, no animation or blur. Thanks *@Ian*
* Feature - Added visual cue on the icon if page is already saved in your bookmarks. (fixed defect for this)
* Feature - Clicking outside the modal will now close the modal.
* Feature - Added new shortcut for modal view. [shift]-[alt]-[d] will open add new bookmark view and [shift]-[alt]-[b] will open your bookmarks view.
* Feature - Added ability to change what you want to filter on. Check it out on the options page located in the footer.
* Bug - Issue where you couldn't open multiple links from inside the modal window. Screw pop-up blockers! :D
* Styling - Changed up some styling for the modal pop-up... enjoy the Atlanta skyline.

### Version 2.9
* Feature - Added ability to select more than one link, hover over the row and click the "plus" button. After you select more than one a menu will pop-up and you can open all links in background.
* Fixed - styling issues that came up in Chrome version 30

### Version 2.8
* Bug - Weird error fixed that showed up in Chrome 29

### Version 2.7
* Fixed issue with extended description passing in an undefined... sorry
* Tweaked styling for Windows users
* Feature - Added ability to select which tab you want the ext to open up to (under options)
* BETA Feature - You can now search for Delicious bookmarks from your address bar.
* Type [@del] + [space] + [keyword]. This is in BETA. I know there is an issue with syncing bookmarks without going into the extension first.

### Version 2.5
* Feature - Added ability to extend your description using Delicious API's Note's section.

### Version 2.4
* Added some tweaks to help out on link updating between machines

### Version 2.5
* It's BACK! Tag's will now auto-fill
* Enhancement: Infinite scrolling, but don't scroll too much :D
* Enhancement: Updated to latest Select2 and jQuery 2.0
* Code cleanup
* More to come.. Thank you all for being patient

### Version 2.1
* Sorry all, due to the user feedback on slowness, I had to remove the cool tag UI (Select2). I am going to revisit this again soon. For now you will have to enter in a comma delimited list. Sorry for the inconvenience.

### Version 2.0
* Rebuilt from the ground up using Angular.js
* Updated UI
* Faster loading times
* Ability to logout
* Added Sorting and better filtering of links


