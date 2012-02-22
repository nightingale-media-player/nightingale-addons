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
 * Assorted helper functions
 */
SBDevTools.Utils = {

  revealFolder: function(folder) {
    try {
      // Show the directory containing the file and select the file
      folder.QueryInterface(Ci.nsILocalFile);
      folder.reveal();
    } catch (e) {
      // If reveal fails for some reason (e.g., it's not implemented on unix or
      // the file doesn't exist), try using the parent if we have it.
      let parent = folder.parent.QueryInterface(Ci.nsILocalFile);
      if (!parent)
        return;
      try {
        // "Double click" the parent directory to show where the file should be
        parent.launch();
      } catch (e) {
        // If launch also fails (probably because it's not implemented), let the
        // OS handler try to open the parent
        var parentUri = Cc["@mozilla.org/network/io-service;1"]
                           .getService(Ci.nsIIOService).newFileURI(parent);
 
        var protocolSvc = Cc["@mozilla.org/uriloader/external-protocol-service;1"]
                            .getService(Ci.nsIExternalProtocolService);
        protocolSvc.loadURI(parentUri);
      }
    }
  }

};