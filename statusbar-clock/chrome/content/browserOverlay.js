// Statusbar Clock extension for Mozilla Firefox
// Copyright (C) 2004-2007  Michael O'Rourke / Cosmic Cat Creations (http://www.cosmicat.com/)
// For licensing terms, please refer to readme.txt in this extension's XPInstall 
// package or its installation directory on your computer.

function TimeStatus_EntityConstants() {
	this.SECONDS = "s";
	this.MINUTES = "m";
	this.HOURS_12 = "h";
	this.HOURS_12_ZEROED = "hh";
	this.HOURS_24 = "H";
	this.HOURS_24_ZEROED = "HH";
	this.AMPM_LOWER = "am";
	this.AMPM_LOWER_ABBR = "a.m.";
	this.AMPM_UPPER = "AM";
	this.AMPM_UPPER_ABBR = "A.M.";
	this.GMT_OFFSET = "offset";
	this.YEAR = "yyyy";
	this.YEAR_ABBR = "yy";
	this.MONTH = "m";
	this.MONTH_ZEROED = "mm";
	this.DAY = "d";
	this.DAY_ZEROED = "dd";
	this.DAY_ORDINAL = "ddd";
	this.MONTH_NAME = "month";
	this.MONTH_NAME_ABBR = "mth";
	this.WEEKDAY = "weekday";
	this.WEEKDAY_ABBR = "wkd";
	return this;
}

function TimeStatus_TimeFunctions() {
	arrFunctions = new Array();
	arrFunctions[TimeStatus.Entities.SECONDS] = new Function("return TimeStatus.zeroed(TimeStatus.Time.secs)");
	arrFunctions[TimeStatus.Entities.MINUTES] = new Function("return TimeStatus.zeroed(TimeStatus.Time.mins)");
	arrFunctions[TimeStatus.Entities.HOURS_12] = new Function("return TimeStatus.twelveHour(TimeStatus.Time.hours)");
	arrFunctions[TimeStatus.Entities.HOURS_12_ZEROED] = new Function("return TimeStatus.zeroed(TimeStatus.twelveHour(TimeStatus.Time.hours))");
	arrFunctions[TimeStatus.Entities.HOURS_24] = new Function("return TimeStatus.Time.hours");
	arrFunctions[TimeStatus.Entities.HOURS_24_ZEROED] = new Function("return TimeStatus.zeroed(TimeStatus.Time.hours)");
	arrFunctions[TimeStatus.Entities.AMPM_LOWER] = new Function("return (TimeStatus.Time.hours < 12) ? \"am\" : \"pm\"");
	arrFunctions[TimeStatus.Entities.AMPM_LOWER_ABBR] = new Function("return (TimeStatus.Time.hours < 12) ? \"a.m.\" : \"p.m.\"");
	arrFunctions[TimeStatus.Entities.AMPM_UPPER] = new Function("return (TimeStatus.Time.hours < 12) ? \"AM\" : \"PM\"");
	arrFunctions[TimeStatus.Entities.AMPM_UPPER_ABBR] = new Function("return (TimeStatus.Time.hours < 12) ? \"A.M.\" : \"P.M.\"");
	arrFunctions[TimeStatus.Entities.GMT_OFFSET] = new Function("if (TimeStatus.GMToffset == \"\") { TimeStatus.GMToffset = TimeStatus.getGMTOffset(); } return TimeStatus.GMToffset");
	return arrFunctions;
}

function TimeStatus_DateFunctions() {
	arrFunctions = new Array();
	arrFunctions[TimeStatus.Entities.YEAR] = new Function("return TimeStatus.Time.year");
	arrFunctions[TimeStatus.Entities.YEAR_ABBR] = new Function("return TimeStatus.Time.year.toString().substr(2, 2)");
	arrFunctions[TimeStatus.Entities.MONTH] = new Function("return TimeStatus.Time.month");
	arrFunctions[TimeStatus.Entities.MONTH_ZEROED] = new Function("return TimeStatus.zeroed(TimeStatus.Time.month)");
	arrFunctions[TimeStatus.Entities.DAY] = new Function("return TimeStatus.Time.date");
	arrFunctions[TimeStatus.Entities.DAY_ZEROED] = new Function("return TimeStatus.zeroed(TimeStatus.Time.date)");
	arrFunctions[TimeStatus.Entities.DAY_ORDINAL] = new Function("return TimeStatus.arrOrdinals[TimeStatus.Time.date]");
	arrFunctions[TimeStatus.Entities.MONTH_NAME] = new Function("return TimeStatus.arrMonths[TimeStatus.Time.month]");
	arrFunctions[TimeStatus.Entities.MONTH_NAME_ABBR] = new Function("return TimeStatus.arrMonthsAbbr[TimeStatus.Time.month]");
	arrFunctions[TimeStatus.Entities.WEEKDAY] = new Function("return TimeStatus.arrDays[TimeStatus.Time.day]");
	arrFunctions[TimeStatus.Entities.WEEKDAY_ABBR] = new Function("return TimeStatus.arrDaysAbbr[TimeStatus.Time.day]");
	return arrFunctions;
}

var TimeStatus = {
	arrDays: new Array(""),
	arrDaysAbbr: new Array(""),
	arrMonths: new Array(""),
	arrMonthsAbbr: new Array(""),
	arrOrdinals: new Array(""),
	positioned: false,
	
	Time: new Object(),
	Timer: null,
	
	arrTimeEntities: new Array(),
	arrTimeView: new Array(),
	arrTimeViewEntityMap: new Array(),
	arrTimeViewSecondsMap: new Array(),
	strTimeView: "",
	
	arrDateEntities: new Array(),
	arrDateView: new Array(),
	arrDateViewEntityMap: new Array(),
	strDateView: "",
	
	init: function() {
		this.Entities = new TimeStatus_EntityConstants();
		this.TimeFunctions = new TimeStatus_TimeFunctions();
		this.DateFunctions = new TimeStatus_DateFunctions();
		
		var hBundle = document.getElementById("timestatus-bundle");
		this.arrDays = this.arrDays.concat(hBundle.getString("listWeekdays").split(","));
		this.arrDaysAbbr = this.arrDaysAbbr.concat(hBundle.getString("listWeekdaysAbbr").split(","));
		this.arrMonths = this.arrMonths.concat(hBundle.getString("listMonths").split(","));
		this.arrMonthsAbbr = this.arrMonthsAbbr.concat(hBundle.getString("listMonthsAbbr").split(","));
		this.arrOrdinals = this.arrOrdinals.concat(hBundle.getString("listOrdinals").split(","));
		this.hTimeStatus = document.getElementById("statusbar-clock-display");
		this.hToolTip = document.getElementById("timestatus-tooltip-value");
		this.Prefs = new TimeStatus_PrefManager();
		this.setPanelPosition();
		this.setViewFormat();
		this.setDateFormat();
		this.setTimeFormat();
		this.setPrefInterval();
		this.Prefs.addPrefObserver("TimeStatus.prefObserver");
		window.setTimeout(function() { TimeStatus.forceRefresh(); }, 200);
		if (!this.positioned) { window.setTimeout(function() { TimeStatus.setPanelPosition(); }, 1000); }
		window.addEventListener("focus", function() { TimeStatus.forceRefresh(); }, false);
	},
	destruct: function() {
		try { window.clearInterval(this.Timer); } catch(ex) {}
		try { this.Prefs.removeObserver(); } catch(ex) {}
	},
	getPref: function(strName) {
		return this.Prefs.getPref(strName);
	},
	prefObserver: function(subject, topic, prefName) {
		switch (prefName) {
			case "extensions.timestatus.format.view": this.setViewFormat(); this.forceRefresh(); break;
			case "extensions.timestatus.format.date": this.setDateFormat(); this.forceRefresh(); break;
			case "extensions.timestatus.format.time": this.setTimeFormat(); this.forceRefresh(); break;
			case "extensions.timestatus.panel.anchor": this.setPanelPosition(); break;
			case "extensions.timestatus.panel.position": this.setPanelPosition(); break;
			case "extensions.timestatus.interval": this.setPrefInterval(); this.forceRefresh(); break;
		}
	},
	setViewFormat: function() {
		this.prefViewFormat = this.getPref("extensions.timestatus.format.view");
		this.prefDateView = (this.prefViewFormat.indexOf("#date#") != -1) ? true : false;
		this.prefTimeView = (this.prefViewFormat.indexOf("#time#") != -1) ? true : false;
	},
	setDateFormat: function() {
		var prefDateFormat = this.getPref("extensions.timestatus.format.date");
		this.buildDateViewArrays(prefDateFormat);
	},
	setTimeFormat: function() {
		var prefTimeFormat = this.getPref("extensions.timestatus.format.time");
		this.buildTimeViewArrays(prefTimeFormat);
		this.bViewSeconds = (this.arrTimeViewEntityMap[this.Entities.SECONDS]) ? true : false;
	},
	setPrefInterval: function() {
		this.prefInterval = this.getPref("extensions.timestatus.interval");
	},
	forceRefresh: function() {
		window.clearInterval(this.Timer);
		this.GMToffset = "";
		var oDate = new Date();
		this.Time.secs = oDate.getSeconds();
		this.updateTime(oDate);
		this.updateDate(oDate);
		this.updateView();
		this.Timer = window.setInterval(TimeStatusTimer, this.prefInterval);
	},
	smartViewUpdate: function() {
		var oDate = new Date();
		var secs = oDate.getSeconds();
		if (this.Time.secs == secs) { return; }
		this.Time.secs = secs;
		if (secs < 1) {
			this.updateTime(oDate);
			if ((this.Time.mins < 1) && (this.Time.hours < 1)) {
				this.updateDate(oDate);
			}
		} else {
			if (!this.bViewSeconds) { return; }
			this.updateTimeSeconds();
		}
		this.updateView();
	},
	updateTime: function(oDate) {
		this.Time.mins = oDate.getMinutes();
		this.Time.hours = oDate.getHours();
		if (this.prefTimeView) {
			this.strTimeView = this.getUpdatedViewString(this.arrTimeView, this.arrTimeViewEntityMap, this.TimeFunctions);
		}
	},
	updateTimeSeconds: function() {
		if (this.prefTimeView) {
			this.strTimeView = this.getUpdatedViewString(this.arrTimeView, this.arrTimeViewSecondsMap, this.TimeFunctions);
		}
	},
	updateDate: function(oDate) {
		this.Time.day = oDate.getDay() + 1;
		this.Time.date = oDate.getDate();
		this.Time.month = oDate.getMonth() + 1;
		this.Time.year = oDate.getFullYear();
		try {
			this.hToolTip.setAttribute("value", (this.arrDays[this.Time.day] + ", " + this.arrMonths[this.Time.month] + " " + this.Time.date + ", " + this.Time.year));
		} catch(ex) { dump(ex + "\n"); }
		if (this.prefDateView) {
			this.strDateView = this.getUpdatedViewString(this.arrDateView, this.arrDateViewEntityMap, this.DateFunctions);
		}
	},
	updateView: function() {
		var sView = this.prefViewFormat;
		if (this.prefTimeView) { sView = sView.replace(/#time#/g, this.strTimeView); }
		if (this.prefDateView) { sView = sView.replace(/#date#/g, this.strDateView); }
		this.hTimeStatus.label = sView;
	},
	buildTimeViewArrays: function(strFormat) {
		var arrEntities = new Array(this.Entities.GMT_OFFSET,
									this.Entities.AMPM_LOWER,
									this.Entities.AMPM_LOWER_ABBR,
									this.Entities.AMPM_UPPER, 
									this.Entities.AMPM_UPPER_ABBR,
									this.Entities.HOURS_24_ZEROED,
									this.Entities.HOURS_24,
									this.Entities.HOURS_12_ZEROED, 
									this.Entities.HOURS_12,
									this.Entities.MINUTES,
									this.Entities.SECONDS );
		this.arrTimeView = this.buildGenericViewArray(strFormat, arrEntities);
		this.arrTimeViewEntityMap = this.arrTimeView.pop();
		this.arrTimeViewSecondsMap[this.Entities.SECONDS] = this.arrTimeViewEntityMap[this.Entities.SECONDS];
	},
	buildDateViewArrays: function(strFormat) {
		var arrEntities = new Array(this.Entities.MONTH_NAME,
									this.Entities.MONTH_NAME_ABBR,
									this.Entities.WEEKDAY,
									this.Entities.WEEKDAY_ABBR,
									this.Entities.YEAR,
									this.Entities.YEAR_ABBR,
									this.Entities.MONTH_ZEROED,
									this.Entities.MONTH,
									this.Entities.DAY_ORDINAL,
									this.Entities.DAY_ZEROED,
									this.Entities.DAY );
		this.arrDateView = this.buildGenericViewArray(strFormat, arrEntities);
		this.arrDateViewEntityMap = this.arrDateView.pop();
	},
	buildGenericViewArray: function(sTemplate, arrEntities) {
		var arrView = new Array(new Array(sTemplate, false));
		var arrViewEntityMap = new Array();
		var myRegExp, i, j, strEntity, bUseEntity;
		for (i=0; i < arrEntities.length; i++) {
			strEntity = arrEntities[i];
			myRegExp = new RegExp(strEntity, "");
			bUseEntity = false;
			for (j=0; j < arrView.length; j++) {
				if (!arrView[j][1] && myRegExp.test(arrView[j][0])) {
					bUseEntity = true;
					if (RegExp.leftContext != "") {
						if (RegExp.rightContext != "") {
							arrView.splice(j, 1, new Array(RegExp.leftContext, false), new Array(strEntity, true), new Array(RegExp.rightContext, false));
						} else {
							arrView.splice(j, 1, new Array(RegExp.leftContext, false), new Array(strEntity, true));
						}
						j--;
					} else if (RegExp.rightContext != "") {
						arrView.splice(j, 1, new Array(strEntity, true), new Array(RegExp.rightContext, false));
					} else {
						arrView[j][1] = true;
					}
				}
			}
			if (bUseEntity) { arrViewEntityMap[strEntity] = new Array(); }
		}
		for (i=0; i < arrView.length; i++) {
			if (arrView[i][1]) { arrViewEntityMap[arrView[i][0]].push(i); }
			arrView[i] = new String(arrView[i][0]);
		}
		arrView.push(arrViewEntityMap);
		return arrView;
	},
	getUpdatedViewString: function(arrView, arrViewEntityMap, arrFunctionsMap) {
		var i, j, val;
		for (i in arrViewEntityMap) {
			val = arrFunctionsMap[i].call();
			for (j in arrViewEntityMap[i]) {
				arrView[arrViewEntityMap[i][j]] = val;
			}
		}
		return arrView.join("");
	},
	zeroed: function(numIn) {
		return (numIn > 9) ? numIn : ("0" + numIn);
	},
	twelveHour: function(numIn) {
		if ((numIn == 0) || (numIn == 12)) { return "12"; }
		return (numIn % 12);
	},
	getGMTOffset: function() {
		var sTemp;
		var offset = new Date().getTimezoneOffset();
		if (offset == 0) {
			sTemp = "+0000";
		} else {
			var numHours, numMins;
			sTemp = (offset > 0) ? "-" : "+";
			offset = Math.abs(offset);
			numHours = Math.floor(offset / 60);
			numMins = offset - (numHours * 60);
			if (numHours < 10) { numHours = "0" + numHours; }
			if (numMins < 10) { numMins = "0" + numMins; }
			sTemp += String(numHours) + String(numMins);
		}
		return sTemp;
	},
	setPanelPosition: function() {
		try {
			var sPrefAnchor = this.getPref("extensions.timestatus.panel.anchor");
			var sPrefPosition = this.getPref("extensions.timestatus.panel.position");
			var statusbar = document.getElementById("status-bar");
			var arrNodes = statusbar.getElementsByAttribute("id", sPrefAnchor);
			if (arrNodes.length > 0) {
				statusbar.removeChild(this.hTimeStatus);
				if (sPrefPosition == "before") {
					statusbar.insertBefore(this.hTimeStatus, arrNodes[0]);
				} else {
					statusbar.insertBefore(this.hTimeStatus, arrNodes[0].nextSibling);
				}
				this.positioned = true;
			}
		} catch(ex) { dump(ex + "\n"); }
	},
	clickHandler: function(event) {
		if (event.button == 0) {
			this.forceRefresh();
		}
	},
	popupSettings: function() {
		window.timestatusDialog = window.openDialog("chrome://timestatus/content/prefWindow-Display.xul", "_blank",
	 	                                              "chrome,modal,toolbar,centerscreen,resizable=yes,dependent=yes");
	},
	popupPosition: function() {
		window.timestatusDialog = window.openDialog("chrome://timestatus/content/prefWindow-Position.xul", "_blank",
	 	                                              "chrome,modal,toolbar,centerscreen,resizable=yes,dependent=yes");
	}
}

window.addEventListener("load", function() { TimeStatus.init(); }, false);
// window.addEventListener("focus", function() { dump("focus!\n"); TimeStatus.forceRefresh(); }, false);
window.addEventListener("unload", function() { TimeStatus.destruct(); }, false);

function TimeStatusTimer() { //safer out here
	TimeStatus.smartViewUpdate();
}
