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

if (typeof(Cc) == "undefined")
  var Cc = Components.classes;
if (typeof(Ci) == "undefined")
  var Ci = Components.interfaces;

var OverlayCheck = {

  /*
   * Checks if there are overlays that target the default layout's windows
   * (whether main or mini). If that is the case, warn about them and suggest
   * alternate targets.
   */
  check: function check() {
    
    // look for overlays targetting our default layouts:
    var defaultlayouturl = 
      "chrome://songbird/content/feathers/basic-layouts/xul/";
    
    var list = this.getOverlaysForTarget(defaultlayouturl + "mainplayer.xul");
    list = list.concat(this.getOverlaysForTarget(defaultlayouturl + "miniplayer.xul"));
  
    // are there any ?
    if (list.length > 0) {
      
      // get the message strings
      var promptService = Cc["@mozilla.org/embedcomp/prompt-service;1"]
                            .getService(Ci.nsIPromptService);

      var sbs = Cc["@mozilla.org/intl/stringbundle;1"]
                         .getService(Ci.nsIStringBundleService);
      var strings =
        sbs.createBundle("chrome://sbdevtools/locale/overlay-check.properties");

      var msgtitle = strings.GetStringFromName("warningbox.title");
      var rawmsgtext = strings.GetStringFromName("warningbox.message");
      var msgcheck = strings.GetStringFromName("warningbox.nomore");

      // display a message for each overlay
      for each (var overlay in list) {
        // check if we've already been told not to warn about this anymore
        var prefKey = "devtools.nowarn." + overlay;
        if (!Application.prefs.has(prefKey)) {
          // replace %S in the string by the overlay chrome url
          var msgtext = rawmsgtext.replace("%S", overlay);
          var checkBoxObj = {value: false};
          // prompt the user
          promptService.alertCheck(null,
                                   msgtitle,
                                   msgtext,
                                   msgcheck,
                                   checkBoxObj);
          // if the checkbox was clicked, remember not to show this message anymore
          // for this overlay
          if (checkBoxObj.value) {
            Application.prefs.setValue(prefKey, true);
          }
        }                               
      }
    }
  },

  /**
   * Given the string URL for a XUL document, returns all
   * overlays targetting that document as an array of string URLs
   */
  getOverlaysForTarget : function getOverlaysForTarget(targetURL) {
   
    var targetURI = Components.classes["@mozilla.org/network/io-service;1"]
                              .getService(Ci.nsIIOService)
                              .newURI(targetURL, null, null);
     
    var uriList = [];

    // Helper to add string URIs to our array using a given
    // nsISimpleEnumerator of nsIURIs
    var addURIs = function(enumerator) {
      while (enumerator.hasMoreElements()) {
        uriList.push( enumerator.getNext()
                                .QueryInterface(Ci.nsIURI)
                                .spec );
      }
    }

    // Ask the chrome registry for all overlays that should be applied to this identifier
    var chromeRegistry = Components.classes["@mozilla.org/chrome/chrome-registry;1"]
                                    .getService(Ci.nsIXULOverlayProvider);
    addURIs(chromeRegistry.getXULOverlays(targetURI));
    addURIs(chromeRegistry.getStyleOverlays(targetURI));

    return uriList;
  }
}
    
// do this in a timeout just so that we do not block the loading of the main window
setTimeout("OverlayCheck.check()", 3000);
 