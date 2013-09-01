// Make a namespace.
if (typeof cometeeq == 'undefined') {
  var cometeeq = {};
}

cometeeq = {
	onLoad: function() {
		var equalizer = document.getElementById("equalizer");
		equalizer.setAttribute("height","250");
		//equalizer.setAttribute("width","250");
		//Vérification de l'existence du fichier de préts "cometeeq_presets.xml"
		cometeeq.findOrCreate();
		cometeeq.loadList();
	},
	easeInOut: function(minValue,maxValue,totalSteps,actualStep,powr){ 
		var delta = maxValue - minValue;
		var stepp = minValue+(Math.pow(((1 / totalSteps) * actualStep), powr) * delta); 
		return Math.ceil(stepp * 100) / 100;
	},
	loadList: function(){
		
		// Lecture du fichier de présets
		var path = cometeeq.getFilePathInProfile("cometeeq_presets.xml");
		var xmlDoc = cometeeq.readXMLDocument(path);
		
		//On récupère la liste de presets de l'equalizer
		var liste =	document.getElementById('presets');
		
		//On vide la liste des presets
		while(liste.firstChild)
			liste.removeChild(liste.firstChild);
			
		var rootNode = xmlDoc.documentElement; 
		
		//On récupère le préset de préférence
		var pref = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch2);
		var preset = pref.getCharPref("extensions.cometeeq.currentpreset");	
				
		var presets = rootNode.getElementsByTagName("preset");
		var selectedItem = null;
		//On parcours les presets du fichier de paramétrage
		for (var i = 0, sz = presets.length; i < sz; i++)
		{
			//création d'un nouveau menuitem à insérer
			var opt = document.createElement('menuitem');
			// Création du oncommand en fonction des paramètres band du Presets
			var node = presets[i];
			var value = "cometeeq.presets('"+presets[i].getAttribute("name")+"'";
			var bands = node.getElementsByTagName("band");
			for(var j = 0; j< bands.length; j++){ 
				var element = bands[j]; 
				value += ",'"+element.firstChild.nodeValue+"'";
			}
			value += ")";
			
			//Ajout des attributs à l'élément menuItem
			opt.setAttribute("value", presets[i].getAttribute("name"));
			opt.setAttribute("oncommand", value);
			opt.setAttribute("label", presets[i].getAttribute("name"));
						
			//Preset selectionné
			if(presets[i].getAttribute("name") == preset){
				//opt.setAttribute("selected", true);
				//alert(preset);
				selectedItem = i;
			}
			
			//On ajoute l'item à la liste de presets
			liste.appendChild(opt);
			
		}
		liste.parentNode.selectedIndex = selectedItem;
	
	},
	findOrCreate: function(){
		//Instance du fichier
		var file = Components.classes["@mozilla.org/file/local;1"]
					.createInstance(Components.interfaces.nsILocalFile);
		var path = cometeeq.getFilePathInProfile("cometeeq_presets.xml");
		file.initWithPath(path);		
		
		//Vérification de l'existance du fichier
		if(file.exists()){
			//alert("Le fichier existe");
		}else{
			file.create("text/XML",0777);
			
			//Ecriture du fichier de paramètres
			var presets = cometeeq.getDefaultPresets();
			
			// creation d'un parser DOM,
			var parser = Components.classes["@mozilla.org/xmlextras/domparser;1"]
                         .createInstance(Components.interfaces.nsIDOMParser);
			
			// création du contenu du fichier
			var datas = cometeeq.createXMLString(presets);
			
			//On crée le document DOM
			var DOMDoc = parser.parseFromString(datas,"text/xml");
			
			//On l'enregistre dans ProfD
			cometeeq.saveXMLDocument(DOMDoc,path);
			
			//On choisis le preset flat par défaut
			var pref = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch2);
			pref.setCharPref("extensions.cometeeq.currentpreset","flat");
		}
		
	},
	readXMLDocument: function(aPath) {
		
		// objet representant le fichier à lire
		var file = Components.classes["@mozilla.org/file/local;1"]
					.createInstance(Components.interfaces.nsILocalFile);
		file.initWithPath(aPath);
		// initialisation d'un flux sur le fichier
		var stream = Components.classes["@mozilla.org/network/file-input-stream;1"]
							 .createInstance(Components.interfaces.nsIFileInputStream);
		stream.init(file, -1, -1, Components.interfaces.nsIFileInputStream.CLOSE_ON_EOF);
				
		// creation d'un parser DOM,
		var parser = Components.classes["@mozilla.org/xmlextras/domparser;1"]
							 .createInstance(Components.interfaces.nsIDOMParser);
		// generation d'un DOM à partir du flux
		var doc = parser.parseFromStream(stream, null, file.fileSize, "text/xml");
		parser = null;
		stream = null;
		file = null;
		return doc;
	},
	getFilePathInProfile: function(aRelativePath) {
		// on récupère un objet nsIFile qui represente le repertoire du profil
		// de l'utilisateur
		var file = Components.classes["@mozilla.org/file/directory_service;1"]
						  .getService(Components.interfaces.nsIProperties)
						  .get("ProfD", Components.interfaces.nsIFile);
		// on y ajoute le chemin relatif donné
		var path = aRelativePath.split("/");
		for (var i = 0, sz = path.length; i < sz; i++) {
			if (path[i] != "")
				file.append(path[i]);
		}
		return file.path;
	},
	saveXMLDocument: function(aDomDoc, aPath) {
		// objet representant le fichier à écrire
		var file = Components.classes["@mozilla.org/file/local;1"]
					.createInstance(Components.interfaces.nsILocalFile);
		file.initWithPath(aPath);
		// initialisation d'un flux sur le fichier
		var stream = Components.classes["@mozilla.org/network/file-output-stream;1"]
					.createInstance(Components.interfaces.nsIFileOutputStream);
		stream.init(file, -1, -1, 0);
		
		var serializer = new XMLSerializer();
		serializer.serializeToStream(aDomDoc,stream,"UTF-8");
		
		stream = null;
		file = null;
	},
	getDefaultPresets: function(){
		var presets = new Array();
		presets["classical"] = ["0","0","0","0","0","0","-0.2","-0.2","-0.2","-0.4"];
		presets["club"] = ["0","0","0.15","0.2","0.2","0.2","0.15","0","0","0"];
		presets["dance"] = ["0.5","0.25","0.05","0","0","-0.2","-0.3","-0.3","0","0"];
		presets["flat"] = ["0","0","0","0","0","0","0","0","0","0"];
		presets["fullbass"] = ["0.4","0.4","0.4","0.2","0","-0.2","-0.3","-0.35","-0.4","-0.4"];
		presets["fullbasstreble"] = ["0.2","0.15","0","-0.3","-0.25","0","0.2","0.3","0.4","0.4"];
		presets["fulltreble"] = ["-0.4","-0.4","-0.4","-0.15","0.1","0.4","0.8","0.8","0.8","0.8"];
		presets["headphones"] = ["0.2","0.4","0.2","-0.2","-0.15","0","0.2","0.4","0.6","0.7"];
		presets["largehall"] = ["0.45","0.45","0.2","0.2","0","-0.2","-0.2","-0.2","0","0"];
		presets["live"] = ["-0.2","0","0.15","0.2","0.2","0.2","0.1","0.05","0.05","0"];
		presets["party"] = ["0.25","0.25","0","0","0","0","0","0","0.25","0.25"];
		presets["pop"] = ["-0.15","0.15","0.2","0.25","0.15","-0.15","-0.15","-0.15","-0.1","-0.1"];
		presets["reggae"] = ["0","0","-0.1","-0.2","0","0.2","0.2","0","0","0"];
		presets["rock"] = ["0.3","0.15","-0.2","-0.3","-0.1","0.15","0.3","0.35","0.35","0.35"];
		presets["ska"] = ["-0.1","-0.15","-0.12","-0.05","0.15","0.2","0.3","0.3","0.4","0.3"];
		presets["soft"] = ["0.2","0","-0.1","-0.15","-0.1","0.2","0.3","0.35","0.4","0.5"];
		presets["softrock"] = ["0.2","0.2","0","-0.1","-0.2","-0.3","-0.2","-0.1","0.2","0.4"];
		presets["techno"] = ["0.3","0.25","0","-0.25","-0.2","0","0.3","0.35","0.35","0.3"];
		
		return presets;
	},
	createXMLString: function(presets){
		var datas = "<presets>";
		for(preset in presets){
			datas +="<preset name='"+preset+"'>";
			var tab = presets[preset];
			for(var i = 0, sz = tab.length; i < sz; i++){
				datas +="<band>"+tab[i]+"</band>";
			}
			datas+="</preset>";
		}
		datas+="</presets>";
		return datas;
	},
	presetToXML: function(preset_name,preset){
		var data ="";
		data +="<preset name='"+preset_name+"'>\n";
		for(var i = 0, sz = preset.length; i < sz; i++){
			data +="<band>"+preset[i]+"</band>\n";
		}
		data+="</preset>\n";
		return data;
	},
	presets: function(eqpreset,band0,band1,band2,band3,band4,band5,band6,band7,band8,band9) {
		this.mm = Components.classes["@songbirdnest.com/Songbird/Mediacore/Manager;1"]
                    .getService(Components.interfaces.sbIMediacoreManager);
		//this.mm = Components.classes["@songbirdnest.com/Songbird/Mediacore/Manager;1"].getService(Components.interfaces.sbIMediacoreManager);
        var pref = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch2);
        pref.setCharPref("extensions.cometeeq.currentpreset",eqpreset);
        
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
        bands[8] = band8;
        bands[9] = band9;
        
        for(var i = 0; i < 10; i++)
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
                
                for(var i = 0; i < 10; i++)
                {
                    pref.setCharPref("songbird.eq.band." + i.toString(),cometeeq.easeInOut(start[i],bands[i],steps,currStep,1.6));
                }
                
                currStep++;
                
                if(currStep > steps)
                {
                    for(var i = 0; i < 10; i++)
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
	
	savePreset: function(){
		//récupérer le string bundle
		var strbundle = document.getElementById("messages");
		
		//récupérer xmlDoc
		var path = cometeeq.getFilePathInProfile("cometeeq_presets.xml");
		var xmlDoc = cometeeq.readXMLDocument(path);
		
		//récupérer nom preset
		var preset_name = document.getElementById("currentpreset").value;
		
		//récupérer valeur preset
		var bandSet = new Array();
		this.mm = Components.classes["@songbirdnest.com/Songbird/Mediacore/Manager;1"]
                    .getService(Components.interfaces.sbIMediacoreManager);
		//this.mm = Components.classes["@songbirdnest.com/Songbird/Mediacore/Manager;1"].getService(Components.interfaces.sbIMediacoreManager);
		for(var i = 0; i < 10; i++)
		{
			bandSet[i] = this.mm.equalizer.getBand(""+i).gain;
		}
		
		//créer DOM preset
		if(preset_name != ""){
			var oldy = null;
			var newName=true;
			var rootNode = xmlDoc.documentElement;
			var presets = rootNode.getElementsByTagName("preset");
			for (var i = 0, sz = presets.length; i < sz; i++) {
				if(presets[i].getAttribute("name") == preset_name){
					newName = false;
					oldy = presets[i];
                    break;
                }
			}
			
			if(newName){
				//Insérer preset dans xmlDoc
				var presetDOM = xmlDoc.createElement("preset");
				presetDOM.setAttribute("name",preset_name);
				
				for(var i = 0; i < 10; i++){
					var bandDom = xmlDoc.createElement("band");
					var newtext = xmlDoc.createTextNode(bandSet[i]);
					bandDom.appendChild(newtext);
					presetDOM.appendChild(bandDom);
				}
				var find = false
				for (var i = 0, sz = presets.length; i < sz; i++){
					if(presets[i].getAttribute("name") > preset_name && !find){
						oldy = presets[i];
						find = true;
					}
				}
				rootNode.insertBefore(presetDOM,oldy);
				//rootNode.appendChild(presetDOM);
				
				alert(strbundle.getString("alertPresetSaved"));
				//alert("Preset Saved");
				
				//Sauver fichier
				cometeeq.saveXMLDocument(xmlDoc,path);
				//On change le preset sélectionné
				var pref = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch2);
				pref.setCharPref("extensions.cometeeq.currentpreset",preset_name);
				//Recharger liste
				cometeeq.loadList();
			}
            else{
				//Créer un nouveau préset
				var presetDOM = xmlDoc.createElement("preset");
				presetDOM.setAttribute("name",preset_name);
				
				for(var i = 0; i < 10; i++){
					var bandDom = xmlDoc.createElement("band");
					var newtext = xmlDoc.createTextNode(bandSet[i]);
					bandDom.appendChild(newtext);
					presetDOM.appendChild(bandDom);
				}
				rootNode.replaceChild(presetDOM,oldy);
				
				alert(strbundle.getString("alertPresetModified"));
				//alert("Preset modified");
				
				//Sauver fichier
				cometeeq.saveXMLDocument(xmlDoc,path);
				//On change le preset sélectionné
				var pref = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch2);
				pref.setCharPref("extensions.cometeeq.currentpreset",preset_name);
				//Recharger liste
				cometeeq.loadList();
			}
		}
        else{
			alert(strbundle.getString("alertPresetNameMissing"));
			//alert("Preset Name Missing");
			
		}
	},
	deletePreset: function(){
		//récupérer le string bundle
		var strbundle = document.getElementById("messages");
		
		var preset = document.getElementById("nom_preset").value;
		
		// Lecture du fichier de présets
		var path = cometeeq.getFilePathInProfile("cometeeq_presets.xml");
		var xmlDoc = cometeeq.readXMLDocument(path);
		
		var rootNode = xmlDoc.documentElement;
		var node = null;
		var presets = rootNode.getElementsByTagName("preset");
		//On parcours les presets du fichier de paramétrage
		for (var i = 0, sz = presets.length; i < sz; i++)
			if(presets[i].getAttribute("name") == preset)
					node = presets[i];
					
		if(node != null){
			rootNode.removeChild(node);
			cometeeq.saveXMLDocument(xmlDoc,path);
			cometeeq.loadList();
			document.getElementById("nom_preset").value="";
			alert(strbundle.getString("alertPresetBegin")+" "+preset+" "+strbundle.getString("alertPresetDeletedEnd"));
			//alert("Preset Deleted");
		}else{
			alert(strbundle.getString("alertPresetBegin")+" "+preset+" "+strbundle.getString("alertPresetUndeletedEnd"));
			//alert("Preset undeleted");
		}
	},
	restorePreset: function(){
		if(confirm("Restore presets?")){
        
            // Read current presets
			var path = cometeeq.getFilePathInProfile("cometeeq_presets.xml");
            var xmlDoc = cometeeq.readXMLDocument(path);
            var presets = xmlDoc.documentElement.getElementsByTagName("preset");
				
			var defaultPresets = cometeeq.getDefaultPresets();
            
            var selectedItem = null;
            var currentPresets = [];
            //On parcours les presets du fichier de paramétrage
            for (var i in presets)
            {
                // Création du oncommand en fonction des paramètres band du Presets
                var node = presets[i];
                var name = presets[i].getAttribute("name");
                currentPresets[name] = [];
                
                var bands = node.getElementsByTagName("band");
                for(var j = 0; j< bands.length; j++){ 
                    var element = bands[j]; 
                    currentPresets[name][j] = element.firstChild.nodeValue;
                }
                
            }
            
            // iterate over the currentPresets first, since those are potentially bigger than the defaults
            // restores the default presets
            for( var otherName in currentPresets ) {
                for( var presetName in defaultPresets ) {
                    if( otherName == presetName ) {
                        currentPresets[otherName] = defaultPresets[presetName];
                    }
                }
            }
				
			// creation d'un parser DOM,
			var parser = Components.classes["@mozilla.org/xmlextras/domparser;1"]
						.createInstance(Components.interfaces.nsIDOMParser);
				
			// création du contenu du fichier
			var datas = cometeeq.createXMLString(currentPresets);
			
			//On crée le document DOM
			var DOMDoc = parser.parseFromString(datas,"text/xml");
				
			//On l'enregistre dans ProfD
			cometeeq.saveXMLDocument(DOMDoc,path);
			
			//On recharge la liste
			cometeeq.loadList();
            
            // ease to the restored values if it is the current preset
            var isCurrentPreset = false;
            var preset_name = document.getElementById("currentpreset").value;
            
            for (var preset in presets) {
				if(preset == preset_name){
					isCurrentPreset = true;
                    break;
                }
			}
            
            if( isCurrentPreset ) {
                this.presets(preset_name,presets[preset_name][0],presets[preset_name][1],presets[preset_name][2],presets[preset_name][3],presets[preset_name][4],
                             presets[preset_name][5],presets[preset_name][6],presets[preset_name][7],presets[preset_name][8],presets[preset_name][9]);
            }
		
		}
	},
};

window.addEventListener("load", function(e) { cometeeq.onLoad(e); }, false);
