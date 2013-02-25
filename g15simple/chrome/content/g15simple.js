//Config
var pipe = '/tmp/g15simple.songbird';
var composerPath = '/usr/bin/g15composer';
var pkillPath = '/usr/bin/pkill';
var pgrepPath = '/usr/bin/pgrep';
var pgrepComposer = ['-f', '-x',  composerPath + ' ' + pipe];
var pgrepDaemon = ['-x', 'g15daemon'];
//End of config

var strings = {
	values: [],
	loadDtdInJs: function(file){
		var pattern = /<!ENTITY\s(.*?)[\s]+\"(.*?)\"[\s]*>/g;
		var URL = file;
		var req = new XMLHttpRequest();
		req.overrideMimeType('text/plain');
		req.open('GET', URL, false); 
		req.send(null);
		if(req.status == 0){
			var result;
			while(result = pattern.exec(req.responseText)){
				strings.values[result[1]] = result[2];
			}
		}
	},
	
	getFormattedString: function(name, params){
		var str = strings.values[name];
		for(var i=0; i<params.length; i++){
			str = str.replace("BB"+i+"BB", params[i]);
		}
		return str;
	}
}

strings.loadDtdInJs("chrome://songbird/locale/songbird.dtd");

function makeDots(yPos) {
	yPos += 5;
	
	var dots = '';
	for (var i = 0; i < 3; i++) {
		dots += '\nPS ' + (152 + (3 * i)) + ' ' + yPos + ' 1';
	}

	return dots;
}

var g15adapter = {
	doDraw : function() {
		// Check for g15daemon
		var daemon = runExec(pgrepPath, pgrepDaemon, true);
		if (daemon.exitValue != 0) {
			// g15daemon isn't running, which means that the output below will get stuck, kill g15composer.
			stopComposer();
			return;
		}
		
		this._G15strings = document.getElementById("g15simple-strings");
		this._Appstrings = document.getElementById("songbird-strings");
		var offset = 0;
		var album, albumline, albumdots, artist, artistdots, title, titledots, icon, length;
		album = albumline = albumdots = artist = artistdots = title = titledots = icon = length = '';

	
		if (SBDataGetStringValue('faceplate.playing') == "0" &&  SBDataGetStringValue('faceplate.paused') == "0") {
			title = strings.values['albumart.displaypane.not_playing_message'];
			icon = 'PF 76 35 83 42 1';
		} else {
			albumline = 'DL 0 20 159 20 1\n';
			album = SBDataGetStringValue('metadata.album').replace(/"/, '¨');
			if (album.length < 1) {
				offset = 6;
				albumline = '';
			} else if (album.length > 31) {
				album = album.substring(0, 30);
				albumdots = makeDots(23);
			}

			artist = SBDataGetStringValue('metadata.artist').replace(/"/, '¨');
			if (artist.length > 31) {
				artist = artist.substring(0, 30);
				artistdots = makeDots(offset);
			}
	
			title = SBDataGetStringValue('metadata.title').replace(/"/, '¨');
			if (title.length > 31) {
				title = title.substring(0, 30);
				titledots = makeDots(10 + offset);
			}

			if (SBDataGetStringValue('faceplate.playing') != "1") {
				icon = 'PF 76 35 78 42 1\nPF 81 35 83 42 1'
			} else {
				icon='PO 76 35 8 8 "1100000011110000111111001111111111111111111111001111000011000000"'
			}

			length = SBDataGetStringValue("metadata.length.str");
		}

		checkComposer();

		var artistpos, titlepos, albumpos;
		artistpos = titlepos = albumpos = '1';
		if (artistdots) artistpos = '0';
		if (titledots) titlepos = '0';
		if (albumdots) albumpos = '0';

		var screen =
			'MC 1\n' + 
			'TO 1 ' + offset + ' 1 ' + artistpos + ' "' + artist + '"' + artistdots + '\n' +
			'TO 1 ' + (10 + offset) + ' 1 ' + titlepos + ' "' + title + '"' + titledots + '\n' +
			albumline +
			'TO 1 23 1 ' + albumpos + ' "' + album + '"' + albumdots + '\n' +
			'DL 0 32 159 32 1\n' +
			'TO 1 36 0 0 "'+this._Appstrings.getString("brandShortName")+'"\n' +
			icon + '\n' +
			'TO 1 36 0 2 "' + length + '"\n' +
			'MC 0\n';


		var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
		file.initWithPath(pipe);

		var fos = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
		fos.init(file, 0x02 | 0x20, -1, 0); 

		var os = Components.classes["@mozilla.org/intl/converter-output-stream;1"].createInstance(Components.interfaces.nsIConverterOutputStream);
		os.init(fos, "ISO-8859-1", 0, "?".charCodeAt(0));
		os.writeString(screen);
		os.close();
	},

	onMediacoreEvent : function(ev) {
		switch (ev.type) {
			case Components.interfaces.sbIMediacoreEvent.STREAM_STOP:
			case Components.interfaces.sbIMediacoreEvent.STREAM_START:
			case Components.interfaces.sbIMediacoreEvent.STREAM_PAUSE:
				setTimeout(this.doDraw, 500);
				break;
		}
	}
};

// Starts an executable binary
function runExec(binary, args, foreground) {
	var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
	file.initWithPath(binary);

	var process = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
	process.init(file);

	foreground = (foreground ? true : false);
	process.run(foreground, args, args.length);

	return process;
}

// Check if G15Composer is running
function checkComposer() {
	var process = runExec(pgrepPath, pgrepComposer, true);
	
	if (process.exitValue != 0) {
		startComposer();

		//wait for the pipe to be created
		var i = 0;
		while (!checkPipe() && i < 5000) i++;
	}
}

// Check if the I/O pipe file exists and optionally remove it
function checkPipe(remove) {
	var pipeFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
	pipeFile.initWithPath(pipe);

	if (pipeFile.exists() && remove) {
		pipeFile.remove(false);
	}

	return (pipeFile.exists() && pipeFile.isSpecial());
}

// Initialization and unitialization code below 
function stopComposer(e) {
	// Kill G15Composer and remove the pipe, nsIProcess.kill() doesn't work due to bug 442393.
	runExec(pkillPath, pgrepComposer, true);
	checkPipe(true);
}
window.addEventListener("unload", stopComposer, false);

function startComposer() {
	// Start g15composer
	checkPipe(true);
	runExec(composerPath, [pipe]);
}

try {
	checkComposer();

	// Register the event listener
	var gMM = Components.classes["@songbirdnest.com/Songbird/Mediacore/Manager;1"].getService(Components.interfaces.sbIMediacoreManager);  
	gMM.addListener(g15adapter);

	setTimeout(g15adapter.doDraw, 500);
} catch (e) {
	alert("Error while initializing G15 Simple:\n" + e);
}
