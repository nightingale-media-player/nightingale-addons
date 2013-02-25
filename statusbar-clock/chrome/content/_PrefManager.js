// Statusbar Clock extension for Mozilla Firefox
// Copyright (C) 2004-2007  Michael O'Rourke / Cosmic Cat Creations (http://www.cosmicat.com/)
// For licensing terms, please refer to readme.txt in this extension's XPInstall 
// package or its installation directory on your computer.

function TimeStatus_PrefManager() {
	this.domain = "extensions.timestatus";	
	return this;
}
TimeStatus_PrefManager.prototype = {
	getService: function() {
		try { return Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
		} catch(ex) { dump(ex + "\n"); return null; }
	},
	getInterface: function() {
		try { return this.getService().QueryInterface(Components.interfaces.nsIPrefBranchInternal);
		} catch(ex) { dump(ex + "\n"); return null; }
	},
	rootBranch: null,
	getRootBranch: function() {
		if (!this.rootBranch) { this.rootBranch = this.getService().getBranch(null); }
		return this.rootBranch;
	},
	prefTypes: new Array(),
	getPrefType: function(strName) {
		if (strName in this.prefTypes) { return this.prefTypes[strName]; }
		var strType = "Char";
		var iPB = Components.interfaces.nsIPrefBranch;
		switch (this.getRootBranch().getPrefType(strName)) {
			case iPB.PREF_STRING: strType = "Char"; break;
			case iPB.PREF_INT: strType = "Int"; break;
			case iPB.PREF_BOOL: strType = "Bool"; break;
		}
		this.prefTypes[strName] = strType;
		return strType;
	},
	getPref: function(strName) {
		var strType = this.getPrefType(strName);
		var strCode = 'this.getRootBranch().get' + strType + 'Pref("' + strName + '")';
		try { return eval(strCode); } catch(ex) { dump(ex + "\n"); }
		return null;
	},
	setPref: function(strName, varValue) {
		var strType = this.getPrefType(strName);
		if (strType == "Char") { varValue = '"' + varValue + '"'; }
		var strCode = 'this.getRootBranch().set' + strType + 'Pref("' + strName + '", ' + varValue + ')';
		try { eval(strCode); } catch(ex) { dump(ex + "\n"); }
	},
	addPrefObserver: function(strObserver, strDomain) {
		this.observer = strObserver;
		this.obsDomain = (strDomain == "root") ? "" : this.domain;
		try { this.getInterface().addObserver(this.obsDomain, this, false); } catch(ex) { dump(ex + "\n"); }
	},
	removePrefObserver: function() {
		try { this.getInterface().removeObserver(this.obsDomain, this); } catch(ex) { dump(ex + "\n"); }
	},
	observe: function(subject, topic, prefName) {
		try { eval(this.observer + "(subject, topic, prefName);"); } catch(ex) { dump(ex + "\n"); }
	}
}
