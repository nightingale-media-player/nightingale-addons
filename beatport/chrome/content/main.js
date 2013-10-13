"use strict";

// Constants for convience
if (typeof(Cc) == 'undefined')
  var Cc = Components.classes;
if (typeof(Ci) == 'undefined')
  var Ci = Components.interfaces;
if (typeof(Cu) == 'undefined')
  var Cu = Components.utils;
if (typeof(Cr) == 'undefined')
  var Cr = Components.results;

// Imports to help with some common tasks
Cu.import('resource://app/jsmodules/sbProperties.jsm');
//Cu.import('resource://app/jsmodules/sbLibraryUtils.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://app/jsmodules/StringUtils.jsm');

// We need FUEL!
var Application = Cc["@mozilla.org/fuel/application;1"]
                    .getService(Ci.fuelIApplication);

// Make a namespace.
if (typeof Beatport == 'undefined') {
  var Beatport = {};
}

// A few constants
Beatport.NODE_SERVICES = 'SB:Services';
Beatport.SERVICEPANE_NS = 'http://songbirdnest.com/rdf/servicepane#';

Beatport.FIRSTRUN_PREF = "extensions.beatport.firstrun";
Beatport.ADDON_ID = 'beatport@getnightingale.com';

Beatport.ICON = 'chrome://beatport/skin/small-icon.png';

/**
 * UI controller that is loaded into the main player window
 */
Beatport.Controller = {

  /**
   * Called when the window finishes loading
   */
  onLoad: function() {
    // initialization code
    this._initialized = true;
    this._strings = Cc["@mozilla.org/intl/stringbundle;1"]
                       .getService(Ci.nsIStringBundleService)
                       .createBundle("chrome://beatport/locale/overlay.properties");

     /* SEARCH ENGINE */
  	// Get the search engine service
  	this._searchService = Cc["@mozilla.org/browser/search-service;1"]
  		                      .getService(Ci.nsIBrowserSearchService);
    // Get the service pane service
    this._servicePaneService = Cc['@songbirdnest.com/servicepane/service;1']
                                .getService(Ci.sbIServicePaneService);

    // setup observer for uninstall/disable.
    // Will have to move to AddonManager.jsm for Gecko>2
    var observerService = Cc["@mozilla.org/observer-service;1"]
                            .getService(Ci.nsIObserverService);

    observerService.addObserver(Beatport.Observer,'em-action-requested',false);

    // Perform extra actions the first time the extension is run
    if (Application.prefs.get(Beatport.FIRSTRUN_PREF).value) {
      Application.prefs.setValue(Beatport.FIRSTRUN_PREF, false);
      this._firstRunSetup();
    }
    this._addServicePaneNode();
  },

  _servicePaneService:  null,
  _searchService: null,

  _addServicePaneNode: function() {
      var servicesNode = this._servicePaneService.getNode(Beatport.NODE_SERVICES);
      // add the services node if it doesn't exist
      if (!servicesNode) {
        servicesNode = this._servicePaneService.createNode();
        servicesNode.id = Beatport.NODE_SERVICES;
        servicesNode.className = 'folder services';
        servicesNode.editable = false;
        servicesNode.name = SBString("servicesource.services");
        servicesNode.setAttributeNS(Beatport.SERVICEPANE_NS, 'Weight', 1);
        this._servicePaneService.root.appendChild(servicesNode);
      } else {
        servicesNode.hidden = false;
      }

      // create Beatport node
      var myNode = this._servicePaneService.createNode();
      myNode.id = 'NG:Beatport';
      myNode.url = 'http://beatport.com';
      myNode.image = Beatport.ICON;
      myNode.className = 'Beatport Music history';
      myNode.searchtype = "Beatport";
      myNode.name = SBString('storeName',null,this._strings);
      //myNode.stringbundle = STRINGBUNDLE;
      myNode.setAttributeNS(Beatport.SERVICEPANE_NS, "addonID", Beatport.ADDON_ID);
      servicesNode.appendChild(myNode);
  },

  _removeServicePaneNode: function() {
    var servicesNode = this._servicePaneService.getNode(Beatport.NODE_SERVICES);
    servicesNode.removeChild(this._servicePaneService.getNode("NG:Beatport"));
    
    if(!servicesNode.childNodes.hasMoreElements()) {
        this._servicePaneService.root.removeChild(servicesNode);
    }
  },

  _addSearchEngine: function() {
    var engine = this._searchService.getEngineByName("Beatport");

    if(!engine) {
      // code mainly from GeekShadow

      // Register our new search engine
      this._searchService
          .addEngineWithDetails("Beatport",
                                Beatport.ICON,
                                "Beatport",
                                SBString('storeName',null,this._strings),
                                "GET",
                                'http://www.beatport.com/search?query={searchTerms}');
      // Get a reference back to our new search engine we just registered
      engine = this._searchService.getEngineByName("Beatport");

      // Move it to be the first/primary search engine
      //if (searchEngine)
      //      this._searchService.moveEngine(engine, 1);
      // Make it active
      //this._searchService.currentEngine = engine;
    }
  },

  _removeSearchEngine: function() {
    var engine = this._searchService.getEngineByName("Beatport");
    if (engine) {
      this._searchService.removeEngine(engine);
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
    this._addSearchEngine();
  },

  uninstall: function() {
    Application.prefs.setValue(Beatport.FIRSTRUN_PREF, true);

    // remove the search engine
    this._removeSearchEngine();

    // the service pane node is removed automatically.
    // however in case of disable, we want to remove it.
    this._removeServicePaneNode();

    this._initialized = false;

  }
  
  
};

Beatport.Observer = {
  observe: function(subject,topic,data) {
    subject.QueryInterface(Ci.nsIUpdateItem);
    
    // only do actions if the subject is this extension
    if(subject.id==Beatport.ADDON_ID) {
      if((data=='item-uninstalled'||data=='item-disabled')&&Beatport.Controller._initialized) {
        Beatport.Controller.uninstall();
      }
      // if the user changes his mind in runtime, we want to revert our actions
      else if((data=='item-cancel-action'||data=='item-enabled')&&!Beatport.Controller._initialized) {
        Beatport.Controller.onLoad();
      }
    }
  }
};

window.addEventListener("load", function(e) { Beatport.Controller.onLoad(e); }, false);
