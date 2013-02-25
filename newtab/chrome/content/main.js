
// Make a namespace.
if (typeof Newtab == 'undefined') {
  var Newtab = {};
}

/**
 * UI controller that is loaded into the main player window
 */
Newtab.Controller = {

  /**
   * Called when the window finishes loading
   */
  onLoad: function() {

    // initialization code
    this._initialized = true;
    
    // Perform extra actions the first time the extension is run
    if (Application.prefs.get("extensions.newtab.firstrun").value) {
      Application.prefs.setValue("extensions.newtab.firstrun", false);
      this._firstRunSetup();
    }


    // Make a local variable for this controller so that
    // it is easy to access from closures.
    var controller = this;
    
    // Attach doHelloWorld to our helloworld command
    this.newtabCmd = document.getElementById("newtab-helloworld-cmd");
    this.newtabCmd.addEventListener("command", 
         function() { gBrowser.loadOneTab("about:blank"); }, false);

  },
  

  /**
   * Called when the window is about to close
   */
  onUnLoad: function() {
    this._initialized = false;
  },
  

  /**
   * Perform extra setup the first time the extension is run
   */
  _firstRunSetup : function() {
  
      // Add the toolbar button to the default item set of the browser toolbar.
    this._insertToolbarItem("nav-bar", "newtab-toolbarbutton", "home-button");
   
  
  },
  
  

  /**
   * Helper to add a toolbaritem within a given toolbar
   * 
   *   toolbar - the ID of a toolbar element
   *   newItem - the ID of a toolbaritem element within the 
   *            associated toolbarpalette
   *   insertAfter - ID of an toolbaritem after which newItem should appear
   */
  _insertToolbarItem: function(toolbar, newItem, insertAfter) {
    var toolbar = document.getElementById(toolbar);
    var list = toolbar.currentSet || "";
    list = list.split(",");
    
    // If this item is not already in the current set, add it
    if (list.indexOf(newItem) == -1)
    {
      // Add to the array, then recombine
      insertAfter = list.indexOf(insertAfter);
      if (insertAfter == -1) {
        list.push(newItem);
      } else {
        list.splice(insertAfter + 1, 0, newItem);
      }
      list = list.join(",");
      
      toolbar.setAttribute("currentset", list);
      toolbar.currentSet = list;
      document.persist(toolbar.id, "currentset");
    }
  }

  
};

window.addEventListener("load", function(e) { Newtab.Controller.onLoad(e); }, false);
window.addEventListener("unload", function(e) { Newtab.Controller.onUnLoad(e); }, false);
