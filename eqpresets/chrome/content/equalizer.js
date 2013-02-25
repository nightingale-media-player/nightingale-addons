// Make a namespace.
if (typeof EqPresets == 'undefined') {
  var EqPresets = {};
}

EqPresets = {

	onLoad: function() {
		var equalizer = document.getElementById("equalizer");
		equalizer.setAttribute("height","220");
		
	},
	easeInOut: function(minValue,maxValue,totalSteps,actualStep,powr) 
	{ 
		var delta = maxValue - minValue;
		var stepp = minValue+(Math.pow(((1 / totalSteps) * actualStep), powr) * delta); 
		return Math.ceil(stepp * 100) / 100;
	} ,

	presets: function(eqpreset,band0,band1,band2,band3,band4,band5,band6,band7,band8,band9) {
  
      this.mm = 
          Components.classes["@songbirdnest.com/Songbird/Mediacore/Manager;1"]
                    .getService(Components.interfaces.sbIMediacoreManager);

  	var pref = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch2);
	pref.setCharPref("extensions.eqprefs.currentpreset",eqpreset);
	
	var start = new Array();
	var bands = new Array();
	var bandSet = new Array();
	
	bands[0] = band0;
	bands[1] = band1;
	bands[2] = band2;
	bands[3] = band3;
	bands[4] = band4;
	bands[5] = band5;
	bands[6] = band6;
	bands[7] = band7;
	bands[8] = band9;
	bands[9] = band9;
	
	for(i = 0; i < 10; i++)
	{
		bandSet[i] = this.mm.equalizer.getBand(""+i);
		start[i] = parseFloat(bandSet[i].gain);
		bands[i] = parseFloat(bands[i]);
	}
	
	var steps = 30;
	var currStep = 0;

	var anim = window.setInterval(
		function()
		{
			
			for(i = 0; i < 10; i++)
			{
			
				pref.setCharPref("songbird.eq.band." + i.toString(),EqPresets.easeInOut(start[i],bands[i],steps,currStep,1.6));
			}
			
			currStep++;
			
			if(currStep > steps)
			{
				for(i = 0; i < 10; i++)
				{
				
					bandSet[i].gain = bands[i];
					this.mm.equalizer.setBand(bandSet[i])  
					pref.setCharPref("songbird.eq.band." + i.toString(),bands[i]);
				}
				window.clearInterval(anim);
			}
			
		}, 10);


	},
			
	exporteqf: function() {
	
    var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
    file.initWithPath("c:\test.eqf");

    var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
            .createInstance(Components.interfaces.nsIFileOutputStream);
    // 0x02 = PR_WRONLY (write only)
    // 0x08 = PR_CREATE_FILE (create file if the file doesn't exist)
    // 0x10 = PR_APPEND (append to file with each write)
    foStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0);

var data = "Winamp EQ library file v1.1!--Entry1";

    foStream.write(data, data.length);
    foStream.close();
	
	},		
};
window.addEventListener("load", function(e) { EqPresets.onLoad(e); }, false);			