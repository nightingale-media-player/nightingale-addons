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


/**
 * ExtensionGenerator
 * 
 * Extends the XUL-Explorer ExtensionGenerator to support
 * Feathers and other Songbird specific extension types.
 */

SBDevTools.ExtensionGenerator = function() {

  this._super();
  
  this.setTemplateFolder("chrome://sbdevtools/locale/templates/");

  // Set target.  Implict, since we know what
  // the code we generate requires.
  // TODO: Extract into consts or test the current version.
  // NOTE: May be modified by the wizard code when particular UI is selected.
  var target = {
    id:"nightingale@getnightingale.com", 
    name:"Nightingale", 
    minVersion:"1.9.0a", 
    maxVersion:"1.12.*"
  };
  this.targets.push(target);

};

SBDevTools.ExtensionGenerator.prototype = {
  __proto__: ExtensionGenerator.prototype,
  _super: ExtensionGenerator,
  
  /**
   * Set the template source to the given chrome URL 
   */
  setTemplateFolder: function(aStringURL) {
    var reg = Components.classes["@mozilla.org/chrome/chrome-registry;1"]
                        .getService(Components.interfaces.nsIChromeRegistry);
    var uri = Components.classes["@mozilla.org/network/io-service;1"]
                        .getService(Components.interfaces.nsIIOService)
                        .newURI(aStringURL, null, null);	                      
    uri = reg.convertChromeURL(uri);
    
    this.templateFolder = uri.QueryInterface(Components.interfaces.nsIFileURL).file;
  },
  
  
  /**
   * Build an install.rdf for the selected components 
   */
  createInstall : function() {
    if (this.rootFolder == null)
      return;

    // Hook up the options dialog if requested
    if (this.ui.indexOf("options") != -1 && (!this.optionsURL || this.optionsURL.length == 0)) {
      this.optionsURL = "chrome://" + this.package + "/content/options.xul";
    }

    var installFolder = this.rootFolder.clone();
    this._processTemplates(installFolder, ["install.rdf.tmpl"], ["install.rdf"]);
  },
  

  /**
   * Build a chrome.manifest for the selected components 
   */
  createManifest : function(fileName) {
    if (this.rootFolder == null)
      return;

    if (fileName == null)
      fileName = "chrome.manifest";

    var installFolder = this.rootFolder.clone();
    this._processTemplates(installFolder, ["chrome.manifest.tmpl"], [fileName]);
  },
  
  
  /**
   * Copy the skin folder from the given chrome package
   * into the target folder
   */
  copySkin: function(packageName) {

    var folder = this._makeFolder(this.rootFolder, "chrome");
    folder.append("skin");
    
    var uri = Components.classes["@mozilla.org/network/io-service;1"]
                        .getService(Components.interfaces.nsIIOService)
                        .newURI("chrome://" + packageName + "/skin/", null, null);
    
    copyChromeFolder(uri, folder);
  },
  
  
  /**
   * Copy over and process the desired content
   */
  createContent : function() {
  
    // For now just copy over purplerain if we are
    // making new feathers
    if (this.ui.indexOf("feathers") != -1) { 
      this.copySkin("purplerain");
      
      // If we are making feathers, don't bother with everything else
      return;
    }    
  
    // Build the folder structure  
    var chromeFolder = this._makeFolder(this.rootFolder, "chrome");
    var contentFolder = this._makeFolder(chromeFolder, "content");
    var localeFolder = this._makeFolder(chromeFolder, "locale");
    var langFolder =  this._makeFolder(localeFolder, "en-US");    
    var skinFolder = this._makeFolder(chromeFolder, "skin");
    var defaultsFolder = this._makeFolder(this.rootFolder, "defaults");
    var prefsFolder = this._makeFolder(defaultsFolder, "preferences");
    
    // Figure out a JS namespace for the sample code
    this.namespace = this._convertPackageToCamelCase(this.package);

    // Process the templated files
    
    // All extensions get a main script entry point
    this._processSimpleTemplates(contentFolder, 
           ["scripts-overlay.xul", 
            "main.js"]);
            
    this._processSimpleTemplates(langFolder, 
           ["overlay.dtd", 
            "overlay.properties"]);
            
    this._processSimpleTemplates(skinFolder, 
           "overlay.css");
           
    this._copyTemplateFile(skinFolder,
           "icon_addon.png");

    // always create the prefs file for the firstrun's sake
    this._processSimpleTemplates(prefsFolder, 
           "prefs.js");

    // Add optional files
    if (this.ui.indexOf("options") != -1) {
      this._processSimpleTemplates(contentFolder, "options.xul");
      this._processSimpleTemplates(langFolder, "options.dtd");
    }
    if (this.ui.indexOf("mainmenu") != -1) {
      this._processSimpleTemplates(contentFolder, "menu-overlay.xul");
    }
    if (this.ui.indexOf("toolbarbutton") != -1) {
      this._processSimpleTemplates(contentFolder, "toolbar-overlay.xul");
      this._copyTemplateFile(skinFolder, "toolbar.png");
    }
    if (this.ui.indexOf("mainmenu") != -1 || this.ui.indexOf("toolbarbutton") != -1) {
      this._processSimpleTemplates(contentFolder, "commands-overlay.xul");
    }
    if (this.ui.indexOf("displaypane") != -1) {
      this._processSimpleTemplates(contentFolder, ["pane.xul", "pane.js"]);
      this._processSimpleTemplates(skinFolder, "pane.css");
      this._copyTemplateFile(skinFolder, "pane-icon.png");
    }
    if (this.ui.indexOf("servicepane") != -1) {
      this._processSimpleTemplates(contentFolder, ["mainview.xul"]);
      this._copyTemplateFile(skinFolder, "node-icon.png");
    }
    if (this.ui.indexOf("mediapage") != -1) {
      this._processSimpleTemplates(contentFolder, ["media-page.xul", "media-page.js"]);
      this._processSimpleTemplates(skinFolder, "media-page.css");
      this._copyTemplateFile(skinFolder, "mediaview-icon.png"); 
    }
  },
  
  
  /**
   * Generate the extension
   */
  run: function() {
    
    // Build install.rdf
    this.createInstall();
    
    // Build chrome.manifest
    this.createManifest();
    
    // Build the sample content
    this.createContent();
  },
  
  
  /**
   * Helper to simplify template processing.
   * For file.ext, assume file.ext.tmpl.
   */
  _processSimpleTemplates: function(destination, targets) {
    if (!(targets instanceof Array)) {
      targets = [ targets ];
    }
    var sources = targets.map(function(file) { return file + ".tmpl"; });
    this._processTemplates(destination, sources, targets);
  },
  
  
  /**
   * Helper to get/create a folder with name
   * below nsILocalFile root
   */
  _makeFolder: function(root, name) {
    var folder = root.clone();
    folder.append(name);
    ensureDirectory(folder);
    return folder;
  },
  
  
  /**
   * Helper to copy a string filename from the template root
   * to the given target nsILocalFile folder
   */
  _copyTemplateFile: function(target, name) {
    if (!target.exists() || !target.isDirectory()) {
      throw new Error("_copyTemplateFile target must be a folder"); 
    }
    
    var source = this.templateFolder.clone();
    source.append(name);
    if (!source.exists()) {
      throw new Error("_copyTemplateFile source not found"); 
    }
    source = source.QueryInterface(Components.interfaces.nsILocalFile);
    source.copyTo(target, source.leafName);
  },
  
  
  /**
   * Given a lower case, hyphen separated package
   * name, come up with a suitable CamelCase JS
   * identifier
   */
  _convertPackageToCamelCase: function(packageName) {

    // Identifiers must not start with a number
    packageName = packageName.replace(/^\d+/,"")
 
    // Upper case the first letter of each segment
    var segments = packageName.split("-");
    segments = segments.map(function(seg) { 
        if (seg.length >= 2) {
          return seg.substr(0,1).toUpperCase() + seg.substr(1);
        } else {
          return seg.toUpperCase();
        } 
    });
    return segments.join("");
  }
  
};


