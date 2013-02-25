
// Make a namespace.
if (typeof DogmazicSearch == 'undefined') {
  var DogmazicSearch = {};
}

/**
 * UI controller that is loaded into the main player window
 */
DogmazicSearch.Controller = {

  /**
   * Called when the window finishes loading
   */
  onLoad: function() {

    // initialization code
    this._initialized = true;
    this._strings = document.getElementById("dogmazicsearch-strings");

   /* SEARCH ENGINE */
	// Get the search engine service
	var searchSvc = Components.classes["@mozilla.org/browser/search-service;1"]
		              .getService(Components.interfaces.nsIBrowserSearchService);
	// Register our new search engine
	searchSvc.addEngine("chrome://dogmazicsearch/content/dogmazic.xml",
                             Components.interfaces.nsISearchEngine.DATA_XML,
                              "http://www.dogmazic.net/favicon.ico", false);
	// Get a reference back to our new search engine we just registered
	var searchEngine = searchSvc.getEngineByName("Dogmazic");
	// Move it to be the first/primary search engine
	//if (searchEngine)
	//      searchSvc.moveEngine(searchEngine, 1);
	// Make it active
	searchSvc.currentEngine = searchEngine;
    
    // Perform extra actions the first time the extension is run
    if (Application.prefs.get("extensions.dogmazicsearch.firstrun").value) {
      Application.prefs.setValue("extensions.dogmazicsearch.firstrun", false);
      this._firstRunSetup();
    }
    

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
  
  },
  
  
};

window.addEventListener("load", function(e) { DogmazicSearch.Controller.onLoad(e); }, false);
