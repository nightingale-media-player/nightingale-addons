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

const SBDEVTOOLS_DEFERRED_ACTION_PREFBRANCH = "sbdevtools.deferredActions";


/**
 * Helper object for restarting Songbird and 
 * deferring actions until after a restart has
 * occurred. 
 */
SBDevTools.RestartHelper = {

  _counter: 0,
  
  /**
   * Defer a function to be called on next restart.
   * Takes an object with a run method.
   *   
   * Example:
   *   RestartHelper.deferAction({ 
   *        data: 1, 
   *        run: function() { doSomething(this.data); }
   *      });
   */
  deferAction: function(actionObject) {
    // Verify parameter
    if (typeof actionObject != 'object' && typeof actionObject.run != 'function') {
      throw("Invalid parameter: actionObject should be an object with a run method.")
    }
    
    var stringifiedObject = uneval(actionObject);
    
    // Shove action into the prefs
    prefs = Components.classes["@mozilla.org/preferences-service;1"]
                      .getService(Components.interfaces.nsIPrefBranch2);
    
    // Create a key out of the time and a counter to ensure
    // that sorting is always possible and that each call 
    // to deferAction creates a new pref. 
    var key = SBDEVTOOLS_DEFERRED_ACTION_PREFBRANCH + "." + 
                Date.now() + "-" + this._counter++;
                
    prefs.setCharPref(key, stringifiedObject);
  },    
  
  
  /**
   * Process any pending actions added through deferAction.
   * To be called on startup.
   */
  processDeferredActions : function() {
    prefs = Components.classes["@mozilla.org/preferences-service;1"]
                      .getService(Components.interfaces.nsIPrefBranch2);
 
    var actionPrefs = prefs.getChildList(SBDEVTOOLS_DEFERRED_ACTION_PREFBRANCH, { });
    
    if (actionPrefs.length) {
      
      // Sort by key so that actions are executed in the order they were
      // inserted.
      actionPrefs.sort();
 
      var processActions = function() {
        // Execute and then clear each action.
        var prefValue = null;
        for each (var prefName in actionPrefs) {
          prefValue = prefs.getCharPref(prefName);
          var object = eval(prefValue);
          try {
           object.run();
          } catch (e) {
           alert("Developer Tools: An error occurred while restarting Songbird.\n" +
                 "Please report the following message to http://bugzilla.songbirdnest.com:\n\n" +
                 e.toString());
          }
          prefs.clearUserPref(prefName);
        }
      }
      
      // Wait a bit before processing the actions.
      // This was needed to avoid a mac crash where deferring
      // a restart interefered with XBL loading.
      setTimeout(processActions, 750);
    }
  },
  
  
  /**
   * Super hacky songbird restart notification.  Sigh.
   */
  restart : function() {
    var createDataRemote =  new Components.Constructor(
              "@songbirdnest.com/Songbird/DataRemote;1",
              Components.interfaces.sbIDataRemote, "init");

    var restartSignal = createDataRemote("restart.restartnow", null);      
    restartSignal.boolValue = false;
    restartSignal.boolValue = true;
  }
};