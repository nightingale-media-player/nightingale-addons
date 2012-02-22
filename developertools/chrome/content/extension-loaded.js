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
 * Controller for extension-loaded.xul.  
 * Notifies the user that their extension has been activated.
 */

window.addEventListener("load", function() { ExtensionLoadedPage.init(); }, false);

var ExtensionLoadedPage = { 
  
  init : function() {

    var packageName = this.getQueryStringParam("package");
    var location = document.getElementById("location");    
    location.innerHTML = this.getContentPath(packageName);
  },
  
  
  /** 
   * Helper function to extract and unescape a query string param
   * from the given url string
   */
  getQueryStringParam: function(param) {
            
    // Build a regular expression to extract param=string 
    var re = new RegExp("[&\\?]" + param + "=([\\w-_%]*)(&.*)?$");
    var results = re.exec(window.location.href.toString());    
    if (results && results.length >= 2) {
      return unescape(results[1]);
    }
    return "";
  },
  
  
  /** 
   * Figure out where the given package is stored on disk.
   */
  getContentPath: function (packageName) {
    var uri = Components.classes["@mozilla.org/network/io-service;1"]
                        .getService(Components.interfaces.nsIIOService)
                        .newURI("chrome://" + packageName + "/content/", null, null);
    var reg = Components.classes["@mozilla.org/chrome/chrome-registry;1"]
                        .getService(Components.interfaces.nsIChromeRegistry);
    var url = reg.convertChromeURL(uri);
    var file = url.QueryInterface(Components.interfaces.nsIFileURL).file;
    if (!file.exists() || !file.isDirectory()) {
      file = file.parent;
    }    
    return file.path;
  }
  
};