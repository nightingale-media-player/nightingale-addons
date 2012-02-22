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
 * Portions created by the Initial Developer are Copyright (C) 2007-2008
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


/**
 * Main JavaScript object for bookmarks dialog
 *
 * @todo Localize all strings using string bundles!
 */
var gBookmarkDlg =
{
	/**
	 * Action which is performed ["add"|"edit"].
	 * @type String
	 */
	mAction     : "add",

	/**
	 * Edited bookmark
	 * @type xvBookmarkPrototype
	 */
	mEditedItem : null,

  /**
   * Returns pointer to main XPCOMViewer window
   * @type Components.interfaces.nsIDOMWindow
   */
  get mainWindow() {
    var winman = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService();
    winman = winman.QueryInterface(Components.interfaces.nsIWindowMediator);

    return winman.getMostRecentWindow("xpcomviewer");
  }, // end mainWindow()


  /**
   * On dialog load.
   *
   * @todo Update title of bookmark's dialog according to the performed action.
   *
   * @param aEvent {object}
   */
  onLoad : function(aEvent)
  {
		var xv = this.mainWindow.extensions.xv;
		var target = xv.getSelectedTreeItem();

		this.mAction = ((new String(window.location)).indexOf("add") != -1) ? "add" : "edit";

		if(this.mAction == "add") {
			this.mEditedItem = xv.bookmarks.getBookmarkObject("", target.mName, "", "", "", new Array());
      document.title = "Add note";
		}
		else if(this.mAction == "edit") {
			var bookmark = xv.bookmarks.getBookmarkByTarget(target.mName);
			if(!bookmark) {
				var msg = xv.mStrBundle.formatStringFromName("bookmarkEditError", [""], 1);
				xv.statusbar.update(msg, "error");
				window.close();
			}

			this.mEditedItem = bookmark;
      document.title = "Edit note";

      var removeBtn = document.getElementById("remove-button");
      removeBtn.removeAttribute("collapsed");
		}

		document.getElementById("title-textbox").value  = this.mEditedItem.mTitle;
		document.getElementById("target-textbox").value = this.mEditedItem.mTarget;
		document.getElementById("text-textbox").value   = this.mEditedItem.mText;
		this.displayLinks();
  }, // end onLoad(aEvent)


  /**
   * Fired when user pressed "Accept" button.
   *
   * @param aEvent {DOMEvent}
   */
  onAccept : function(aEvent)
  {
		var title_elm  = document.getElementById("title-textbox");
		var target_elm = document.getElementById("target-textbox");
		var text_elm   = document.getElementById("text-textbox");

    if(title_elm.value === "") {
      // XXX Use stringbundles!
      this._showNotification("Boorkmark's title can not be blank.");
      return;
    }

		var xv = this.mainWindow.extensions.xv;

		this.mEditedItem.mTitle      = title_elm.value;
		this.mEditedItem.mTarget     = target_elm.value;
		this.mEditedItem.mText       = text_elm.value;
		this.mEditedItem.mLastEdited = this.mEditedItem.currentTimestamp;

    var res = (this.mAction == "add")
				? xv.bookmarks.add(this.mEditedItem)
				: xv.bookmarks.edit(this.mEditedItem);

    if(!res) {
      // XXX Use stringbundles!!!
      this._showNotification("Bookmark was not saved!");
    } else {
      window.close();
    }
  }, // end onAccept(aEvent)


  /**
   * Fired when user pressed "Cancel" button.
   *
   * @param aEvent {DOMEvent}
   */
  onCancel : function(aEvent)
  {
    window.close();
  }, // end onCancel(aEvent)


  /**
   * Fired when user pressed "Remove note" button.
   *
   * @param aEvent {DOMEvent}
   */
  onRemoveNote : function(aEvent)
  {
		var xv = this.mainWindow.extensions.xv;
    xv.bookmarks.remove(this.mEditedItem.mTarget);
    window.close();
  }, // end onRemoveNote(aEvent)


	/**
	 * Add link to the edited bookmark
	 *
	 * @todo Use normal prompt service!
   * @param aEvent {DOMEvent}
	 */
	onAddLink : function(aEvent)
	{
    var link_elm = document.getElementById("add_link-textbox");
		var link = link_elm.value;

		if(link == "") {
      // XXX Use stringbundles!
      this._showNotification("Can't add blank URL!");
      return;
    }

		this.mEditedItem.addLink(link);

		var cont = document.getElementById("links-container");
		cont.appendChild(this._createLinkElm(link));

    link_elm.value = "";
	}, // onAddLink(aEvent)


  /**
   * Fired when user click on "Go" button of any link
   *
   * @param aUrl {string}
   */
  onGoLink : function(aUrl)
  {
		var xv = this.mainWindow.extensions.xv;
		xv.utils.openLinkInExternalBrowser(aUrl);
  }, // end onGoLink(aUrl)


  /**
   * Fired when user click on "Delete" button of any link
   *
   * @param aUrl {string}
   */
  onRemoveLink : function(aUrl)
  {
    if(aUrl == "") return;

    if(!this.mEditedItem.removeLink(aUrl)) {
      // XXX Use strinbundles!
      this._showNotification("Link was not deleted!");
    }

    this.displayLinks();
  }, // end onRemoveLink(aUrl)


	/**
	 * Display links in the dialog
	 */
	displayLinks : function()
	{
		var cont = document.getElementById("links-container");

    try {
      var link_elm = cont.lastChild;
      while(link_elm ) {
        cont.removeChild(link_elm );
        link_elm = cont.lastChild;
      }
    } catch(e) {
      Components.utils.reportError(e);
    }

		for(var i=0; i<this.mEditedItem.mLinks.length; i++)
			cont.appendChild(this._createLinkElm(this.mEditedItem.mLinks[i]));
	}, // end displayLinks()


	/**
	 * Creates link element
	 *
	 * @param aUrl {string}
	 * @returns DOMElement
	 */
	_createLinkElm : function(aUrl)
  {
    var hbox = document.createElement("hbox");
		hbox.setAttribute("align", "center");

		var link = document.createElement("label");
		link.setAttribute("value", aUrl);
		link.setAttribute("class", "link");
		link.setAttribute("context", "links-context-menu");
		//link.setAttribute("onclick", "gBookmarksDlg.showLink(this.value);");

    var img1 = document.createElement("image");
		img1.setAttribute("value", aUrl);
    img1.setAttribute("src", "chrome://xpcomviewer/skin/icons/link_go.png");
    img1.setAttribute("class", "mini-button");
    img1.setAttribute("tooltiptext", "Open selected URL in your browser");
		img1.setAttribute("onclick", "gBookmarkDlg.onGoLink(this.value);");

    var img2 = document.createElement("image");
		img2.setAttribute("value", aUrl);
    img2.setAttribute("src", "chrome://xpcomviewer/skin/icons/link_delete.png");
    img2.setAttribute("class", "mini-button");
    img2.setAttribute("tooltiptext", "Delete selected URL");
		img2.setAttribute("onclick", "gBookmarkDlg.onRemoveLink(this.value);");

    hbox.appendChild(link);
    hbox.appendChild(img1);
    hbox.appendChild(img2);

		return hbox;
	}, // end _createLinkElm(aUrl)


  /**
   * Show notification box with warning.
   *
   * @param aMessage {string}
   */
  _showNotification : function(aMessage)
  {
    var box = document.getElementById("notifications-box");;
    var ico = "chrome://xpcomviewer/skin/icons/exclamation.png";

    box.appendNotification(aMessage, "no_value", ico, box.PRIORITY_INFO_LOW, []);
  } // end _showNotification(aMessage)

}; // End of gBookmarkDlg
