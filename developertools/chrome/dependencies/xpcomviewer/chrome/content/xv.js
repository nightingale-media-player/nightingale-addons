/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is XPCOMViewer.
 *
 * The Initial Developer of the Original Code is Ondrej Donek.
 * Portions created by the Initial Developer are Copyright (C) 2005-2008
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Ondrej Donek, <ondrejd@gmail.com> (Original Author)
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

// Namespace
if(typeof(this.extensions) == "undefined") this.extensions = {};
if(typeof(this.extensions.xv) == "undefined") this.extensions.xv = {};


/**
 * Prototype object for XPCOMViewer.
 */
(function() {

  // Helper shortcuts for some of Components object properties.
  var cc = Components.classes;
  var ci = Components.interfaces;
  var cr = Components.results;
  var cu = Components.utils;

  // ========================================================================

  /**
   * Holds default startup view
   * @type String
   */
  const XV_DEFAULT_STARTUP_VIEW     = "classes";

  // Contstants with templates
  const XV_TEMPLATE_CLASS_JS        = "Components.classes[\"?1\"]";
  const XV_TEMPLATE_CLASS_CPP       = "";
  const XV_TEMPLATE_CLASS_PY        = "components.classes[\"?1\"]";

  const XV_TEMPLATE_IFACE_JS        = "Components.interfaces.?1";
  const XV_TEMPLATE_IFACE_CPP       = "";
  const XV_TEMPLATE_IFACE_PY        = "components.interfaces.?1";

  const XV_TEMPLATE_RESULT_JS       = "Components.results.?1";
  const XV_TEMPLATE_RESULT_CPP      = "";
  const XV_TEMPLATE_RESULT_PY       = "components.results.?1";

  const XV_TEMPLATE_IFACE_INIT_JS   = "var iface = Components.classes[\"?1\"]." +
                                      "getInstance(Components.interfaces.?2);\n";
  const XV_TEMPLATE_IFACE_INIT_CPP  = "";
  const XV_TEMPLATE_IFACE_INIT_PY   = "iface = components.classes[\"?1\"].createInstance()\n" +
                                      "iface = iface.queryInterface(components.interfaces.?2)\n";

  const XV_TEMPLATE_IFACE_CONST_JS  = "Components.interfaces.?1.?2";
  const XV_TEMPLATE_IFACE_CONST_CPP = "";
  const XV_TEMPLATE_IFACE_CONST_PY  = "components.interfaces.?1.?2";

  const XV_TEMPLATE_PROP1_JS        = "var foo = iface.?1();\n";
  const XV_TEMPLATE_PROP1_CPP       = "";
  const XV_TEMPLATE_PROP1_PY        = "foo = iface.?1()\n";

  const XV_TEMPLATE_PROP2_JS        = "var foo = iface.?1;\n";
  const XV_TEMPLATE_PROP2_CPP       = "";
  const XV_TEMPLATE_PROP2_PY        = "foo = iface.?1\n";

  /**
   * Returns formated template
   * @param aStr {string}
   * @param aArgs {array}
   * @returns {string}
   */
  const XV_GET_TEMPLATE = function(aStr, aArgs) {
    var r = "";
    for(var i=1; i<aArgs.length + 1; i++)  r = aStr.replace("?" + i, aArgs[i-1]);
    return r;
  };

  // Helper constants for bookmark dialog
  const BOOKMARKS_DLG_URI      = "chrome://xpcomviewer/content/bookmark-dlg.xul";
  const BOOKMARKS_DLG_FEATURES = "chrome,extrachrome,toolbar,dialog,modal,centerscreen";

  // Template for bookmarks XML file
  const BOOKMARKS_XML_FILE     = "<?xml version=\"1.0\"?>\n<bookmarks/>"

  // ========================================================================

  // "Private" properties. (Used in getters for holding some properties).
  var _prefs = null;
  var _strbundle = null;

  /**
   * Holds instance of nsIPrefBranch
   * @type Object
   */
  this.__defineGetter__("mPrefs", function() {
    if(_prefs == null) {
      _prefs = cc["@mozilla.org/preferences-service;1"].getService(ci.nsIPrefService).
               getBranch("extensions.xpcomviewer.");
    }
    return _prefs;
  });

  /**
   * XPCOMViewer's string bundles
   * @type Object
   */
  this.__defineGetter__("mStrBundle", function() {
    if(_strbundle == null) {
      var lSrv = cc["@mozilla.org/intl/nslocaleservice;1"].getService(ci.nsILocaleService);
      var sSrv = cc["@mozilla.org/intl/stringbundle;1"].getService(ci.nsIStringBundleService);

      _strbundle = sSrv.createBundle("chrome://xpcomviewer/locale/xpcomviewer.properties",
                                     lSrv.getApplicationLocale());
    }
    return _strbundle;
  });

  /**
   * Holds "human" names of single tree views (are loaded from string bundles).
   * @type Object
   */
  this.__defineGetter__("mTreeViewsNames", function() {
    return { classes : this.mStrBundle.GetStringFromName("classesTreeViewName"),
             ifaces  : this.mStrBundle.GetStringFromName("ifacesTreeViewName"),
             results : this.mStrBundle.GetStringFromName("resultsTreeViewName") };
  });

  // ========================================================================

  /**
   * Workspace statusbar's controller
   * @type Object
   */
  this.statusbar =
  {
    /**
     * Holds array of messages to display
     * @type Array
     */
    messages : new Array(),

    /**
     * Index of the displayed message (according to this.mMessages)
     * @type Integer
     */
    displayedMsgIndex : -1,

    /**
     * Pointer to statusbar's label element
     * @type Object
     */
    get label() { return document.getElementById("xpcomviewer-statusbar-label"); },

    /**
     * Update statusbar message (add to front)
     *
     * @param aText {string}
     * @param aType {string}
     */
    update : function(aText, aType)  {
      this.messages.push({ mText : aText, mType : aType });
    },

    /**
     * Show next message
     */
    nextMessage : function() {
      if((this.displayedMsgIndex + 1) >= this.messages.length) return;

      this.displayedMsgIndex++;

      var msg_text = this.messages[this.displayedMsgIndex].mText;
      this.label.setAttribute("label", msg_text);

      switch(this.messages[this.displayedMsgIndex].mType) {
        case "debug":
          this.label.style.backgroundColor = "#000";
          this.label.style.color = "#fff";
          break;

        case "warning":
          this.label.style.backgroundColor = "#06a";
          this.label.style.color = "#fff";
          break;

        case "error":
          this.label.style.backgroundColor = "#f30";
          this.label.style.color = "#fff";
          break;

        case "success":
          this.label.style.backgroundColor = "#093";
          this.label.style.color = "#fff";
          break;

        default:
          this.label.style.backgroundColor = "transparent";
          this.label.style.color = "#000";
          break;
      }
    } // end nextMessage()
  };

  // ========================================================================
  // Bookmarks related
  //
  // Bookmarks are stored in profile directory in XML file called
  // "xpcomviewer-bookmarks.xml".
  //
  // Single bookmark is represented by "xvBookmarkPrototype". It holds these
  // main properties:
  //       mTitle    - bookmark's title
  //       mTarget   - bookmark's target (class, interface, result or
  //                   property of initialized component).
  //       mText     - text attached to bookmark
  //       mSince    - datetime when was bookmark created
  //       mEdited   - datetime when was bookmark last edited
  //       mLinks    - links that are attached to bookmark
  //
  // If you need create bookmark prototype outside "extensions.xv" namespace
  // (e.g. from dialog or etc.) you can use "extensions.xv.getBookmarkObject"
  // with same arguments as when using "xvBookmarkPrototype".
  //
  // Other methods related to bookmarks are placed in "extensions.xv.bookmarks"
  // object which allow to get, add, edit or remove bookmarks.
  //
  // Bookmarks are initialized from "extensions.xv.onLoad" method via
  // "extensions.xv.bookmars.load" method. It self cares if XML bookmarks
  // file is created and so on...
  // Otherwise acts "extensions.xv.bookmars" as passive member - all what it
  // does must be started elsewhere.


  /**
   * Returns new object of a single XPCOMViewer's bookmark.
   *
   * @param aTitle {string}
   * @param aTarget {string}
   * @param aText {string}
   * @param aSince {string}
   * @param aEdited {string}
   * @param aLinks {array}
   */
  function xvBookmarkPrototype(aTitle, aTarget, aText, aSince, aEdited, aLinks) {
    this.mTitle  = aTitle;
    this.mTarget = aTarget;
    this.mText   = aText;
    this.mSince  = aSince;
    this.mEdited = aEdited;
    this.mLinks  = aLinks;
  };
  xvBookmarkPrototype.prototype = {
    /**
     * Bookmark's title
     * @type String
     */
    mTitle : "",

    /**
     * Bookmark's title
     * @type String
     */
    mTarget : "",

    /**
     * Text appended to the bookmark
     * @type String
     */
    mText : "",

    /**
     * Date when was bookmark created
     * @type String
     */
    mSince : "",

    /**
     * Date when was bookmark last edited
     * @type String
     */
    mEdited : "",

    /**
     * Links attached to the bookmark
     * @type Array
     */
    mLinks : new Array(),

    /**
     * Getter for current timestamp (e.g. 8/28/2006 1:47:17 PM)
     * @type String
     */
    get currentTimestamp() {
      var d = new Date();
      return d.getUTCMonth() + "/" + d.getUTCDate() + "/" + d.getUTCFullYear() +
             " " + d.toLocaleTimeString();
    },

    /**
     * Returns the bookmark as the XML element needed for saving bookmarks.
     *
     * @param aDocument Document
     * @returns {object}
     * @throws Components.results.NS_ERROR_INVALID_ARG
     */
    getAsXMLElement : function(aDocument)
    {
      if(!(aDocument instanceof Document)) {
        Components.utils.reportError("SinbleBookmarkObjectPrototype::getAsXMLElement() " +
                                     "- No document passed!");
        throw Components.results.NS_ERROR_INVALID_ARG;
      }

      var bookmark_elm = aDocument.createElement("bookmark");
      bookmark_elm.setAttribute("title",  this.mTitle);
      bookmark_elm.setAttribute("target", this.mTarget);
      bookmark_elm.setAttribute("since",  (this.mSince == "") ? this.currentTimestamp : this.mSince);
      bookmark_elm.setAttribute("edited", (this.mEdited == "") ? this.currentTimestamp : this.mEdited);

      var cdata = document.createCDATASection(this.mText);
      bookmark_elm.appendChild(cdata);

      if(this.mLinks.length > 0) {
        var links_elm = aDocument.createElement("links");

        for(var i=0; i<this.mLinks.length; i++) {
          var link_elm = aDocument.createElement("link");

          link_elm.setAttribute("value", this.mLinks[i]);
          links_elm.appendChild(link_elm);
        }

        bookmark_elm.appendChild(links_elm);
      }

      return bookmark_elm;
    }, // end getAsXMLElement(aDocument)

    /**
     * Perform search on the bookmark (searches title, target and text).
     *
     * @param aWhat {string}
     * @returns {boolean}
     */
    searchBookmark : function(aWhat) {
      if(this.mTitle.indexOf(aWhat) != -1) return true;
      if(this.mTarget.indexOf(aWhat) != -1) return true;
      if(this.mText.indexOf(aWhat) != -1) return true;

      return false;
    }, // end searchBookmark(aWhat)

    /**
     * Add new link to the bookmark
     *
     * @todo Check if URL is valid and if not throws an exception.
     * @param aUrl {string}
     */
    addLink : function(aUrl) {
      this.mLinks.push(aUrl);
    }, // end addLink()

    /**
     * Remove given link
     *
     * @param aUrl {string}
     * @returns {boolean}
     */
    removeLink : function(aUrl) {
      for(var i=0; i<this.mLinks.length; i++) {
        cu.reportError("link: " + this.mLinks[i] + " to: " + aUrl);
        if(this.mLinks[i] == aUrl) {
          this.mLinks = this.mLinks.slice(i, i+1);
          return true;
        }
      }

      return false;
    } // end removeLink(aUrl)

  }; // End of xvBookmarkPrototype

  /**
   * Holds object which serves all related to bookmarks.
   * @type Object
   */
  this.bookmarks =
  {
    /**
     * Returns new object of a single XPCOMViewer's bookmark. (For use outside
     * from xv namespace - for example is used in bookmarks dialog).
     *
     * @param aTitle {string}
     * @param aTarget {string}
     * @param aText {string}
     * @param aSince {string}
     * @param aEdited {string}
     * @param aLinks {array}
     */
    getBookmarkObject : function(aTitle, aTarget, aText, aSince, aEdited, aLinks)
    {
      return new xvBookmarkPrototype(aTitle, aTarget, aText, aSince, aEdited, aLinks);
    }, // end getBookmarkObject(aTitle, aTarget, aText, aSince, aEdited, aLinks)

    /**
     * Getter for bookmarks XML file
     * @type Components.interfaces.nsILocalFile
     */
    get mBookmarksFile() {
      var file = extensions.xv.utils.profDir;
      file.QueryInterface(Components.interfaces.nsILocalFile);
      file.append("xpcomviewer-bookmarks.xml");

      return file;
    },

    /**
     * Holds instance of DOMDocument of bookmarks XML file.
     * @type Object
     */
    mBookmarksDoc : null,

    /**
     * Were bookmarks changed since last save?
     * @type Boolean
     */
    mBookmarksWereChanged : false,

    /**
     * Load bookmarks - initialize service.
     */
    load : function()
    {
      this.mBookmarksDoc = extensions.xv.utils.readXmlFromFile(this.mBookmarksFile,
                                                               "text/xml");

      if(!(this.mBookmarksDoc instanceof Document)) {
        // Bookmarks XML was not loaded (probably file doesn't exist yet).
        // So we need to create the blank new document and save it.
        try {
          var parser = new DOMParser();
          this.mBookmarksDoc = parser.parseFromString(BOOKMARKS_XML_FILE, "text/xml");
          this.save();
        } catch(e) {
          cu.reportError("Error when creating bookmarks XML file (" + e + ")!")
        }
      }
    }, // end load()

    /**
     * Save bookmarks to XML file
     */
    save : function()
    {
      extensions.xv.utils.writeXmlToFile(this.mBookmarksFile,
                                         this.mBookmarksDoc);
    }, // end save()

    /**
     * Returns FALSE if target name hasn't attached bookmark or
     * ID of attached bookmark.
     *
     * @todo Use XPath instead of document.getElementsByTagName()
     *
     * @param aTarget {string}
     * @return {boolean}
     */
    hasItemBookmark : function(aTarget)
    {
      if(!(this.mBookmarksDoc instanceof Document)) return false;

      var bookmarks = this.mBookmarksDoc.getElementsByTagName("bookmark");

      for(var i=0; i<bookmarks.length; i++)
        if(bookmarks[i].hasAttribute("target"))
          if(bookmarks[i].getAttribute("target") == aTarget)
            return true;

      return false;
    }, // end hasItemBookmark(aTarget)

    /**
     * Returns bookmark's element (from bookmarks document) by given target.
     * Returns DOMElement of founded bookmark or FALSE.
     *
     * @param aTarget {string}
     * @returns {DOMElement}
     */
    getBookmarkElementByTarget : function(aTarget)
    {
      if(!(this.mBookmarksDoc instanceof Document)) return false;

      var bookmarks = this.mBookmarksDoc.getElementsByTagName("bookmark");

      for(var i=0; i<bookmarks.length; i++)
        if(bookmarks[i].hasAttribute("target"))
          if(bookmarks[i].getAttribute("target") == aTarget)
            return bookmarks[i];

      return false;
    }, // end getBookmarkElementByTarget(aTarget)

    /**
     * Returns bookmark's object by given target
     *
     * @param aTarget {string}
     * @returns {xvBookmarkPrototype}
     */
    getBookmarkByTarget : function(aTarget)
    {
      if(!(this.mBookmarksDoc instanceof Document)) return false;

      var bookmark_elm = this.getBookmarkElementByTarget(aTarget);
      if(bookmark_elm === null) return false;

      var title  = bookmark_elm.getAttribute("title");
      var target = bookmark_elm.getAttribute("target");
      var text   = bookmark_elm.textContent;
      var since  = bookmark_elm.getAttribute("since");
      var edited = bookmark_elm.getAttribute("edited");
      var links  = new Array();

      var link_elms = bookmark_elm.getElementsByTagName("link");
      for(var i=0; i<link_elms.length; i++)
        if(link_elms[i])
          links.push(link_elms[i].getAttribute("value"));

      return new xvBookmarkPrototype(title, target, text, since,
                                     edited, links);
    }, // end getBookmarkByTarget(aTarget)

    /**
     * Show dialog for adding bookmark for the given tree item
     *
     * @param aTreeItem {object}
     */
    addBookmark : function(aTreeItem)
    {
      if(!(this.mBookmarksDoc instanceof Document)) return;

      if(this.hasItemBookmark(aTreeItem.mName)) {
        var msg = extensions.xv.mStrBundle.GetStringFromName("bookmarkAddWarning");
        extensions.xv.statusbar.update(msg, "warning");
        return;
      }

      var win = window.open(BOOKMARKS_DLG_URI + "?op=add", "", BOOKMARKS_DLG_FEATURES);
      if(win) win.focus();
    }, // end addBookmark(aTreeItem)

    /**
     * Add bookmark (called from bookmark dialog)
     *
     * @param aBookmark {object}
     * @returns {xvBookmarkPrototype}
     */
    add : function(aBookmark)
    {
      var bookmark_elm = aBookmark.getAsXMLElement(this.mBookmarksDoc);
      this.mBookmarksDoc.documentElement.appendChild(bookmark_elm);
      //this.mBookmarksWereChanged = true;
      this.save();
      // XXX this.refreshTree();

      return true;
    }, // end add(aBookmark)

    /**
     * Show dialog for editing bookmark
     *
     * @param aTarget {string}
     */
    editBookmark : function(aTarget) {
      var bookmark = this.getBookmarkByTarget(aTarget);
      if(!bookmark) {
        var msg = extensions.xv.mStrBundle.formatStringFromName("bookmarkEditError",
                                                                [""], 1);
        extensions.xv.statusbar.update(msg, "error");
        return;
      }

      var win = window.open(BOOKMARKS_DLG_URI + "?op=edit", "", BOOKMARKS_DLG_FEATURES);
      if(win) win.focus();
    }, // end editBookmark(aTarget)

    /**
     * Edit bookmark (called from bookmark dialog)
     *
     * @param aBookmark {object}
     * @returns {boolean}
     */
    edit : function(aBookmark)
    {
      var old_bookmark_elm = this.getBookmarkElementByTarget(aBookmark.mTarget);
      if(!old_bookmark_elm)  {
        // XXX Show any error message an XPCOMViewer's statusbar
        alert("Update failed! Element of edited bookmark not founded!")
        return false;
      }

      var new_bookmark_elm = aBookmark.getAsXMLElement(this.mBookmarksDoc);

      try {
        this.mBookmarksDoc.documentElement.replaceChild(new_bookmark_elm,
                                                        old_bookmark_elm);
        //this.mBookmarksWereChanged = true;
        this.save();
      } catch(e) {
        // XXX Show any error message an XPCOMViewer's statusbar
        alert("Update failed! Replacing of bookmark's element failed!")
        return false;
      }

      // When we returning FALSE the bookmark dialog will not close
      return true;
    }, // end edit(aBookmark)

    /**
     * Remove bookmark with given target
     *
     * @param aTarget {string}
     */
    remove : function(aTarget) {
      var bookmark_elm = this.getBookmarkElementByTarget(aTarget);
      if(!bookmark_elm)  {
        var msg = extensions.xv.mStrBundle.formatStringFromName("bookmarkRemoveError",
                                                                [""], 1);
        extensions.xv.statusbar.update(msg, "error");
        return;
      }

      this.mBookmarksDoc.documentElement.removeChild(bookmark_elm);
      //this.mBookmarksWereChanged = true;
      this.save();
      // XXX this.refreshTree();
    } // end remove(aTarget)

  }; // End of bookmarks

	// ========================================================================
  // Treeviews related code
  //
	// Here is a stort review of treeviews related objects and their hierarchy:
	//
	// Treeview item classes
	// =====================
	//                          __________________________
	//                         |                          |
	//                         |   xvTreeItemPrototype    |
	//                         |__________________________|
	//                                      |
	//                                      |
	//                          ____________|_____________
	//                         |                          |
	//                         |  xvTreeItemPrototype [1] |
	//                         |__________________________|
	//
	//  [1] extensions.xv.bookmarks.getTreeItemPrototype(...)
	//
	//
	// Treeview classes
	// ================
	//                          __________________________
	//                         |                          |
	//                         |     TreeViewPrototype    |
	//                         |__________________________|
	//                                      |
	//                                      |
	//                          ____________|_____________
	//                         |                          |
	//                 ________|XpcomTreeViewPrototype [1]|________
	//                |        |__________________________|         |
	//                |                     |                       |
	//                |                     |                       |
	//   _____________|______________       |          _____________|______________
	//  |                            |      |         |                            |
	//  |ClassesTreeviewPrototype [2]|      |         | IfacesTreeviewPrototype [3]|
	//  |____________________________|      |         |____________________________|
	//                         _____________|______________
	//                        |                            |
	//                        |ResultsTreeviewPrototype [4]|
	//                        |____________________________|
	//
  //
	//  [1] extensions.xv.bookmarks.getXpcomTreeviewPrototype(aTreeviewItems)
	//  [2] extensions.xv.bookmarks.getClassesTreeviewPrototype(aTreeviewItems)
	//  [3] extensions.xv.bookmarks.getIfacesTreeviewPrototype(aTreeviewItems)
	//  [4] extensions.xv.bookmarks.getResultsTreeviewPrototype(aTreeviewItems)

	/**
	 * Holds instance of atom service
	 * @type Object
	 */
	const kAtomSrv = cc["@mozilla.org/atom-service;1"].getService(ci.nsIAtomService);


	/**
	 * This function creates new common tree item for using with our
	 * TreeViewPrototype. As columns pass array of objects with column name
	 * and value; e.g { mColId : "", mColText : ""}.
	 *
	 * @param aColumns {array} Array with columns objects
	 * @param aLevel {integer{ Level of item
	 * @param aIsContainer {boolean} Is item container?
	 */
	function TreeViewItemPrototype(aColumns, aLevel, aIsContainer)
	{
		this.mColumns           = new Object();
		this.mIsContainer 			= aIsContainer;
		this.mLevel 						= aLevel;
		this.mIsContainerOpen 	= false;
		this.mIsContainerEmpty 	= true;
		this.mHiddenRows 				= new Array();

		for(var i=0; i<aColumns.length; i++)
			this.mColumns[aColumns[i].mColId] = { mColId		 : aColumns[i].mColId,
																						mCellText  : aColumns[i].mColText };
	}; // End of TreeViewItemPrototype(aColumns, aLevel, aIsContainer)


	/**
	 * Common tree view prototype object. As a parameter is expected used
	 * tree view items.
	 *
	 * @param aTreeviewItems {array}
	 */
	function TreeViewPrototype(aTreeviewItems) {
		// Array with tree items
		this.__treeView__ = aTreeviewItems;
	}
	TreeViewPrototype.prototype.treebox = null;
	TreeViewPrototype.prototype.selection = null;

	TreeViewPrototype.prototype.__defineGetter__ ("rowCount",
			function () { return this.__treeView__.length; });

	TreeViewPrototype.prototype.getCellText = function(aRow, aCol) {
		if (!(aRow in this.__treeView__)) return "";
		if (!(aCol.id in this.__treeView__[aRow].mColumns)) return "";

		return this.__treeView__[aRow].mColumns[aCol.id].mCellText;
	};

	TreeViewPrototype.prototype.getCellValue = function(aRow, aCol) {
		if (!(aRow in this.__treeView__)) return null;
		if (!(aCol.id in this.__treeView__[aRow].mColumns)) return null;

		return null;
	};

	TreeViewPrototype.prototype.isContainer = function(aRow) {
		if (!(aRow in this.__treeView__)) return false;

		return this.__treeView__[aRow].mIsContainer;
	};

	TreeViewPrototype.prototype.isContainerOpen = function(aRow) {
		return ((this.isContainer(aRow)))
				? this.__treeView__[aRow].mIsContainerOpen
				: false;
	};

	TreeViewPrototype.prototype.isContainerEmpty = function(aRow) {
		return ((this.isContainer(aRow)))
				? this.__treeView__[aRow].mIsContainerEmpty
				: false;
	};

	TreeViewPrototype.prototype.setTree = function(aOut) {
		this.treebox = aOut;
	};

	TreeViewPrototype.prototype.getParentIndex = function(aRow) {
		if (!(aRow in this.__treeView__)) return -1;

		for(var i=(aRow-1); i>=0; i--)
			if(this.getLevel(i)<this.getLevel(aRow))
				return i;

		return -1;
	};

	TreeViewPrototype.prototype.hasNextSibling = function(aRow, aAfterIndex) {
		if (!(aRow in this.__treeView__)) return false;

		var thisLevel = this.getLevel(aRow);
		for (var i=(aRow+1); i<this.rowCount; i++) {
			var nextLevel = this.getLevel(i);

			if(nextLevel == thisLevel) return true;
			else if(nextLevel < thisLevel) return false;
		}

		return false;
	};

	TreeViewPrototype.prototype.getLevel = function(aRow) {
		if (!(aRow in this.__treeView__)) return -1;

		return this.__treeView__[aRow].mLevel;
	};

	TreeViewPrototype.prototype.getRowProperties = function(aRow, aProp) { return; };
	TreeViewPrototype.prototype.getCellProperties = function(aRow, aCol, aProp) { return; };
	TreeViewPrototype.prototype.getColumnProperties = function(aCol, aProp) { return; };
	TreeViewPrototype.prototype.canDrop = function(aRow, aOrientation) { return true; };
	TreeViewPrototype.prototype.drop = function(aRow, aOrientation) {};
	TreeViewPrototype.prototype.getImageSrc = function(aRow, aCol) { return ""; };
	TreeViewPrototype.prototype.toggleOpenState = function(aIndex) {};
	TreeViewPrototype.prototype.isSorted = function() { return false; };
	TreeViewPrototype.prototype.cycleHeader = function(aCol) { return; };
	TreeViewPrototype.prototype.selectionChanged = function() {};
	TreeViewPrototype.prototype.cycleCell = function(aRow, aCol) {};
	TreeViewPrototype.prototype.isEditable = function(aRow, aCol) { return false; };
	TreeViewPrototype.prototype.setCellText = function(aRow, aCol, aValue) {};
	TreeViewPrototype.prototype.setCellValue = function(aRow, aCol, aValue) {};
	TreeViewPrototype.prototype.performAction = function(aAction) {};
	TreeViewPrototype.prototype.performActionOnRow = function(aAction, aRow) {};
	TreeViewPrototype.prototype.preformActionOnCell = function(aAction, aRow, aCol) {};
	TreeViewPrototype.prototype.isSeparator = function(aIndex) { return false; };

	/**
	 * Helper property that access treeviews related methods
	 * @type Object
	 */
	this.treeviews =
	{
		/**
		 * Prototype object for new item of XPCOMViewer's main tree
		 *
		 * @param aName {string}
		 * @param aValue {string}
		 * @param aType {string}
		 * @param aLevel {integer}
		 * @param aIsContainer {boolean}
		 * @returns {TreeViewItemPrototype}
		 */
		getTreeItemPrototype : function(aName, aValue, aType, aLevel, aIsContainer)
		{
			var item = new TreeViewItemPrototype(
					[{ mColId : "bookmarkCol", mColText : ""},
					 { mColId : "nameCol", mColText : aName},
					 { mColId : "valueCol", mColText : aValue}],
					 aLevel,
					 aIsContainer);
			item.mType = aType;

			return item;
		}, // end getTreeItemPrototype(aName, aValue, aType, aLevel, aIsContainer)


		/**
		 * Prototype object for new view of main XPCOMViewer tree. From this prototype
		 * are derived target trees for Components.classes, Components.interfaces
		 * and Components.results.
		 *
		 * @param aTreeviewItems {array}
		 * @returns {TreeViewPrototype}
		 */
		getXpcomTreeviewPrototype : function(aTreeviewItems)
		{
			var treeview = new TreeViewPrototype(aTreeviewItems);

			treeview.getCellProperties = function(aRow, aCol, aProp) {
				if(!(aRow in this.__treeView__)) return;

				var name = this.__treeView__[aRow].mColumns["nameCol"].mCellText;

				if(aCol.id == "bookmarkCol") {
					var atom = (extensions.xv.bookmarks.hasItemBookmark(name))
							? kAtomSrv.getAtom("hasBookmark")
							: kAtomSrv.getAtom("noBookmark");

					aProp.AppendElement(atom);
				}
				else if(aCol.id == "nameCol")  {
					if(this.__treeView__[aRow].mType == "interface" &&
						 (name == "nsISupports" || name == "nsIClassInfo" || name == "IDispatch"))
						aProp.AppendElement(kAtomSrv.getAtom("constIface"));
					else if(this.__treeView__[aRow].mType == "method" && name == "QueryInterface")
						aProp.AppendElement(kAtomSrv.getAtom("constMethod"));
					else
						aProp.AppendElement(kAtomSrv.getAtom(this.__treeView__[aRow].mType));
				}
				else {
					aProp.AppendElement(kAtomSrv.getAtom("noIcon"));
				}
			};

			treeview.cycleHeader = function(aCol) {
				var index = extensions.xv.mMainTree.currentIndex;

				// We have to ensure that all containers are closed
				for(var i=0; i<this.rowCount; i++) {
					if(this.__treeView__[i].mIsContainer &&
						 this.__treeView__[i].mIsContainerOpen) {
						this.toggleOpenState(i);
					}
				}

				if(aCol.id == extensions.xv.mMainTreeSort.mSortedCol)
					extensions.xv.mMainTreeSort.direction =
							(extensions.xv.mMainTreeSort.mDirection === 0)
									? 1
									: -extensions.xv.mMainTreeSort.mDirection;

				if(aCol.id == extensions.xv.mMainTreeSort.mSortedCol &&
					 extensions.xv.mMainTreeSort.mFastIndex == this.rowCount)
				{
					this.__treeView__.reverse();
				}
				else {
					if(extensions.xv.mMainTreeSort.mSortedCol !== "") {
						var old = document.getElementById(extensions.xv.mMainTreeSort.mSortedCol);
						if(old)
							old.setAttribute("sortDirection", "");
					}

					extensions.xv.mMainTreeSort.mSortedCol = aCol.id;
					this.__treeView__.sort(extensions.xv.mMainTreeSort.sort);
				}

				var sortDir = (extensions.xv.mMainTreeSort.mDirection == 1)
						? "ascending"
						: "descending";

				aCol.element.setAttribute("sortDirection", sortDir);
				this.treebox.invalidate();

				if(index >= 0) {
					this.selection.select(index);
					this.treebox.ensureRowIsVisible(index);
				}

				extensions.xv.mMainTreeSort.mFastIndex = this.rowCount;
			};

			return treeview;
		}, // end getXpcomTreeviewPrototype(aTreeviewItems)


		/**
		 * Prototype for tree which displaying Components.classes
		 *
		 * @param aTreeviewItems {array}
		 * @returns {TreeViewPrototype}
		 */
		getClassesTreeviewPrototype : function(aTreeviewItems)
		{
			var treeview = this.getXpcomTreeviewPrototype(aTreeviewItems);

			treeview.toggleOpenState = function(aRow) {
				if(!(this.isContainer(aRow))) return;

				var name = this.__treeView__[aRow].mColumns["nameCol"].mCellText;

				if(this.isContainerOpen(aRow)) {
					// we are closing opened container
					var delCount = 0;
					var level = this.getLevel (aRow);

					for(var i=aRow+1; i<this.rowCount; i++) {
						if (this.getLevel(i) > level) delCount++;
						else break;
					}

					if(delCount > 0) {
						this.__treeView__.splice(aRow + 1, delCount);
						this.treebox.rowCountChanged(aRow + 1, -delCount);
					}

					this.__treeView__[aRow].mIsContainerOpen = false;
				}
				else {
					// we are opening selected container, so we have to know which type
					// user select (class, interface, property or method of initialized
					// interface).
					if(this.__treeView__[aRow].mType == "class") {
						var cl = null;
						try {
							cl = Components.classes[name].createInstance();
						} catch (e) {
							// @todo Use string bundles!
							var msg = "Creating instance of '" + name + "' failed!";
							extensions.xv.statusbar.update(msg, "error");
						}

						for(var ifc in ci) {
							try {
								var iface = cl.QueryInterface(ci[ifc]);
								if(iface) {
									var ifaceValue = Components.interfaces[ifc].number;
									var ifaceType = "interface";
									var ifaceItem = extensions.xv.treeviews.getTreeItemPrototype(ifc,
                      ifaceValue, "interface", 1, false);

									if (ifc != "nsISupports" && ifc != "IDispatch") {
										ifaceItem.mIsContainer = true;
										ifaceItem.mIsContainerEmpty = false;
									} else {
										ifaceItem.mColumns["valueCol"].mCellText = "";
									}

									this.__treeView__.splice (aRow + 1, -1, ifaceItem);
									this.treebox.rowCountChanged (aRow+1, 1);
								}
							} catch (e) {}
						}

						this.__treeView__[aRow].mIsContainerOpen = true;
					}
					else if (this.__treeView__[aRow].mType == "interface" && name != "nsISupports")  {
						var clName = this.__treeView__[this.getParentIndex(aRow)].mColumns["nameCol"].mCellText;

						var inst = null;
						try {
							inst = cc[clName].createInstance(ci[name]);
						} catch (e) {
							try {
								inst = cc[clName].getService(ci[name]);
							} catch (e) { }
						}

						if (inst) {
							var origIndex = aRow;

							for (var ifaceProperty in inst) {
								var ifaceProp = inst [ifaceProperty];
								var ifacePropType = ((new String(ifaceProp)).indexOf("function")!=-1)
										? "method" : "variable";
								var ifacePropValue = (ifacePropType == "method") ? "" : ifaceProp;
								var ifacePropTreeItem = extensions.xv.treeviews.getTreeItemPrototype(ifaceProperty,
										ifacePropValue, ifacePropType, 2, false);

								this.__treeView__.splice (origIndex + 1, -1, ifacePropTreeItem);
								this.treebox.rowCountChanged (origIndex + 1, 1);
							}

							this.__treeView__[origIndex].mIsContainerOpen = true;
						}
					}
				}
			};

			return treeview;
		}, // end getClassesTreeviewPrototype(aTreeviewItems)


		/**
		 * Prototype for tree which displaying Components.interfaces
		 *
		 * @param aTreeviewItems {array}
		 * @returns {TreeViewPrototype}
		 */
		getIfacesTreeviewPrototype : function(aTreeviewItems)
		{
			var treeview = this.getXpcomTreeviewPrototype(aTreeviewItems);

			treeview.toggleOpenState = function(aRow) {
				if(!(this.isContainer(aRow))) return;

				if(this.isContainerOpen(aRow)) {
					var delCount = 0;
					var level = this.getLevel(aRow);

					for (var i=aRow+1; i<this.rowCount; i++) {
						if(this.getLevel(i)>level)
							delCount++;
						else
							break;
					}

					if(delCount>0) {
						this.__treeView__.splice(aRow + 1, delCount);
						this.treebox.rowCountChanged(aRow + 1, -delCount);
					}

					this.__treeView__[aRow].mIsContainerOpen = false;
				}
				else {
					var name = this.__treeView__[aRow].mColumns["nameCol"].mCellText;
					var ifc = ci[name];

					for(var ifcConst in ifc) {
						var ifcConstItem = extensions.xv.treeviews.getTreeItemPrototype(ifcConst,
                ci[ifc][ifcConst], "constant", 1, false);
						this.__treeView__.splice(aRow+1, -1, ifcConstItem);
						this.treebox.rowCountChanged(aRow+1, 1);
					}

					this.__treeView__[aRow].mIsContainerOpen = true;
				}
			};

			return treeview;
		}, // end getIfacesTreeviewPrototype(aTreeviewItems)


		/**
		 * Prototype for tree which displaying Components.results
		 *
		 * @param aTreeviewItems {array}
		 * @returns {TreeViewPrototype}
		 */
		getResultsTreeviewPrototype : function(aTreeviewItems)
		{
			var treeview = this.getXpcomTreeviewPrototype(aTreeviewItems);

			treeview.getParentIndex = function(aRow) { return -1; };
			treeview.hasNextSibling = function(aRow, aAfterIndex) {
				return ((aRow+1)<this.rowCount);
			};
			treeview.isContainer = function(aRow) { return false; };
			treeview.isContainerOpen = function(aRow) { return false; };
			treeview.isContainerEmpty = function(aRow) { return true; };

			return treeview;
		} // end getResultsTreeviewPrototype(aTreeviewItems)

	}; // End of treeviews

	// ========================================================================

  /**
   * Property with some utility methods.
   */
  this.utils =
  {
    /**
     * Open window by type (mozilla app)
     *
     * @see mozilla/browser/base/content/browser.js
     *
     * @param aInType {string}
     * @param aUri {string}
     * @param aFeatures {string}
     */
    toOpenWindowByType : function(aInType, aUri, aFeatures)
    {
      var winman = cc['@mozilla.org/appshell/window-mediator;1'].getService();
      winman = winman.QueryInterface(ci.nsIWindowMediator);

      var topWindow = winman.getMostRecentWindow(aInType);
      var features = (aFeatures)
          ? aFeatures
          : "chrome,extrachrome,menubar,resizable,scrollbars,status,toolbar";

      if(topWindow) {
        // Requested window is already opened so only focus it
        topWindow.focus();
      } else {
        // Open new instance of requested window
        window.open(aUri, "_blank", features);
      }
    }, // end toOpenWindowByType(aInType, aUri, aFeatures)

    /**
     * Open browser window
     *
     * @see mozilla/browser/base/content/browser.js
     */
    openBrowserWindow : function()
    {
      var charsetArg = new String();
      var handler = cc["@mozilla.org/browser/clh;1"].getService(ci.nsIBrowserHandler);
      var defaultArgs = handler.defaultArgs;
      var wintype = document.documentElement.getAttribute("windowtype");

      // if and only if the current window is a browser window and it has
      // a document with a character set, then extract the current charset
      // menu setting from the current document and use it to initialize
      // the new browser window...
      var win;
      if (window && (wintype == "navigator:browser") && window.content &&
          window.content.document)
      {
        var DocCharset = window.content.document.characterSet;
        charsetArg = "charset="+DocCharset;

        //we should "inherit" the charset menu setting in a new window
        win = window.openDialog("chrome://browser/content/", "_blank",
            "chrome,all,dialog=no", defaultArgs, charsetArg);
      }
      else // forget about the charset information.
      {
        win = window.openDialog("chrome://browser/content/", "_blank",
            "chrome,all,dialog=no", defaultArgs);
      }

      return win;
    }, // end openBrowserWindow()

    /**
     * Copy given text to the system clipboard
     *
     * @param aText {string}
     * @returns {boolean}
     */
    copyTextToClipboard : function(aText)
    {
      var nsIClipboard = Components.interfaces.nsIClipboard;
      var clip = Components.classes["@mozilla.org/widget/clipboard;1"].
          createInstance(nsIClipboard);
      if(!clip) return false;

      var trans = Components.classes["@mozilla.org/widget/transferable;1"].
          createInstance(Components.interfaces.nsITransferable);
      if(!trans) return false;

      try {
        var str = Components.classes["@mozilla.org/supports-string;1"].
            createInstance(Components.interfaces.nsISupportsString);
        str.data = aText;

        trans.addDataFlavor("text/unicode");
        trans.setTransferData("text/unicode", str, aText.length*2);
        clip.setData(trans, null, nsIClipboard.kGlobalClipboard);

        return true;
      } catch(e) {
        return false;
      }
    }, // end copyTextToClipboard(aText)

    /**
     * Otevre html odkaz v prohlizeci (ten co ma uzivatel nastaven jako
     * defaultni).
     *
     * @param aUrl {string}
     */
    openLinkInExternalBrowser : function(aUrl)
    {
      try {
        var ioSrv = Components.classes["@mozilla.org/network/io-service;1"].
            getService(Components.interfaces.nsIIOService);
        var uri = ioSrv.newURI(aUrl, null, null);
        var extps = Components.classes["@mozilla.org/uriloader/external-protocol-service;1"].
            getService(Components.interfaces.nsIExternalProtocolService);

        extps.loadURI(uri, null);
      } catch(e) {
        // XXX Use stringbundles!!!
        alert("Chyba při otevírání externího prohlížeče!");
      }
    }, // end openLinkInExternalBrowser(aUrl)

    // ========================================================================
    // File utils

    /**
     * Returns instance of nsIFile with Profile directory
     *
     * @todo When we building extension with Firefox (for example is same
     *       for all others Mozilla applications) causes this fuction crash
     *       if extension dependens on it because profile dir of extension
     *       is not in user profile dir but in application profile dir
     */
    get profDir() {
      return cc["@mozilla.org/file/directory_service;1"].
             getService(ci.nsIProperties).get("ProfD", ci.nsIFile);
    },

    /**
     * Returns instance of nsIFile with specified directory. Directories
     * identifiers can be found in this file:
     *   mozilla/xpcom/io/nsDirectoryServiceDefs.h
     *
     * @param aDirId {string}
     * @returns {object}
     */
    getSpecDir : function(aDirId) {
      try {
        return cc["@mozilla.org/file/directory_service;1"].getService(ci.nsIProperties).
           get(aDirId, ci.nsIFile);
      } catch(e) {
        cu.reportError("Could NOT return specified directory ('" + aDirID + "') \n" + e);
        return null;
      }
    }, // end getSpecDir(aDirId)

    /**
     * Returns instance of nsIFile from given path. If error occured
     * returns FALSE.
     *
     * @param aPath {string}
     * @returns {object}
     */
    getFileFromPath : function(aPath) {
      alert("Not finished yet!");

      return false;
    }, // end getFileFromPath(aPath)

    /**
     * Create file
     *
     * @param  nsIFile
     * @return boolean
     */
    createFile : function(aFile)
    {
      if(!(aFile instanceof ci.nsIFile)) {
        cu.reportError("Could NOT create file. File pointer is NOT valid. " + e);
        return false;
      }

      try {
        aFile.create(0x00, 0664);
        return true;
      } catch(e) {
        cu.reportError("Could NOT create file. " + e);
        return false;
      }
    }, // end createFile(aFile)

    /**
     * Create folder
     *
     * @param  nsIFile
     * @return boolean
     */
    createFolder : function(aFolder)
    {
      if(!(aFolder instanceof ci.nsIFile)) {
        cu.reportError("Could NOT create folder. File pointer is NOT valid " + e);
        return false;
      }

      try {
        aFolder.create(0x001, 0664);
        return true;
      } catch(e) {
        cu.reportError("Could NOT create folder. " + e);
        return false;
      }
    }, // end createFolder(aFolder)

    /**
     * Reads and returns text from file
     *
     * @param  nsILocalFile
     * @return mixed        Returns file's text or FALSE
     */
    readTextFromFile : function(aFile)
    {
      if(!(aFile instanceof ci.nsIFile)) {
        cu.reportError("Could NOT read text from file. File pointer is NOT valid." + e);
        return false;
      }

      var file    = cc["@mozilla.org/file/local;1"].createInstance(ci.nsILocalFile);
      var text    = new String ();
      var stream1 = cc["@mozilla.org/network/file-input-stream;1"].
                    createInstance(ci.nsIFileInputStream);
      var stream2 = cc["@mozilla.org/scriptableinputstream;1"].
                    createInstance(ci.nsIScriptableInputStream);

      try {
        file.initWithFile(aFile);
        stream1.init(file, 1, 0, false);
        stream2.init(stream1);
        text += stream2.read(-1);

        if(stream2) stream2.close();
        if(stream1) stream1.close();
      } catch(e) {
        cu.reportError("Could NOT read text from file. " + e);
        return false;
      }

      try {
        var converter = cc["@mozilla.org/intl/scriptableunicodeconverter"].
                        createInstance(ci.nsIScriptableUnicodeConverter);
        converter.charset = "UTF-8";

        return converter.ConvertToUnicode(text);
      } catch(e) {
        cu.reportError("Could NOT read text from file. " + e);
        return text;
      }
    }, // end readTextFromFile(aFile)

    /**
     * Save given text into file
     *
     * @param aFile {Components.interfaces.nsIFile}
     * @param aText {string}
     * @returns {boolean}
     */
    writeTextToFile : function(aFile, aText)
    {
      if(!(aFile instanceof ci.nsIFile)) {
        cu.reportError("Could NOT write text to file. Pointer to file is NOT valid." + e);
        return false;
      }

      var file = cc["@mozilla.org/file/local;1"].createInstance(ci.nsILocalFile);
      var stre = cc["@mozilla.org/network/file-output-stream;1"].
                 createInstance(ci.nsIFileOutputStream);
      var os   = cc["@mozilla.org/intl/converter-output-stream;1"].
                 createInstance(ci.nsIConverterOutputStream);
      os.init(str, "UTF-8", 0, 0x0000);

      try {
        file.initWithFile(aFile);
        if(file.exists() == false) this.createFile(file);

        str.init(file, 0x02 | 0x08 | 0x20, 0664, 0);
        os.writeString(aText);

        if(str) str.close();
        if(os) os.close();
        return true;
      } catch(e) {
        cu.reportError("Could NOT write text to file. " + e);
        return false;
      }
    }, // end writeTextToFile(aFile, aText)

    /**
     * Read XML from the given file
     *
     * @param aFile {Components.interfaces.nsIFile}
     * @param aType {string}
     * @return {Components.classes.nsIDOMDocument}
     */
    readXmlFromFile : function(aFile, aType)
    {
      if(!(aFile instanceof ci.nsIFile)) {
        cu.reportError("Could NOT read from XML file. File pointer is NOT valid. " + e);
        return false;
      }

      var file = cc["@mozilla.org/file/local;1"].createInstance(ci.nsILocalFile);
      var str  = cc["@mozilla.org/network/file-input-stream;1"].
                 createInstance(ci.nsIFileInputStream);
      var prs  = cc["@mozilla.org/xmlextras/domparser;1"].
                 createInstance(ci.nsIDOMParser);
      var doc = null;

      try {
        file.initWithFile(aFile);

        if(!file.exists()) {
          cu.reportError("XML file with bookmarks is not created yet!");
          return false;
        }

        str.init(file, 1, 0, false);
        doc = prs.parseFromStream(str, "UTF-8", -1, aType);
        if(str) str.close();
      } catch(e) {
        cu.reportError("Could NOT read from XML file File pointer is NOT valid. " + e);
        return false;
      }

      return doc;
    }, // end readXmlFromFile(aFile, aDocument)

    /**
     * Write XML to the file
     *
     * @param aFile {object} Instance of nsIFile
     * @param aDoc {object} Instance of nsIDOMDocument
     * @returns {boolean}
     */
    writeXmlToFile : function(aFile, aDoc)
    {
      if(!(aFile instanceof ci.nsIFile)) {
        cu.reportError("Could NOT write to XML file. File pointer is NOT valid. " + e);
        return false;
      }

      var file = cc["@mozilla.org/file/local;1"].createInstance(ci.nsILocalFile);
      var ser  = cc["@mozilla.org/xmlextras/xmlserializer;1"].
                 createInstance(ci.nsIDOMSerializer);
      var str  = cc["@mozilla.org/network/file-output-stream;1"].
                 createInstance(ci.nsIFileOutputStream);

      try {
        file.initWithFile(aFile);
        if(!(file.exists())) file.create(0x00, 0664);
        str.init(aFile, 0x02 | 0x08 | 0x20, 0664, 0);
        ser.serializeToStream(aDoc, str, "");
        if(str) str.close();
        return true;
      } catch(e) {
        cu.reportError("Could NOT write to XML file. " + e);
        return false;
      }
    }, // end writeXmlToFile(aFile, aDoc)

    /**
     * Select file using filepicker
     *
     * @param aTitle {string} Title of file picker dialog
     * @param aInitPath {string} Starting path
     * @param aFilters {array} Array of used filters
     * @param aMode {string} Use 'Open', 'Save' etc.
     */
    pickFile : function(aTitle, aInitPath, aFilters, aMode)
    {
      // Helper method for creating filters for filepicker. Joins array of filter
      // names into a bit string.
      var _prepareFilters = function(aFilters) {
            var filters = 0;

            for(var i = 0; i < aFilters.length; ++i)
              filters = filters | Components.interfaces.nsIFilePicker[aFilters[i]];

            return filters;
          };

      try {
        var modeStr = aMode ? "mode" + aMode : "modeOpen";
        var mode;
        try {
          mode = ci.nsIFilePicker[modeStr];
        } catch(e) {
          cu.reportError("WARNING: Invalid FilePicker mode '" + aMode + "'. Defaulting to 'Open'");
          mode = ci.nsIFilePicker.modeOpen;
        }

        var fp = cc["@mozilla.org/filepicker;1"].createInstance(ci.nsIFilePicker);
        fp.init(window, aTitle, mode);
        fp.appendFilters(_prepareFilters(aFilters));

        if(aInitPath) {
          var dir = cc["@mozilla.org/file/local;1"].createInstance(ci.nsILocalFile);
          dir.initWithPath(aInitPath);
          fp.displayDirectory = dir;
        }

        var fpStatus = fp.show();
        if((fpStatus == ci.nsIFilePicker.returnOK) ||
           (fpStatus == ci.nsIFilePicker.returnReplace)) {
          return fp.file;
        }
      } catch(e) {
        cu.reportError("ERROR: Unable to open file picker.\n" + e);
      }

      return null;
    }, // end pickFile(aTitle, aInitPath, aFilters, aMode)

    /**
     * Select directory using filepicker
     *
     * @param aTitle {string} Title of file picker dialog
     * @param aInitPath {string} Starting path
     */
    pickDir : function(aTitle, aInitPath)
    {
      try {
        var fp = cu["@mozilla.org/filepicker;1"].createInstance(ci.nsIFilePicker);
        fp.init(window, aTitle, ci.nsIFilePicker.modeGetFolder);

        if(aInitPath) {
          var dir = cu["@mozilla.org/file/local;1"].createInstance(ci.nsILocalFile);
          dir.initWithPath(aInitPath);
          fp.displayDirectory = dir;
        }

        if(fp.show() == ci.nsIFilePicker.returnOK) {
          return fp.file;
        }
      } catch(e) {
        cu.reportError("ERROR: Unable to open filepicker.\n" + e);
      }

      return null;
    } // end pickDir(aTitle, aInitPath)

  }; // End of utils

  // ========================================================================

  /**
   * Holds name of startup tree view name.
   * @type String
   */
  this.mStartupTreeViewName = null;

  /**
   * Is XPCOMViewer runned in window mode or in sidebar mode?
   * @type Boolean
   */
  this.mIsWindowMode = true;

  /**
   * Holds pointer to main XPCOMViewer's tree element.
   * @type Object
   */
  this.__defineGetter__("mMainTree",
      function() { return document.getElementById("xpcomviewer-main-tree"); });

  /**
   * Holds name of currently displayed tree view.
   * @type String
   */
  this.mCurrentTreeView = "";

  /**
   * Holds backup of the all (already initialized) tree views.
   * @type Object
   */
  this.mMainTreeViewsBackup = { classes : new Array(),
                                ifaces  : new Array(),
                                results : new Array() };

  /**
   * Is used filter on main XPCOMViewer's tree?
   * @type Boolean
   */
  this.mHasMainTreeFilter = false;

  /**
   * Holds last tree view (which was shown before filter applied).
   * @type Array
   */
  this.mMainTreeFilterBackup = new Array();

  /**
   * Holds informations about currently used sorting on the main tree.
   *
   * @type Object
   */
  this.mMainTreeSort =
  {
    /**
     * Contains name of currently sorted column
     * @type String
     */
    mSortedCol : "",

    /**
     * Holds sort direction: -1 is descending, 0 is natural, 1 is ascending.
     * @type Integer
     */
    mDirection : 0,

    /**
     * Holds count of tree items to examine if tree's row count is changed from
     * last sort (if we can use simple array reverse).
     * @type Integer
     */
    mFastIndex : 0,

    /**
     * Method for performing sorting.
     *
     * @param {object}
     * @param {object}
     */
    sort : function(aX, aY) {
      var sorted_col = extensions.xv.mMainTreeSort.mSortedCol;

      var xText = aX.mColumns[sorted_col].mCellText.toLowerCase();
      var yText = aY.mColumns[sorted_col].mCellText.toLowerCase();

      if(xText > yText) return 1;
      if(xText < yText) return -1;

      return 0;
    }
  };

  /**
   * Total count of Components.classes
   * @type integer
   */
  this.mClassesCount = 0;

  /**
   * Total count of Components.interfaces
   * @type integer
   */
  this.mIfacesCount = 0;

  /**
   * Total count of Components.results
   * @type integer
   */
  this.mResultsCount = 0;

  /**
   * Holds timer object for updateUI command.
   * @type Object
   */
  this.mUpdateUICmdTimer = null;


  // =========================================================================

  /**
   * Prototype object for timer self. These types can be used:
   *    ci.nsITimer.TYPE_REPEATING_PRECISE
   *    ci.nsITimer.TYPE_REPEATING_SLACK
   *    ci.nsITimer.TYPE_ONE_SHOT
   *
   * @param aCallback {object} Callback function
   * @param aTime {integer} Time in miliseconds
   * @param aType {integer} Type of timer
   * @param aImmediate {boolean} Init (run) timer immediately?
   */
  function xvTimerPrototype(aCallback, aTime, aType, aImmediate) {
    this.callback = aCallback;
    this.time     = aTime;
    this.type     = aType;

    if(aImmediate) this.init();
  };
  xvTimerPrototype.prototype = {
    /**
     * Instance of nsITimer service
     * @type Object
     */
    get timer() { return Components.classes["@mozilla.org/timer;1"]. createInstance(ci.nsITimer); },


    /**
     * Initialize timer.
     */
    init : function() {
      // Helper prototype object for timer observer
      var observerPrototype = function(aCallback) {
            this.observe = aCallback;
            this.QueryInterface = function(aIID) {
              if(aIID.equals(ci.nsIObserver) ||
                 aIID.equals(ci.nsISupportsWeakReference) ||
                 aIID.equals(ci.nsISupports))
                return this;

              throw cr.NS_NOINTERFACE;
            };
          };

      var observer = new observerPrototype(this.callback);

      this.timer.init(observer, this.time, this.type);
    } // end init()

  }; // End of xvTimerPrototype

  // ========================================================================
  // Stuff for progress listener for loading web pages

  // Some constants for mWebProgressListener
  const NOTIFY_STATE_DOCUMENT = ci.nsIWebProgress.NOTIFY_STATE_DOCUMENT;
  const STATE_IS_DOCUMENT     = ci.nsIWebProgressListener.STATE_IS_DOCUMENT;
  const STATE_START           = ci.nsIWebProgressListener.STATE_START;
  const STATE_STOP            = ci.nsIWebProgressListener.STATE_STOP;


  /**
   * WebProgress listener (for our lxr searchs)
   *
   * @todo Implement onLinkIconAvailable method.
   */
  this.mWebProgressListener = {
    /**
     * Fired when progress changed
     *
     * @param aProgress {???}
     * @param aRequest {???}
     * @param aFlag {???}
     * @param aStatus {???}
     */
    onStateChange : function(aProgress, aRequest, aFlag, aStatus)  {
      if(aFlag & STATE_STOP) {
        var msg = extensions.xv.mStrBundle.GetStringFromName("pageLoadingFinished");
        extensions.xv.statusbar.update(msg, "warning");

        var main_content = document.getElementById("mainContentLXR");
        if(main_content) main_content.removeProgressListener(this);
      }
    },
    onLocationChange : function(a,b,c) {},
    onProgressChange : function(a,b,c,d,e,f) {},
    onStatusChange : function(a,b,c,d) {},
    onSecurityChange : function(a,b,c) {},
    onLinkIconAvailable : function(a) {},
    QueryInterface : function(aIID)  {
      if (aIID.equals(ci.nsIWebProgressListener) ||
          aIID.equals(ci.nsISupportsWeakReference) ||
          aIID.equals(ci.nsISupports))
        return this;

      throw cr.NS_NOINTERFACE;
    }
  };

  // =========================================================================
  // Event handlers

	/**
	 * On load event handler
   *
   * @param aEvent {object}
	 */
	this.onLoad = function(aEvent)
	{
    window.focus();

    // ==========
    // XXX Only for debugging. Comment this in release version!!!
/*
    try {
      var _prefs = Components.classes ["@mozilla.org/preferences-service;1"].
            getService(Components.interfaces.nsIPrefService).
            getBranch("");
      _prefs.setBoolPref("browser.dom.window.dump.enabled", true);
      _prefs.setBoolPref("javascript.options.showInConsole", true);
      _prefs.setBoolPref("javascript.options.strict", true);
      _prefs.setBoolPref("nglayout.debug.enable_xbl_forms", true);
      _prefs.setBoolPref("nglayout.debug.disable_xul_cache", true);
      _prefs.setBoolPref("nglayout.debug.disable_xul_fastload", true);
    } catch(e) {}
*/
    // ==========

    // Initialize bookmarks service
    try {
      this.bookmarks.load();
    } catch(e) {}

    // Load tree view name
    if((this.mPrefs.getBoolPref("useLastView")) &&
        this.mPrefs.prefHasUserValue("useLastViewName"))
      this.mStartupTreeViewName = this.mPrefs.getCharPref("useLastViewName");

    if(this.mStartupTreeViewName == null || this.mStartupTreeViewName == "")
      this.mStartupTreeViewName = XV_DEFAULT_STARTUP_VIEW;

    // Load all views and show
    this.loadAllViews();
    this.refreshTree(this.mStartupTreeViewName);
    this.updateUI();

    // Set up timer for UI updating
    if(this.mUpdateUICmdTimer == null)
      this.mUpdateUICmdTimer = new xvTimerPrototype(this.updateUI, 500,
                                                    ci.nsITimer.TYPE_ONE_SHOT,
                                                    true);
	}; // end onLoad(aEvent)


	/**
	 * On unload event handler
   *
   * @param aEvent {object}
   * @returns {boolean}
	 */
	this.onUnload = function(aEvent)
	{
    if(this.mUpdateUICmdTimer) {
      this.mUpdateUICmdTimer.timer.cancel();
      this.mUpdateUICmdTimer = null;
    }

    return true;
	}; // end onUnLoad(aEvent)


	/**
	 * On close event handler
   *
   * @param aEvent {object}
   * @returns {boolean}
	 */
	this.onClose = function(aEvent)
	{
	  if(this.mPrefs.getBoolPref("useLastView"))
      this.mPrefs.setCharPref("useLastViewName", this.mCurrentTreeView);

    if(this.bookmarks.mBookmarksWereChanged) this.bookmarks.save();

	  return true;
	}; // end onClose(aEvent)


  /**
   * Fired when user clicked on maintree - used for fast adding/removing
   * bookmarks.
   *
   * @param aEvent {object}
   */
  this.onMainTreeClick = function(aEvent)
  {
    // XXXX If user has this feature enabled by preferences settins enable this quick toggling.
  }; // end onMainTreeClick(aEvent)


  /**
   * Fired when user select any item (or change selection) of the main
   * XPCOMViewer's tree. Is used for enabling/disabling add and remove
   * bookmark - according to currently selected item.
   *
   * @param aEvent {object}
   */
  this.onMainTreeSelect = function(aEvent)
  {
    var sel_item = this.getSelectedTreeItem();
    var addBookmark_cmd = document.getElementById("cmd_addBookmark");
    var editBookmark_cmd = document.getElementById("cmd_editBookmark");
    var removeBookmark_cmd = document.getElementById("cmd_removeBookmark");

    if(this.bookmarks.hasItemBookmark(sel_item.mName)) {
      addBookmark_cmd.setAttribute("disabled", "true");
      editBookmark_cmd.removeAttribute("disabled");
      removeBookmark_cmd.removeAttribute("disabled");
    } else {
      addBookmark_cmd.removeAttribute("disabled");
      editBookmark_cmd.setAttribute("disabled", "true");
      removeBookmark_cmd.setAttribute("disabled", "true");
    }
  }; // end onMainTreeSelect(aEvent)


  // ========================================================================
  // Methods that implement main commands of XPCOMViewer


  /**
   * Quit XPCOMViewer
   */
  this.quit = function()
  {
    // This not execute onClose event handler so we need do it manually
    this.onClose(null);

    window.close();
  }; // end quit()


  /**
   * Toggle full screen view command
   *
   * @todo Fullscreen mode should have observer!
   */
  this.toggleFullscreen = function()
  {
    window.fullScreen = !window.fullScreen;
  }; // end toggleFullscreen()


  /**
   * Show about dialog
   */
  this.showAboutDialog = function()
  {
    var dlg = window.openDialog("chrome://xpcomviewer/content/about.xul",
        "xpcomviewer-dialog",
        "chrome,extrachrome,dialog,modal,resizable=no,centerscreen");

    if(dlg) dlg.focus();
  }; // end showAboutDialog()


  /**
   * Show home page
   *
   * @todo Show any user error message if showing of homepage failed.
   */
  this.showHomePage = function()
  {
    try {
      var extprt_srv = cc["@mozilla.org/uriloader/external-protocol-service;1"].
          getService(ci.nsIExternalProtocolService);
      var uri_str = this.mPrefs.getCharPref("global.homepageUri");
      var ioserv = cc["@mozilla.org/network/io-service;1"].getService(ci.nsIIOService);
      var uri = ioserv.newURI(aUrlString, null, null);

      extprt_srv.loadUrl(uri);
    } catch(e) {
      cu.reportError(e);
    }
  }; // end showHomePage()


  /**
   * Show help window
   *
   * @todo Show any user error message if showing of help failed.
   *
   * Note: This method requires loaded this (platform) global Mozilla script:
   *       chrome://help/content/contextHelp.js
   */
  this.showHelp = function()
  {
    try {
      openHelp("xpcomviewer-help", "chrome://xpcomviewer/locale/help/help.rdf");
    } catch(e) {
      cu.reportError(e);
    }
  }; // end showHelp


  /**
   * Show JavaScript console
   */
  this.showJSConsole = function()
  {
    extensions.xv.utils.toOpenWindowByType("global:console", "chrome://global/content/console.xul");
  }; // end showJSConsole()


  /**
   * Show preferences dialog
   *
   * @todo Use extensions.xv.utils.toOpenWindowByType...
   */
  this.showPrefsDialog = function()
  {
    var dlg = window.openDialog(
        "chrome://xpcomviewer/content/preferences/preferences.xul",
        "xpcomviewer-prefs",
        "chrome,extrachrome,toolbar,modal,resizable=no,centerscreen,all");

    if(dlg) dlg.focus();
  }; // end showPrefsDialog()


  // ========================================================================
  // Some importatnt methods


  /**
   * Returns name of selected item (e.g. "@mozilla.org/..." etc.).
   *
   * @returns {object}
   */
  this.getSelectedTreeItem = function()
  {
    if(this.mMainTree.currentIndex == -1)
      return { mIndex : -1, mName  : "", mType  : "" };

    var itemIdx = this.mMainTree.currentIndex;
    var pri_col = this.mMainTree.columns.getPrimaryColumn();
    var itemName = this.mMainTree.view.getCellText(itemIdx, pri_col);
    var itemType = "";

    switch(this.mCurrentTreeView) {
      case "classes":
        if(this.mMainTree.view.getLevel(itemIdx) === 0)
          itemType = "class";
        else if(this.mMainTree.view.getLevel(itemIdx) == 1)
          itemType = "interface";
        else if(this.mMainTree.view.getLevel(itemIdx) == 2)
          itemType = "property";
        break;

      case "ifaces":
        itemType = (this.mMainTree.view.getLevel(itemIdx) === 0)
            ? "interface"
            : "ifaceConstant";
        break;

      case "results":
        itemType = "result";
        break;
    }

    return { mIndex : itemIdx, mName  : itemName, mType  : itemType };
  }; // end getSelectedTreeItem()


	/**
	 * Load all views and store them into extensions.xv.mXpcomTreeViewsBackup
	 *
   * @todo Any UI messages about loading progress
	 */
	this.loadAllViews = function()
	{
    // Create this.mMainTreeViewsBackup.classes
  	this.mClassesCount = 0;
		var newTreeView = new Array();
	  for(var cl in Components.classes)  {
      if(typeof(Components.classes[cl].number) == "undefined") continue;

      var item = this.treeviews.getTreeItemPrototype(Components.classes[cl].name,
                                                     Components.classes[cl].number,
                                                     "class", 0, true);
	    newTreeView.push(item);
	    newTreeView[this.mClassesCount].mIsContainerEmpty = false;
	    this.mClassesCount++;
	  }
	  this.mMainTreeViewsBackup.classes = newTreeView;

    // Create this.mMainTreeViewsBackup.ifaces
		this.mIfacesCount = 0;
		newTreeView = new Array();
		for(var ifc in Components.interfaces) {
      if(typeof(Components.interfaces[ifc].name) == "undefined") continue;

      var number = (typeof(Components.interfaces[ifc].number) == "undefined")
          ? "" : Components.interfaces[ifc].number;

      var item = this.treeviews.getTreeItemPrototype(Components.interfaces[ifc].name,
                                                     number, "interface", 0, false);
		  newTreeView.push(item);

		  var addIndex = 0;
		  for(var ifaceItem in Components.interfaces[ifc]) addIndex++;

		  if(addIndex > 0) {
		    newTreeView[this.mIfacesCount].mIsContainer = true;
		    newTreeView[this.mIfacesCount].mIsContainerEmpty = false;
		  }

		  this.mIfacesCount++;
		}
		this.mMainTreeViewsBackup.ifaces = newTreeView;

    // Create this.mMainTreeViewsBackup.results
		this.mResultsCount = 0;
		newTreeView = new Array();
    for(var res in Components.results) {
      var item = this.treeviews.getTreeItemPrototype(res,
                                                     Components.results[res],
                                                     "result", 0, false);
      newTreeView.push(item);
      this.mResultsCount++;
    }
 		this.mMainTreeViewsBackup.results = newTreeView;
	}; // end loadAllViews()


  /**
   * Runs UI update command (is a callback for gUpdateUICmdTimer)
   *
   * @todo Remove gUpdateUICmdTimer and extensions.xv.updateUI and move
   *       all functionality into methods implementing related commands.
   */
  this.updateUI = function()
  {
    var showLXRSearch_cmd  = document.getElementById("cmd_showLXRSearch");
    var addBookmark_cmd    = document.getElementById("cmd_addBookmark");
    var removeBookmark_cmd = document.getElementById("cmd_removeBookmark");

    // Update title of xpcom tree parent tab
    var maintree_tab = document.getElementById("xpcomviewer-maintree-tab");
    if(maintree_tab) {
      switch(this.mCurrentTreeView) {
        case "classes":
          var name = this.mStrBundle.GetStringFromName("mainTreeLabelClasses");
          maintree_tab.setAttribute("label", name);
          maintree_tab.setAttribute("class", "classesView-tab");
          break;

        case "ifaces":
          var name = this.mStrBundle.GetStringFromName("mainTreeLabelIfaces");
          maintree_tab.setAttribute("label", name);
          maintree_tab.setAttribute("class", "ifacesView-tab");
          break;

        case "results":
          var name = this.mStrBundle.GetStringFromName("mainTreeLabelResults");
          maintree_tab.setAttribute("label", name);
          maintree_tab.setAttribute("class", "resultsView-tab");
          break;
      }
    }

    // Updates cmd_showLXRSearch related UI elements
    var lxrbrowser_tab = document.getElementById("xpcomviewer-lxrbrowser-tab");
    if(!lxrbrowser_tab.collapsed)
    {
      var main_content = document.getElementById("mainContentLXR");
      var current_uri = main_content.contentDocument.location.href;

      // XXX Why is here this test?
      if(current_uri.indexOf("search") > 0) {
        showLXRSearch_cmd.setAttribute("checked", "true");
      } else {
        showLXRSearch_cmd.removeAttribute("checked");
      }
    }

    // XXX Updates cmd_showBugzillaSearch related UI elements

    // Update statusbar
    extensions.xv.statusbar.nextMessage();
  }; // end updateUI()


  // ========================================================================
  // Methods that implement main tree related commands


  this.mDisplayedRowsCount = 0;
  this.mDisplayedRowsCountWithFilter = 0;


	/**
	 * Refresh tree with given reference uri.
	 *
	 * @param aTreeType {string}
	 */
	this.refreshTree = function(aTreeType)
	{
    var tabs = document.getElementById("workspace-tabbox-tabs");
    if(tabs.selectedIndex != 0) tabs.selectedIndex = 0;

    this.mCurrentTreeView = aTreeType;

    // Remove filter if any applied and restore treeview from backup
    if(this.mHasMainTreeFilter != false) this.showAllTreeitems();

    var restored_view = this.mMainTreeViewsBackup[this.mCurrentTreeView];

    switch(this.mCurrentTreeView) {
      case "ifaces":
        this.mMainTree.view = this.treeviews.getIfacesTreeviewPrototype(restored_view);
        break;

      case "results":
        this.mMainTree.view = this.treeviews.getResultsTreeviewPrototype(restored_view);
        break;

      case "classes":
        this.mMainTree.view = this.treeviews.getClassesTreeviewPrototype(restored_view);
        break;
    }

    try {
      //this.mMainTree.treeBoxObject.view.selection.clearSelection();
      this.mMainTree.view.selection.clearSelection();
    } catch(e) {}

    this.mDisplayedRowsCount = this.mMainTree.view.rowCount;

    // Update window's title
    if(this.mCurrentTreeView == "" || this.mCurrentTreeView == null)
      this.mCurrentTreeView == "classes";

    var name = (typeof(this.mTreeViewsNames[this.mCurrentTreeView]) == "undefined")
        ? this.mCurrentTreeView
        : this.mTreeViewsNames[this.mCurrentTreeView];
    var params = new Array(name, this.mDisplayedRowsCount);
    document.title = this.mStrBundle.formatStringFromName("xpcomviewerWindowTitle",
                                                          params, 2);

    // Tab's title and icon
    var tab = document.getElementById("xpcomviewer-maintree-tab");
    if(tab) {
      tab.setAttribute("label", this.mTreeViewsNames[this.mCurrentTreeView]);
      tab.setAttribute("class", this.mCurrentTreeView + "View-tab");
    }

    // Update statusbar label
    var msg_params = [this.mTreeViewsNames[this.mCurrentTreeView],
                      this.mDisplayedRowsCount];
    var msg = this.mStrBundle.formatStringFromName("loadingTreeFinished",
                                                   msg_params, 2);
    this.statusbar.update(msg, "success");
	}; // end refreshTree(aTreeType)


  /**
   * Toggle visibility of filter toolbar
   */
	this.toggleFilterToolbar = function()
	{
		var toolbar = document.getElementById("filter-toolbar");

		if(toolbar) {
			if(toolbar.hasAttribute("collapsed")) {
				toolbar.removeAttribute("collapsed");
			} else {
				toolbar.setAttribute("collapsed", true);
			}
		}
	}; // end toggleFilterToolbar()


  /**
   * Apply filter on tree items
   */
  this.showFilteredTreeitems = function()
  {
    var filter_textbox = document.getElementById("xpcomviewer-maintreefilter-textbox");
    if(!filter_textbox) return;

    var searchString = filter_textbox.value.toLowerCase();
	  var currentTreeView = this.mMainTreeViewsBackup[this.mCurrentTreeView];
	  var newTreeView = [];

    var item = null;
    for(item in currentTreeView) {
      var name = currentTreeView[item].mColumns["nameCol"].mCellText.toLowerCase();
      if(name.indexOf(searchString) != -1) newTreeView.push(currentTreeView[item]);
    }

	  this.mHasMainTreeFilter = true;

    switch(this.mCurrentTreeView) {
      case "classes":
        this.mMainTree.view = this.treeviews.getClassesTreeviewPrototype(newTreeView);
        break;

      case "ifaces":
        this.mMainTree.view = this.treeviews.getIfacesTreeviewPrototype(newTreeView);
        break;

      case "results":
        this.mMainTree.view = this.treeviews.getResultsTreeviewPrototype(newTreeView);
        break;
    }

    this.mDisplayedRowsCountWithFilter = this.mMainTree.view.rowCount;

    // Update user interface
    var msg = this.mStrBundle.formatStringFromName("filterAppliedMsg",
                                                   [newTreeView.length],
                                                   1);
    this.statusbar.update(msg, "success");

    // Update window's title
    var params = new Array(this.mTreeViewsNames[this.mCurrentTreeView],
                           this.mDisplayedRowsCountWithFilter);
    document.title = this.mStrBundle.formatStringFromName("xpcomviewerWindowTitle1",
                                                          params, 2);
  }; // end showFilteredTreeitems()


  /**
   * Show all tree items (remove filter)
   */
  this.showAllTreeitems = function()
  {
    // Get backup of current tree view (before was filter applied)
    var treeview = this.mMainTreeViewsBackup[this.mCurrentTreeView];

    switch(this.mCurrentTreeView) {
      case "classes":
        this.mMainTree.view = this.treeviews.getClassesTreeviewPrototype(treeview);
        break;

      case "ifaces":
        this.mMainTree.view = this.treeviews.getIfacesTreeviewPrototype(treeview);
        break;

      case "results":
        this.mMainTree.view = this.treeviews.getResultsTreeviewPrototype(treeview);
        break;
    }

    this.mHasMainTreeFilter = false;

    var filter_textbox = document.getElementById("xpcomviewer-maintreefilter-textbox");
    if(filter_textbox) filter_textbox.value = "";

    // Update window's title
    var params = new Array(this.mTreeViewsNames[this.mCurrentTreeView],
                           this.mDisplayedRowsCount);
    document.title = this.mStrBundle.formatStringFromName("xpcomviewerWindowTitle",
                                                          params, 2);
  }; // end showAllTreeitems()


  /**
   * Copy name of selected tree item into clipboard
   */
  this.copyNameOfSelected = function()
  {
    var selected = this.getSelectedTreeItem();
    var res = extensions.xv.utils.copyTextToClipboard(selected.mName);

    if(!res) {
      var msg = this.mStrBundle.GetStringFromName("doCommandError");
      this.statusbar.update(msg, "error");
    }
  }; // end copyNameOfSelected()


  // ========================================================================
  // Method that implements report command


  /**
   * Save report from displayed tree items.
   *
   * @todo Use filepicker filters according to selected report type!
   * @todo Remade this using XPCOM implemantation of CTemplate
   *
   * @param aReportType {string} Supported types: [xml|html|txt]
   */
  this.saveReportAs = function(aReportType)
  {
    var fp_title = this.mStrBundle.GetStringFromName("saveAsDlgLabel");
    var file = extensions.xvFileUtils.pickFile(fp_title, false, [], "Open");

    // Start document
    var doc = null;
    if(aReportType == "xml") {
      doc = cc["@mozilla.org/xml/xml-document;1"].createInstance(ci.nsIDOMDocument);
      doc = doc.implementation.createDocument("", this.mCurrentTreeView, null);
    } else if(aReportType == "html") {
      // @todo Attach any stylesheet to HTML document?
      doc = "<html>\n" +
            "<head>\n" +
            "<title>" + this.mTreeViewsNames[this.mCurrentTreeView] + "</title>\n" +
            "</head>\n" +
            "<body>\n" +
            "<h1>" + this.mTreeViewsNames[this.mCurrentTreeView] + "</h1>\n" +
            "<ul>\n";
    } else {
      doc = this.mTreeViewsNames[this.mCurrentTreeView] + "\n\n";
    }

    // Fill document
    var col1 = this.mMainTree.columns.getPrimaryColumn();
    var col2 = this.mMainTree.columns.getColumnAt(2);

    for(var i=0; i<this.mMainTree.view.rowCount; i++)
    {
      var itemName = this.mMainTree.view.getCellText(i, col1);
      var itemId = this.mMainTree.view.getCellText(i, col2);

      switch(aReportType)
      {
        case "xml":
          var itemElm = doc.createElement("item", "");
          itemElm.setAttribute("name", itemName);
          itemElm.setAttribute("id", itemId);
          doc.documentElement.appendChild(itemElm);
          break;

        case "html":
          doc = doc + "<li>" + itemName + " - " + itemId + "</li>\n";
          break;

        case "txt":
        default:
          doc = doc + this.mTreeViewsItemNames[this.mCurrentTreeView] +
              ": \"" + itemName + "\" \"" + itemId + "\"\n";
          break;
      }
    }

    // Finish document
    if(aReportType == "xml") {
      // @todo Attach any stylesheet to XML document?
    } else if(aReportType == "html") {
      doc = doc + "</body>\n</html>";
    }

    // Save to file
    var res1 = (aReportType == "xml")
        ? extensions.xvFileUtils.writeXmlToFile(file, doc)
        : extensions.xvFileUtils.writeTextToFile(file, doc);

    if(!res1) {
      var msg = this.mStrBundle.GetStringFromName("saveAsFailedMsg");
      this.statusbar.update(msg, "error");
    }
  }; // end saveReportAs(aReportType)


  // ========================================================================
  // Methods that implement LXR related commands


  /**
   * Show selected interface source on LXR
   */
  this.ifaceLXRLookup = function()
  {
    var selected = this.getSelectedTreeItem();
    var lxrserver_uri = this.mPrefs.getCharPref("selectedLXRServer");
    var search_uri = "";
    var res = false;

    switch(selected.mType)
    {
      case "interface":
        search_uri = lxrserver_uri + "seamonkey/find?string=" + selected.mName;
        break;

      case "class":
        search_uri = lxrserver_uri + "seamonkey/search?string=" + selected.mName;
        break;

      case "ifaceConstant":
      case "property":
      case "result":
      default:
        var msg = this.mStrBundle.GetStringFromName("noLXRSearchForGivenType");
        this.statusbar.update(msg, "warning");
        return;
        break;
    }

    var main_content = document.getElementById("mainContentLXR");
    var tabbox = document.getElementById("workspace-tabbox");
    var tabs = document.getElementById("workspace-tabbox-tabs");
    var browser_tab = document.getElementById("xpcomviewer-lxrbrowser-tab");
    var lxr_deck = document.getElementById("");

    main_content.addProgressListener(extensions.xv.mWebProgressListener,
                                     NOTIFY_STATE_DOCUMENT);
    main_content.webNavigation.loadURI(search_uri, 0, null, null, null);

    if(tabs && browser_tab) {
      browser_tab.collapsed = false;
      tabs.collapsed = false;
      tabbox.selectedIndex = 1;
    }
  }; // end ifaceLXRLookup()


  /**
   * Shows LXR search page on browser's pane
   *
   * @param aType {string} Type of search [bugzilla|lxr]
   */
  this.showSearchPage = function(aType)
  {
    var main_content =  (aType == "bugzilla")
        ? document.getElementById("mainContentBugzilla")
        : document.getElementById("mainContentLXR");
    var tabbox = document.getElementById("workspace-tabbox");
    var tabs = document.getElementById("workspace-tabbox-tabs");
    var browser_tab = (aType == "bugzilla")
        ? document.getElementById("xpcomviewer-bugzillabrowser-tab")
        : document.getElementById("xpcomviewer-lxrbrowser-tab");
    var mainmenuitem = (aType == "bugzilla")
        ? document.getElementById("xv-showBugzillaSearchPage-mainmenuitem")
        : document.getElementById("xv-showLxrSearchPage-mainmenuitem");
    var popupmenuitem = (aType == "bugzilla")
        ? document.getElementById("xv-showBugzillaSearchPage-popupmenuitem")
        : document.getElementById("xv-showLxrSearchPage-popupmenuitem");

    if(mainmenuitem.checked && popupmenuitem.checked) { // Hide search page
      tabbox.selectedIndex = 0;
      browser_tab.collapsed = true;
      tabs.collapsed = true;
      main_content.webNavigation.loadURI("about:blank", 0, null, null, null);
    } else { // Show search page
      var uri = this.mPrefs.getCharPref((aType == "bugzilla"
          ? "selectedBugzillaServer"
          : "selectedLXRServer"));
      browser_tab.collapsed = false;
      main_content.addProgressListener(gWebProgressListener, NOTIFY_STATE_DOCUMENT);
      main_content.webNavigation.loadURI(uri + "search", 0, null, null, null);
      tabbox.selectedIndex = 1;
      tabs.collapsed = false;
    }
  }; // end showSearchPage(aType)


  /**
   * Close tab with LXR
   *
   * @param aType {string} Type of search [bugzilla|lxr]
   */
  this.closeSearchTab = function(aType)
  {
    var tabbox = document.getElementById("workspace-tabbox");
    var tabs = document.getElementById("workspace-tabbox-tabs");
    var browser_tab = (aType == "bugzilla")
        ? document.getElementById("xpcomviewer-bugzillabrowser-tab")
        : document.getElementById("xpcomviewer-lxrbrowser-tab");
    var main_content =  (aType == "bugzilla")
        ? document.getElementById("mainContentBugzilla")
        : document.getElementById("mainContentLXR");

    tabbox.selectedIndex = 0;
    main_content.webNavigation.loadURI("about:blank", 0, null, null, null);
    browser_tab.collapsed = true;
    tabs.collapsed = true;
  }; // end closeSearchTab(aType)


  // ========================================================================
  // Method that implements code generation command


  /**
   * Generates interface initialization code
   *
   * @todo Use CTemplates!
   *
   * @param aCodeType {string} Can be these values: [cpp|js|py]
   */
  this.generateCode = function(aCodeType)
  {
    var selected = this.getSelectedTreeItem();
    var idx = this.mMainTree.currentIndex;
    var pri_col = this.mMainTree.columns.getPrimaryColumn();
    var res = false;
    var template = "";

    if(selected.mType == "class" || selected.mType == "ifaceConstant" ||
       selected.mType == "result")
    {
      switch(selected.mType) {
        case "class":
          var type = (aCodeType == "py")
              ? XV_TEMPLATE_CLASS_PY
              : (aCodeType == "cpp") ? XV_TEMPLATE_CLASS_CPP : XV_TEMPLATE_CLASS_JS;

          template = XV_GET_TEMPLATE(type, [selected.mName]);
          break;

        case "ifaceConstant":
          var index = this.mMainTree.view.getParentIndex(idx);
          var name  = this.mMainTree.view.getCellText(index, pri_col);
          var type  = (aCodeType == "py")
              ? XV_TEMPLATE_IFACE_CONST_PY
              : (aCodeType == "cpp") ? XV_TEMPLATE_IFACE_CONST_CPP : XV_TEMPLATE_IFACE_CONST_JS;

          template = XV_GET_TEMPLATE(type, [name, selected.mName]);
          break;

        case "result":
          var type = (aCodeType == "py")
              ? XV_TEMPLATE_RESULT_PY
              : (aCodeType == "cpp") ? XV_TEMPLATE_RESULT_CPP : XV_TEMPLATE_RESULT_JS;

          template = XV_GET_TEMPLATE(type, [selected.mName]);
          break;
      }
    }
    else if(selected.mType == "interface" && this.mCurrentTreeView == "ifaces")
    {
      var type = (aCodeType == "py")
          ? XV_TEMPLATE_IFACE_PY
          : (aCodeType == "cpp") ? XV_TEMPLATE_IFACE_CPP : XV_TEMPLATE_IFACE_JS;

      template = XV_GET_TEMPLATE(type, [selected.mName]);
    }
    else if(selected.mType == "interface" && this.mCurrentTreeView == "classes")
    {
      var index = this.mMainTree.view.getParentIndex(idx);
      var name  = this.mMainTree.view.getCellText(parentClassIdx, pri_col);
      var type = (aCodeType == "py")
          ? XV_TEMPLATE_IFACE_INIT_PY
          : (aCodeType == "cpp") ? XV_TEMPLATE_IFACE_INIT_CPP : XV_TEMPLATE_IFACE_INIT_JS;

      template = XV_GET_TEMPLATE(type, [name, selected.mName]);
    }
    else if(selected.mType == "property")
    {
      var i_index = this.mMainTree.view.getParentIndex(idx);
      var i_name  = this.mMainTree.view.getCellText(i_index, pri_col);
      var c_index = this.mMainTree.view.getParentIndex(parentIfaceIdx);
      var c_name  = this.mMainTree.view.getCellText(c_index, pri_col);
      var type1   = (aCodeType == "py")
          ? XV_TEMPLATE_IFACE_INIT_PY
          : (aCodeType == "cpp") ? XV_TEMPLATE_IFACE_INIT_CPP : XV_TEMPLATE_IFACE_INIT_JS;
      var type2   = null;

      if(selected.mType == "method") {
        type2 = (aCodeType == "py")
            ? XV_TEMPLATE_PROP1_PY
            : (aCodeType == "cpp") ? XV_TEMPLATE_PROP1_CPP : XV_TEMPLATE_PROP1_JS;
      } else {
        type2 = (aCodeType == "py")
            ? XV_TEMPLATE_PROP2_PY
            : (aCodeType == "cpp") ? XV_TEMPLATE_PROP2_CPP : XV_TEMPLATE_PROP2_JS;
      }

      template = XV_GET_TEMPLATE(type1, [c_name, i_name]);
      template = template + XV_GET_TEMPLATE(type2, [selected.mName]);
    }

    res = extensions.xv.utils.copyTextToClipboard(template);
    if(!res) {
      var msg = this.mStrBundle.GetStringFromName("doCommandError");
      this.statusbar.update(msg, "error");
    }
  }; // end generateCode(aCodeType)


  // ========================================================================
  // Methods that implement bookmarks related commands


  /**
   * Show tree items with bookmark attached (apply filter)
   */
  this.showTreeitemsWithBookmark = function()
  {
	  var curview = this.mMainTreeViewsBackup[this.mCurrentTreeView];
	  var newview = new Array();

    var item = null;
    for(item in curview) {
      var name = curview[item].mColumns["nameCol"].mCellText;

      if(this.bookmarks.hasItemBookmark(name))
        newview.push(curview[item]);
    }

	  this.mHasMainTreeFilter = true;

    switch(this.mCurrentTreeView) {
      case "classes":
        this.mMainTree.view = this.treeviews.getClassesTreeviewPrototype(newview);
        break;

      case "ifaces":
        this.mMainTree.view = this.treeviews.getIfacesTreeviewPrototype(newview);
        break;

      case "results":
        this.mMainTree.view = this.treeviews.getResultsTreeviewPrototype(newview);
        break;
    }

    var msg = this.mStrBundle.formatStringFromName("filterAppliedMsg",
                                                   [newview.length],
                                                   1);
    this.statusbar.update(msg, "success");
  }; // end showTreeitemsWithBookmark()


  /**
   * Add bookmark to selected tree item (if no another is attached)
   */
  this.addBookmark = function()
  {
    var selected_item = this.getSelectedTreeItem();

    if(selected_item.mIndex != -1) {
      this.bookmarks.addBookmark(selected_item);
    } else {
      // XXX Localize this!
      this.statusbar.update("No tree item selected!", "error");
    }
  }; // end addBookmark()


  /**
   * Edit bookmark of selected tree item (if has one attached)
   *
   * @param aEvent {object}
   */
  this.editBookmark = function(aEvent)
  {
    var selected_item = this.getSelectedTreeItem();

    if(selected_item.mName != -1)
      this.bookmarks.editBookmark(selected_item.mName);
  }; // end editBookmark()


  /**
   * Remove bookmark of selected tree item (if has one attached)
   *
   * @param aEvent {object}
   */
  this.removeBookmark = function(aEvent)
  {
    var selected_item = this.getSelectedTreeItem();

    if(selected_item.mName != -1)
      this.bookmarks.remove(selected_item.mName);
  }; // end removeBookmark(aEvent)

}).apply(extensions.xv);
