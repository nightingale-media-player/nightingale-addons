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


/**
 * Controller for extension-wizard.xul
 */

window.addEventListener("load", function() { ExtensionWizard.init(); }, false);

const SBDEVTOOLS_EXTENSION_LOADED_URL = "chrome://sbdevtools/content/extension-loaded.html";


var ExtensionWizard = {
  __proto__: AbstractGeneratorWizard, 
  
  init : function() {
    var self = this;
        
    // Setup event handlers
    $("choosefolder").addEventListener("command", function(event) { self.chooseFolder(event) }, false);
    
    // Setup wizards handlers
    $("general").addEventListener("pageadvanced", function(event) { self.validateGeneral(event) }, false);
    $("package-page").addEventListener("pageadvanced", function(event) { self.validatePackage(event) }, false);
    $("contributors").addEventListener("pageadvanced", function(event) { self.validateContributors(event) }, false);
    $("destination").addEventListener("pageshow", function(event) { self.setUpDestination(event) }, false);
    $("destination").addEventListener("pageadvanced", function(event) { self.validateDestination(event) }, false);
    window.addEventListener("wizardfinish", function() { self.finish() }, false);
      
    // Only enable media page UI when running on Songbird 0.5+
    var appInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);
    if (appInfo.version >= "0.5") {
      $('ui-mediapage').checked = true;
      $('ui-mediapage').hidden = false;
    }
  },
  
  validateGeneral : function(event) {
    try {
      this._assertEmpty($("name"), "Name cannot be empty");
      this._assertEmpty($("description"), "Description cannot be empty");
      this._assertEmpty($("version"), "Version cannot be empty");
      
      // Suggest a package based on the name.
      // Turn spaces to dashes, keep only alphanumeric.
      if ($("package").value.length == 0) {
        var name = $("name").value;
        name = name.toLowerCase().replace(/[^a-z0-9\s]+/g, "").replace(/\s+/g, "-");
        $('package').value = name;
      }
    }
    catch (e) {
      event.preventDefault();
    }
  },

  validatePackage : function(event) {
    try {
      this._checkPackage();   
    }
    catch (e) {
      event.preventDefault();
    }
  },
  
  validateContributors : function(event) {
    try {
      this._assertEmpty($("author"), "Author cannot be empty");
    }
    catch (e) {
      event.preventDefault();
    }
  },
  
  encodeForXML: function(value) {
      // Half-assed, but good enough.
      return value.replace(/&/g, "&amp;").replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
                  .replace(/'/g, "&apos;");
  },
  
  setUpDestination : function(event) {
    // Suggest a destination of Desktop/Name/
    if ($("folder").value.length == 0) {
      var file = Components.classes["@mozilla.org/file/directory_service;1"]
                           .getService(Components.interfaces.nsIProperties)
                           .get("Desk", Components.interfaces.nsIFile);
      file.append($("package").value);
      $("folder").value = file.path;
    }
  },  
  
  // Tries to create a plain text file in the extensions folder inside the users
  // directory. Will attempt to create the folder if it does not already exist.
  // This should only be called once you have the extension id and profile 
  // directory
  createTestInstall : function(extensionID, workingFolder) {
    
    // Get the profile directory
    var profileFolder = Components.classes["@mozilla.org/file/directory_service;1"]
                                  .getService(Components.interfaces.nsIProperties)
                                  .get("ProfD", Components.interfaces.nsILocalFile);
  
    var dir = profileFolder.clone();
    dir.append("extensions");
  
    if (!dir.exists()) {
      dir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, IO_PERMS_DIRECTORY);
    }
      
    if (!dir.isDirectory()) {
      dump("Your Profile has extensions as a file, and not as a directory");
      return null;
    }
      
    var file = dir.clone();
  
    file.append(extensionID);
    if (file.exists()) {
      // ok, this exists. hmm, lets prompt the user to see if they want to
      // delete it
      if (confirm("The extension is already installed in Nightingale under " +
                  "this profile. Remove it?") == true) {
        file.remove(true);
      }
      else {
        return null;
      }
      
      // Oh well, we failed 
      if (file.exists()) {
        dump("I wasn't able to remove the extension's directory");
        return null;
      }
    }
    
    file.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, IO_PERMS_FILE);
    stringToFile(workingFolder.path, file);
  
    return file;
  },  
  
  
  /**
   * Cause Nightingale to display a congrats 
   * page on restart
   */
  deferCompletion: function(packageName) {
   
    // On feathers reload we want to display
    // the "congratulations" page 
    SBDevTools.RestartHelper.deferAction( {
      url: SBDEVTOOLS_EXTENSION_LOADED_URL + "?package=" + packageName,
      run: function() {
        var url = this.url;
        setTimeout(function() {
            gBrowser.loadURI(url, null, null, null, '_blank');
        }, 1000);
      }
    });
  },
  
  
  finish : function() {
    try {
      var folder = this.getDestination();
      ensureDirectory(folder);
      
      var extgen = new SBDevTools.ExtensionGenerator();
      extgen.rootFolder = folder;
      extgen.name = this.encodeForXML($("name").value);
      extgen.package = $("package").value;
    
      // Make an ID. Assume developers don't care about this
      var uuidGenerator = Components.classes["@mozilla.org/uuid-generator;1"]
                                  .getService(Components.interfaces.nsIUUIDGenerator);
      extgen.id = uuidGenerator.generateUUID().toString();  
    
    
      extgen.version = $("version").value;
      extgen.description = this.encodeForXML($("description").value);

      extgen.homeURL = $("homeurl").value;
      extgen.iconURL = $("iconurl").value;

      extgen.author = this.encodeForXML($("author").value);

      // Add contributors
      if ($("contributors").value) {
        var contributors = this.encodeForXML($("contributors").value).split("\n");
        for (var contributorIndex=0; contributorIndex<contributors.length; contributorIndex++) {
          var contributor = {};
          contributor.name = contributors[contributorIndex];
        
          extgen.contributors.push(contributor);
        }
      }

  
      // Check desired UI pieces
      if ($("ui-options").checked) {
        extgen.ui.push("options");
      }
      if ($("ui-mainmenu").checked) {
        extgen.ui.push("mainmenu");
      }
      if ($("ui-toolbarbutton").checked) {
        extgen.ui.push("toolbarbutton");
      }
      if ($("ui-displaypane-rightsidebar").checked) {
        extgen.ui.push("displaypane");
        extgen.ui.push("displaypane-rightsidebar");
      }
      if ($("ui-displaypane-contentpane").checked) {
        extgen.ui.push("displaypane");
        extgen.ui.push("displaypane-contentpane");
      }
      if ($("ui-displaypane-servicepane").checked) {
        extgen.ui.push("displaypane");
        extgen.ui.push("displaypane-servicepane");
      }
      if ($("ui-servicepane-radio").checked) {
        extgen.ui.push("servicepane");
        extgen.ui.push("servicepane-radio");
      }
      if ($("ui-servicepane-services").checked) {
        extgen.ui.push("servicepane");
        extgen.ui.push("servicepane-services");
      }
      if ($("ui-mediapage").checked) {
        extgen.ui.push("mediapage");
      }
      
      
      // TODO More integration 
    
      // Generate the extension
      extgen.run();
    
      // Register the working directory as an installed extension
      this.createTestInstall(extgen.id, folder);
    
      // Tada!
      SBDevTools.Utils.revealFolder(folder);
    
      // Cause post install page to load on next restart
      this.deferCompletion(extgen.package);
      
      // Disable the XUL cache, as it will probably cause testing issues
      Application.prefs.setValue("nglayout.debug.disable_xul_cache", true); 

      // Restart if desired
      if ($("restart").checked) {
        SBDevTools.RestartHelper.restart();
      }
    
    } catch (e) {
      alert("Sorry, an error occurred while generating your add-on.  \n" +
            "Please report the following error to https://github.com/nightingale-media-player/nightingale-addons/issues:\n\n" +
            e.toString());
    }
  }
};