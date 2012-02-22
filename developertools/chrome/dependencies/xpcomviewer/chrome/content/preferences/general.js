
/**
 * Templates preferences pane object
 */
var gGeneralPrefpane =
{

  /**
   * Holds instance of nsIPrefBranch
   *
   * @type Object
   */
  _prefs : null,
  get mPrefs() {
    if(this._prefs == null) {
      this._prefs = Components.classes ["@mozilla.org/preferences-service;1"].
          getService(Components.interfaces.nsIPrefService).
          getBranch("extensions.xpcomviewer.");
    }
    return this._prefs;
  },


  // Getters for some UI elements
  get mRadio1() { return document.getElementById("useLastView-radio"); },
  get mRadio2() { return document.getElementById("useCustomView-radio"); },
  get mRadio3() { return document.getElementById("customViewTypeClasses-radio"); },
  get mRadio4() { return document.getElementById("customViewTypeIfaces-radio"); },
  get mRadio5() { return document.getElementById("customViewTypeResults-radio"); },


  /**
   * Fired when general preferences pane is loaded
   */
  onLoad : function()
  {
    var use_last_view = this.mPrefs.getBoolPref("useLastView");

    if(use_last_view) {
			this.mRadio1.setAttribute("selected", "true");
    } else {
      var custom_view = this.mPrefs.getCharPref("customView.type");
			this.mRadio2.setAttribute("selected", "true");

      if(custom_view == "ifaces") {
				this.mRadio4.setAttribute("selected", "true");
      } else if(custom_view == "results") {
				this.mRadio5.setAttribute("selected", "true");
      } else {
        // Default view is classes
				this.mRadio3.setAttribute("selected", "true");
      }
    }

    this.onStartupViewChange((use_last_view) ? "useLastView" : "useCustomView");
  }, // end onLoad()


	/**
	 * Fired when user changed the startup view (clicked on one of two
	 * radio elements)
	 *
	 * @param aValue {string}
	 */
	onStartupViewChange : function(aValue)
	{
		this.mPrefs.setBoolPref("useLastView", (aValue == "useLastView") ? true : false);
		this.mPrefs.setBoolPref("useCustomView", (aValue == "useLastView") ? false : true);

    if(aValue == "useLastView") {
			this.mRadio3.setAttribute("disabled", "true");
			this.mRadio4.setAttribute("disabled", "true");
			this.mRadio5.setAttribute("disabled", "true");
    } else {
      if(this.mRadio3.hasAttribute("disabled")) this.mRadio3.removeAttribute("disabled");
      if(this.mRadio4.hasAttribute("disabled")) this.mRadio4.removeAttribute("disabled");
      if(this.mRadio5.hasAttribute("disabled")) this.mRadio5.removeAttribute("disabled");
    }
	} // end onStartupViewChange(aValue)

}; // End of gGeneralPrefpane
