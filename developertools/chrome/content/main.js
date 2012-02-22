/*
//
// BEGIN SONGBIRD GPL
// 
// This file is part of the Songbird web player.
//
// Copyright(c) 2005-2012 POTI, Inc.
// http://songbirdnest.com
// 
// This file may be licensed under the terms of of the
// GNU General Public License Version 2 (the "GPL").
// 
// Software distributed under the License is distributed 
// on an "AS IS" basis, WITHOUT WARRANTY OF ANY KIND, either 
// express or implied. See the GPL for the specific language 
// governing rights and limitations.
//
// You should have received a copy of the GPL along with this 
// program. If not, go to http://www.gnu.org/licenses/gpl.html
// or write to the Free Software Foundation, Inc., 
// 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301, USA.
// 
// END SONGBIRD GPL
//
 */


// Make a namespace.
if (typeof SBDevTools == 'undefined') {
  var SBDevTools = {};
}

// Create the controller if it doesn't already exist
if (typeof SBDevTools.Controller == 'undefined') {

  /**
   * Menu functions
   */
  SBDevTools.Controller = {
    
    init: function() {
      SBDevTools.RestartHelper.processDeferredActions();
      
      // Set the show profile manager toggle 
      var profileService = Components.classes["@mozilla.org/toolkit/profile-service;1"]
                                     .getService(Components.interfaces.nsIToolkitProfileService);
      var profManItem = document.getElementById("sbdevtools-profilemanager-menuitem");
      profManItem.setAttribute("checked", !profileService.startWithLastProfile);
      
      // Set the disable xul cache menu item
      if (Application.prefs.has("nglayout.debug.disable_xul_cache")) {
        var xulCacheItem = document.getElementById("sbdevtools-xulcache-menuitem");
        var xulCacheEnabled = Application.prefs.get("nglayout.debug.disable_xul_cache").value == true; 
        xulCacheItem.setAttribute("checked", xulCacheEnabled);
      }
            
      this.setUpBugButton();
    },

    
    /**
     * Force the current window to reload
     */
    refreshUI: function() {
      var feathersManager = Components.classes['@songbirdnest.com/songbird/feathersmanager;1']
                                     .getService(Components.interfaces.sbIFeathersManager);
      var layoutURL = feathersManager.currentLayoutURL;
      var skinName = feathersManager.currentSkinName;
      
      // Hack:  In order for images to reload we need to force
      // the skin pref to notify observers. 
      // The real value will be restored by the feathers manager
      // As soon as it completes the switch.
      
      Application.prefs.setValue("general.skins.selectedSkin", "rubberducky/0.2");
      
      setTimeout(function() {
          feathersManager.switchFeathers(layoutURL, skinName);
        }, 100);
    },
    
    
    /**
     * Open the feathers wizard
     */
    launchFeathersWizard: function() {
      window.openDialog("chrome://sbdevtools/content/feathers-wizard.xul", 
        "feathers-wizard", "centerscreen");
    },
    
    
    /**
     * Open the extension wizard
     */
    launchExtensionWizard: function() {
      window.openDialog("chrome://sbdevtools/content/extension-wizard.xul", 
        "extension-wizard", "centerscreen");
    },
    

    /**
     * Open the js environment
     */
    launchJavascriptShell: function() {
      window.openDialog("chrome://extensiondev/content/jsenv.xul", "_blank", "all=no,width=500,height=400,scrollbars=yes,resizable=yes,dialog=no");
      //window.openDialog("chrome://extensiondev/content/shell.xul", "_blank", "all=no,width=500,height=400,scrollbars=yes,resizable=yes,dialog=no");
    },
    

    /**
     * Open XUL editor
     */
    launchXULEditor: function() {
      window.openDialog("chrome://extensiondev/content/xuledit.xul", "_blank", "all=no,width=500,height=400,scrollbars=yes,resizable=yes,dialog=no");
    },

    linkExistingExtension: function() { 
      alert("This tool installs an unzipped, existing extension for convenience while developing. Please browse to your install.rdf file. If you disable the XUL Cache, you will be able to make many changes without restarting Songbird.");
      var fp = Components.classes["@mozilla.org/filepicker;1"]
                         .createInstance(Components.interfaces.nsIFilePicker);
      fp.appendFilter("Install.rdf","*.rdf");
      fp.init(window, "Select an extension's install.rdf", Components.interfaces.nsIFilePicker.modeOpen);
      var res = fp.show();
      if (res == Components.interfaces.nsIFilePicker.returnOK){
        var ioService = Components.classes["@mozilla.org/network/io-service;1"]
          .getService(Components.interfaces.nsIIOService);
        var fileURL = ioService.newFileURI(fp.file);
        var rdfService = Components.classes["@mozilla.org/rdf/rdf-service;1"].
          getService(Components.interfaces.nsIRDFService);
        Components.utils.import("resource://app/jsmodules/RDFHelper.jsm");
        var root = RDFHelper.help(fileURL.spec, 
                                  "urn:mozilla:install-manifest", 
                                  {"http://www.mozilla.org/2004/em-rdf#": ""});

        if (!root || !root.id) {
          alert("No extension ID was found in this file.");
          return;
        }

        // create the stub file
        var file = Components.classes["@mozilla.org/file/directory_service;1"]
          .getService( Components.interfaces.nsIProperties)
          .get("ProfD", Components.interfaces.nsIFile);
        file.append("extensions");
        file.append(root.id);
        if(file.exists()) {
          alert("Extension file already exists!"); // todo: prompt to overwrite if stub?
          return;
        }
        file.create( Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
        
        var stream = Components.classes["@mozilla.org/network/file-output-stream;1"]
          .createInstance(Components.interfaces.nsIFileOutputStream);
        stream.init(file, 0x02 | 0x08 | 0x20, 0666, 0);
        
        var content = fp.file.parent.path;
        stream.write(content, content.length);
        stream.close();

        alert("Done. The extension will be loaded (if it works!) when you restart Songbird.");
      }
    },


    /**
     * Open the js debugger
     */
    launchJavascriptDebugger: function() {
      loadURI("x-jsd:debugger");
    },
 
    
    /** 
     * Show the XUL Periodic Table, an example page that 
     * demonstrates various XUL elements.
     */
    launchXULTable: function() {
      window.open("chrome://sbdevtools/content/periodic-table/top.xul", 
                  "xulperiodictable", 
                  "chrome,extrachrome,menubar,resizable,width=700,height=550,scrollbars,status,toolbar,titlebar");
    },  
    

    /** 
     * Launch the bugzilla homepage in the browser.
     */
    launchBugzilla: function() {
      var pref = Application.prefs.get("songbird.url.bugzilla");
      if (pref && pref.value) {
        gBrowser.loadURI(pref.value);
      }    
    }, 
    

    /** 
     * Relaunch Songbird
     */
    restart: function() {
      SBDevTools.RestartHelper.restart();
    },   
    
    
    /** 
     * Change the visibility of the bug 
     */
    setUpBugButton: function() {
     
      var toolbar = document.getElementById("control_pane_toolbar");
      if (toolbar && !Application.prefs.get("sbdevtools.bugbutton.addedtodefaults").value) {
        Application.prefs.setValue("sbdevtools.bugbutton.addedtodefaults", true);
        this.updateToolbarItem("control_pane_toolbar", "sbdevtools-bug-toolbarbutton", true);
      } 
    },  
    
    
    /** 
     * Set whether the profile manager should be shown on startup.
     * We can't just restart immediately as nsIAppStartup.eRestart
     * does not reinit the profile :(
     */
    setShowProfileManager: function(show) {
      var profileService = Components.classes["@mozilla.org/toolkit/profile-service;1"]
                                     .getService(Components.interfaces.nsIToolkitProfileService);
                                     
      // In order for the profile manager to show there must be
      // at least 2 profiles
      if (show && profileService.profileCount < 2) {
        profileService.createProfile(null, null, "Testing");
      }
                                     
      profileService.startWithLastProfile = !show;
      profileService.flush();
      
      if (show) {
        alert("The Profile Manager will be shown next time you start Songbird");
      }
    },
    
    
    /** 
     * Enable/disable the XUL cache.  Needed since the cache interferes
     * with RefreshUI
     */
    setXULCacheDisabled: function(disable) {
       Application.prefs.setValue("nglayout.debug.disable_xul_cache",
                                  !!disable); 
    },
    
    
    /**
     * Show/hide a toolbaritem within the given toolbar
     */
    updateToolbarItem: function(toolbarID, itemID, enable) {

      try {
        var toolbar = document.getElementById(toolbarID);
        var curSet = toolbar.currentSet || "";
        
        var hasItem = curSet.indexOf(itemID) != -1;
        
        if (hasItem != enable)
        {
          var set;

          if (hasItem && !enable) {
            set = curSet.replace(itemID, "");
            // Remove comma from end of string if present
            set = set.replace(/,$/,"");            
          } else {
            // Add comma to end of string if not present
            set = curSet.replace(/[^,]$/,",");
            set = toolbar.currentSet + "," + itemID;
          }
          
          toolbar.setAttribute("currentset", set);
          toolbar.currentSet = set;
          document.persist(toolbarID, "currentset");

          // TODO: This is important in FF
          // If you don't do the following call, funny things happen
          //try {
           //BrowserToolboxCustomizeDone(true);
          //}
          //catch (e) { }
        }
      }
      catch(e) { Components.utils.reportError(e.toString()) }      
    } 
  }

  window.addEventListener("load", function() { SBDevTools.Controller.init(); }, false);

}
