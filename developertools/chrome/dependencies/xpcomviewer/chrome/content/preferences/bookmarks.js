//@line 37 "/home/ondrejd/mozilla/extensions/xpcomviewer/resources/content/preferences/bookmarks.js"

/**
 * Bookmarks preferences pane object
 */
var gBookmarksPrefpane =
{

	/**
	 * On pane load
	 */
	onLoad : function()
	{	
		// Are bookmarks disabled by platform?
		if(!("@mozilla.org/storage/service;1" in Components.classes)) {
			// Disable "Allow bookmarks"
			var bookmarks_check = document.getElementById("allowBookmarks-checkbox");
			bookmarks_check.checked = false;
			bookmarks_check.disabled = true;
			
			// Show message why are bookmarks disabled
			var message_cont = document.getElementById("bookmarks-error-cont");
			message_cont.collapsed = false;
		}
	} // end onLoad()

}; // End of gBookmarksPrefpane
