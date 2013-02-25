const nsIAppShellService    = Components.interfaces.nsIAppShellService;
const nsISupports           = Components.interfaces.nsISupports;
const nsICategoryManager    = Components.interfaces.nsICategoryManager;
const nsIComponentRegistrar = Components.interfaces.nsIComponentRegistrar;
const nsICommandLine        = Components.interfaces.nsICommandLine;
const nsICommandLineHandler = Components.interfaces.nsICommandLineHandler;
const nsIFactory            = Components.interfaces.nsIFactory;
const nsIModule             = Components.interfaces.nsIModule;
const nsIWindowWatcher      = Components.interfaces.nsIWindowWatcher;
if (typeof(Cc) == "undefined")
    var Cc = Components.classes;
if (typeof(Ci) == "undefined")
    var Ci = Components.interfaces;
var gMM = Cc["@songbirdnest.com/Songbird/Mediacore/Manager;1"]
                .getService(Ci.sbIMediacoreManager);

// CHANGEME: to the chrome URI of your extension or application
const CHROME_URI = "chrome://commandline/content/";

// CHANGEME: change the contract id, CID, and category to be unique
// to your application.
const clh_contractID = "@mozilla.org/commandlinehandler/general-startup;1?type=myapp";

// use uuidgen to generate a unique ID
const clh_CID = Components.ID("{2991c315-b871-42cd-b33f-bfee4fcbf682}");

// category names are sorted alphabetically. Typical command-line handlers use a
// category that begins with the letter "m".
const clh_category = "m-myapp";

/**
 * Utility functions
 */

/**
 * Opens a chrome window.
 * @param aChromeURISpec a string specifying the URI of the window to open.
 * @param aArgument an argument to pass to the window (may be null)
 */
function openWindow(aChromeURISpec, aArgument)
{
  var ww = Components.classes["@mozilla.org/embedcomp/window-watcher;1"].
    getService(Components.interfaces.nsIWindowWatcher);
  ww.openWindow(null, aChromeURISpec, "_blank",
                "chrome,menubar,toolbar,status,resizable,dialog=no",
                aArgument);
}
 
/**
 * The XPCOM component that implements nsICommandLineHandler.
 * It also implements nsIFactory to serve as its own singleton factory.
 */
const myAppHandler = {
  /* nsISupports */
  QueryInterface : function clh_QI(iid)
  {
    if (iid.equals(nsICommandLineHandler) ||
        iid.equals(nsIFactory) ||
        iid.equals(nsISupports))
      return this;

    throw Components.results.NS_ERROR_NO_INTERFACE;
  },

  /* nsICommandLineHandler */

  handle : function clh_handle(cmdLine)
  {
    try {
      // CHANGEME: change "viewapp" to your command line flag that takes an argument
      var uristr = cmdLine.handleFlagWithParam("viewapp", false);
      if (uristr) {
        // convert uristr to an nsIURI
        var uri = cmdLine.resolveURI(uristr);
        openWindow(CHROME_URI, uri);
        cmdLine.preventDefault = true;
      }
    }
    catch (e) {
      Components.utils.reportError("incorrect parameter passed to -viewapp on the command line.");
    }

    if (cmdLine.handleFlag("stop", false)) {

gMM.playbackControl.stop();  
      cmdLine.preventDefault = true;
    }
    
    if (cmdLine.handleFlag("play", false)) {

gMM.playbackControl.play();  
      cmdLine.preventDefault = true;
    }
    
    if (cmdLine.handleFlag("pause", false)) {
    
    if (gMM.status.state == 1 << 1) {
gMM.playbackControl.play();     
    }
    
    else {
gMM.playbackControl.pause();  
}
      cmdLine.preventDefault = true;
    }
    
    if (cmdLine.handleFlag("next", false)) {

gMM.sequencer.next();  
      cmdLine.preventDefault = true;
    }
    
    if (cmdLine.handleFlag("previous", false)) {

gMM.sequencer.previous();  
      cmdLine.preventDefault = true;
    }
    
    if (cmdLine.handleFlag("mute", false)) {

    if (gMM.volumeControl.mute == true) {
      gMM.volumeControl.mute = false;
    }
    
    else {
      gMM.volumeControl.mute = true;
    }
      cmdLine.preventDefault = true;
    }
    
    if (cmdLine.handleFlag("volumeup", false)) {
       
       gMM.volumeControl.volume = gMM.volumeControl.volume +0.1;

      cmdLine.preventDefault = true;
    }
    
    if (cmdLine.handleFlag("volumedown", false)) {
       
       gMM.volumeControl.volume = gMM.volumeControl.volume -0.1;

      cmdLine.preventDefault = true;
    }
  },

  // CHANGEME: change the help info as appropriate, but
  // follow the guidelines in nsICommandLineHandler.idl
  // specifically, flag descriptions should start at
  // character 24, and lines should be wrapped at
  // 72 characters with embedded newlines,
  // and finally, the string should end with a newline
  helpInfo : "  -myapp               Open My Application\n" +
             "  -viewapp <uri>       View and edit the URI in My Application,\n" +
             "                       wrapping this description\n",

  /* nsIFactory */

  createInstance : function clh_CI(outer, iid)
  {
    if (outer != null)
      throw Components.results.NS_ERROR_NO_AGGREGATION;

    return this.QueryInterface(iid);
  },

  lockFactory : function clh_lock(lock)
  {
    /* no-op */
  }
};

/**
 * The XPCOM glue that implements nsIModule
 */
const myAppHandlerModule = {
  /* nsISupports */
  QueryInterface : function mod_QI(iid)
  {
    if (iid.equals(nsIModule) ||
        iid.equals(nsISupports))
      return this;

    throw Components.results.NS_ERROR_NO_INTERFACE;
  },

  /* nsIModule */
  getClassObject : function mod_gch(compMgr, cid, iid)
  {
    if (cid.equals(clh_CID))
      return myAppHandler.QueryInterface(iid);

    throw Components.results.NS_ERROR_NOT_REGISTERED;
  },

  registerSelf : function mod_regself(compMgr, fileSpec, location, type)
  {
    compMgr.QueryInterface(nsIComponentRegistrar);

    compMgr.registerFactoryLocation(clh_CID,
                                    "myAppHandler",
                                    clh_contractID,
                                    fileSpec,
                                    location,
                                    type);

    var catMan = Components.classes["@mozilla.org/categorymanager;1"].
      getService(nsICategoryManager);
    catMan.addCategoryEntry("command-line-handler",
                            clh_category,
                            clh_contractID, true, true);
  },

  unregisterSelf : function mod_unreg(compMgr, location, type)
  {
    compMgr.QueryInterface(nsIComponentRegistrar);
    compMgr.unregisterFactoryLocation(clh_CID, location);

    var catMan = Components.classes["@mozilla.org/categorymanager;1"].
      getService(nsICategoryManager);
    catMan.deleteCategoryEntry("command-line-handler", clh_category);
  },

  canUnload : function (compMgr)
  {
    return true;
  }
};

/* The NSGetModule function is the magic entry point that XPCOM uses to find what XPCOM objects
 * this component provides
 */
function NSGetModule(comMgr, fileSpec)
{
  return myAppHandlerModule;
}