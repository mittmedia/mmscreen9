var ps = {
    rest: {
	maxConcurrency: 3,
	concurrency: 0,
	callbacks: {},
	numCalls: 0,
	callQueue: [],
	server: "http://csp.picsearch.com/rest"
    },
    media: {}, // Cache for retrieved media
    mediafields: ['mediaid'], // Fields that are always requested, everything any listener wants
    eventListeners: {},
    embedMode: null,
    streamName: null,
    call: function(args) {
	var callcode = 0;
	if (arguments.length > 1) {
	    callcode = ++this.rest.numCalls;
	    this.rest.callbacks[callcode + "success"] = arguments[1];
	    if (typeof arguments[2] == "function") {
		this.rest.callbacks[callcode + "failure"] = arguments[2];
	    }
	}
	this.call2(args, callcode);
    },
    call2: function(args, callcode) {
	var request, head, script;
	var callcode;
	// Avoid sending too many calls at the same time
	if (this.rest.concurrency >= this.rest.maxConcurrency) {
	    this.rest.callQueue.push([args, callcode]);
	    return;
	}
	this.rest.concurrency++;
	// It is impossible for cross-domain reasons to call an external server normally.
	// Therefore, use a trick to insert a <script> tag in the page.
	// The server cooperates by calling the event in the returned script.
	args = "?jsonp=ps.responseHandler&eventParam=" + callcode + "&auth=" + picsearch_ajax_auth + args;
	request = this.rest.server + args;
	head = document.getElementsByTagName("head").item(0);
	script = document.createElement("script");
	script.type = "text/javascript";
	script.id = "ps-json-" + callcode;
	script.src = request;
	head.appendChild(script);
    },
    popCallback: function(callcode, status) {
	var returnEvent;
	returnEvent = this.rest.callbacks[callcode + status];
	delete this.rest.callbacks[callcode + "success"];
	delete this.rest.callbacks[callcode + "failure"];
	return returnEvent;
    },
    responseHandler: function(data, callcode) {
	var returnEvent;
	var qargs;
	var e = document.getElementById("ps-json-" + callcode);
	e.parentNode.removeChild(e);
	ps.rest.concurrency--;
	returnEvent = ps.popCallback(callcode, data.status);
        if (returnEvent) {
	    returnEvent(data);
        }
	if (ps.rest.concurrency < ps.rest.maxConcurrency && ps.rest.callQueue.length > 0) {
	    qargs = ps.rest.callQueue.shift();
	    ps.call2(qargs[0], qargs[1]);
	}
    },
    getOptions: function(mandatory, args) {
	var i, a;
	var options = {};
	var m = {"success": "function", "failure": "function", "options": "object"};
	for (i = 0; i < 3; i++) {
	    for (a in m) {
			if (!options[a] && (typeof args[mandatory + i]) == m[a]) {
				for (var obj in args[mandatory + i]) {
					//if instanceof Array
					options[a] = args[mandatory + i];
				}
			}
	    }
	}
	options.options = options.options || {};
	return options;
    },
    argstringifyPropertyFilter: function(args, label, multichoice) {
	var as = "";
	var p, t, u;
	for (var p = 0; p < args.length; p++) {
	    if (typeof args[p] == "string") {
		as += "&" + label + "=" + encodeURIComponent(p + "=" + args[p]);
	    } else if (typeof args[p] == "boolean") {
		as += "&" + label + "=" + args[p]?"true":"false";
	    } else if (multichoice) {
		t = args[p];
		if (t.length == 0) {
		    as += "&" + label + ".exists=" + encodeURIComponent(p);
		} else {
		    for (u in t) {
			if (typeof t[u] == "string") {
			    as += "&" + label + ".or=" + encodeURIComponent(p + "=" + t[u]);
			} else if (typeof t[u] == "boolean") {
			    as += "&" + label + ".or=" + t[u]?"true":"false";
			} else {
			    as += "&" + label + ".or.substring=" + encodeURIComponent(p + "=" + t[u][0]);
			}
		    }
		}
	    }
	}
	return as;
    },
    argstringify2: function(args, field, label) {
	// Helper function for argstringify
	var as = "";
	var u, v;
	
	if (typeof args === "undefined") {
	  return "";
	}
	
	if (field in args) {
	    u = args[field];
	    if (u instanceof Array) {
		for (var v = 0; v < u.length; v++) {
		    as += "&" + label + "=" + encodeURIComponent(u[v]);
		}
	    } else {
		as += "&" + label + "=" + encodeURIComponent(u);
	    }
	}
	return as;
    },
    argstringify: function(args, fields, mappedfields, parsefilters) {
	// Convert argument object to URI parameters
	// args = object with arguments
	// fields = array of arguments that have the same name
	// mappedfields = array of arguments with mapped names
	// for arguments with array values, each will be included separately
	
	if (typeof args === "undefined") {
		return "";
	}
	
	var as = "";
	var t, u, f;
	for (f = 0; f < fields.length; f++) {
	    as += this.argstringify2(args, fields[f], fields[f]);
	}
	
	// mappedfields ï¿½r objekt, ej array
	for (f in mappedfields) {
	    as += this.argstringify2(args, f, mappedfields[f]);
	}
	if (parsefilters && ("filters" in args)) {
	    // Argstringify filters
	    t = [];
	    u = {"mediaids": "filter.mediaid", "tags": "filter.tag", "mediatype": "filter.mediatype",
		 "association": "filter.association", "categoryid": "filter.categoryid",
		 "maxposted": "filter.maxposted", "minnumratings": "filter.minnumratings",
		 "minposted": "filter.minposted", "reference": "filter.reference",
		 "status": "filter.status", "userid": "filter.userid"};
	    as += this.argstringify(args.filters, t, u);
	    t = {"exclude": true, "max": false, "min": false, "": true};
	    for (f in t) {
			if (typeof args.filters !== "undefined") {
				if ((f + "properties") in args.filters) {
					as += this.argstringifyPropertyFilter(args.filters[f + "properties"], "filter." + f + "property", t[f]);
				}
			}
	    }
	}
	return as;
    },
    arrayUnion: function (arrayArray) {
	// create the union of a number of arrays, ignoring order
	var tarray = {};
	var i, j, value;
	var union = [];
	for (i = 0; i < arrayArray.length; i++) {
		if (typeof arrayArray[i] !== "undefined") {
			for (j = 0; j < arrayArray[i].length; j++) {
			tarray[arrayArray[i][j]] = true;
			}
		}
	}
	for (value in tarray) {
	    union.push(value);
	}
	return union;
    },
    pad: function(str, length, padding) {
        str = "" + str;
	while (str.length < length) {
	    str = padding + str;
	}
	return str;
    },
    parseDuration: function(duration) {
	var r = {milliseconds: duration % 1000,
		 seconds: parseInt(duration/1000) % 60,
		 minutes: parseInt(duration/60000) % 60,
		 hours: parseInt(duration/3600000)};
	r.timestamp = this.pad(r.hours, 2, "0") + ":" + this.pad(r.minutes, 2, "0") + ":" + this.pad(r.seconds, 2, "0");
        return r;
    },
    listMedia: function() {
	var argstring;
	var o = this.getOptions(0, arguments);
	// Extend requested fields as necessary
	o.options.fields = this.arrayUnion([this.mediafields, o.options.fields]);
	// Process arguments
	argstring = "&method=listMedia";
	argstring += this.argstringify(o.options, ["order", "count", "start", "period", "player"], {"fields": "field"}, true);
	this.call(argstring,
		  function(data) {
		      var i;
		      for (i in {'embedMode': 1, 'streamName': 1}) {
			  if (i in data) ps[i] = data[i];
		      }
		      for (i in data.media) {
			  ps.media[data.media[i].mediaid] = data.media[i];
		      }
		      o.success(data);
		  }, o.failure);
    },
    addEventListener: function(event) {
	var o = this.getOptions(1, arguments);
	if (!(event in this.eventListeners)) {
	    this.eventListeners[event] = [];
	}
	this.eventListeners[event].push(o.success);
	if (event == "mediaActivated") {
	    this.mediafields = this.arrayUnion([this.mediafields, o.options.fields]);
	}
    },
    activateMedia: function(mediaid) {
	var handler;
	if (!(mediaid in this.media)) {
	    this.getMediaDetails(mediaid, function (media){ps.activateMedia(mediaid);});
	}
	//for (handler in this.eventListeners.mediaActivated) {
	if (typeof this.eventListeners.mediaActivated !== "undefined") {
  	for (var index = 0; index < this.eventListeners.mediaActivated.length; ++index) {
  	    this.eventListeners.mediaActivated[index](this.media[mediaid]);
  	}
	}
    },
    search: function(text) {
	var o = this.getOptions(1, arguments);
	var argstring = "&method=search&searchText=" + encodeURIComponent(text);
	var fields = ["order", "count", "start", "period", "player"];
	var mappedfields = {"fields": "field", "constraints": "constraint"};
	o.options.fields = this.arrayUnion([this.mediafields, o.options.fields]);
	argstring += this.argstringify(o.options, fields, mappedfields, true);
	this.call(argstring, 
		  function(data) {
		      var i;
		      for (i in {'embedMode': 1, 'streamName': 1}) {
			  if (i in data) ps[i] = data[i];
		      }
		      for (var i = 0; i< data.media.length; i++) {
			  ps.media[data.media[i].mediaid] = data.media[i];
		      }
		      o.success(data);
		  }, o.failure);
    },
    getMediaDetails: function(mediaid) {
	var o = this.getOptions(1, arguments);
	var requestDetails = o.options.refresh;
	var media, i;
	if (!(mediaid in this.media)) {
	    requestDetails = true;
	}
	if (!requestDetails) {
	    media = this.media[mediaid];
	    for (var i = 0; i < o.options.fields.length; i++) {
		if (!(o.options.fields[i] in media)) {
		    requestDetails = true;
		    break;
		}
	    }
	}
	if (!requestDetails) {
	    return o.success(media);
	}
	var largs = {};
	var argstring;
	// Extend requested fields as necessary
	o.options.fields = this.arrayUnion([this.mediafields, o.options.fields]);
	o.options.filters = {mediaids: [mediaid], 'mediatype': o.options.mediatype || 'video'};
	// Process arguments
	argstring = "&method=listMedia";
	argstring += this.argstringify(o.options, ["player"], {"fields": "field"}, true);
	this.call(argstring,
		  function(data) {
		      ps.media[data.media[0].mediaid] = data.media[0];
		      o.success(data.media[0]);
		  }, o.failure);
    },
    listCategories: function() {
	var o = this.getOptions(0, arguments);
	var argstring = "&method=listCategories";
	argstring += this.argstringify(o.options, ["count", "start"], {}, true);
	this.call(argstring, o.success, o.failure);
    },
    assignRating: function(mediaid) {
	var o = this.getOptions(1, arguments);
	var argstring = "&method=assignRating";
	o.options.mediaid = mediaid;
	argstring += this.argstringify(o.options, ["rating", "mediaid"], {}, false);
	this.call(argstring, o.success, o.failure);
    },
    getUploadURL: function() {
	var o = this.getOptions(0, arguments);
	var argstring = "&method=getUploadURL";
	var staticMap = {};
        var fields = ["categoryid", "description", "failure_url", "mediatype",
		      "returnmediaid", "success_url", "title", "userid"];
	o.options.staticFields = o.options.staticFields || {};
	for (var i in fields) {
	    staticMap[fields[i]] = "staticfield." + fields[i];
	}
	for (var field in o.options.staticFields) {
	    if (field.substring(9, 0) == "property.") {
		staticMap[field] = "staticfield." + field;
	    }
	}
	for (var p in {"success_url": 0, "failure_url": 0}) {
	    if (!((p in o.options.staticFields) || (p in o.options.mutableFields))) {
		o.options.staticFields[p] = location;
	    }
	}
	argstring += this.argstringify(o.options.staticFields, [], staticMap, false);
	delete o.options.staticFields;
	argstring += this.argstringify(o.options, ["period"], {mutableFields: "mutablefield"}, false);
	this.call(argstring, o.success, o.failure);
    },
    embedHandler: function(data) {
	ps.embedMode = data.embedMode;
	ps.streamName = data.streamName;
	if ("media" in data) {
	    var mediaid = data.media.mediaid;
	    this.mergeMedia(mediaid, data.media);
	}
	if (!('options' in data)) data['options'] = {};
	ps.embed(data.options);
    },
    mergeMedia: function(mediaid, media) {
	if (!(mediaid in ps.media)) ps.media[mediaid] = {};
	if (!("streams" in ps.media[mediaid])) ps.media[mediaid]["streams"] = {};
	for (var f in {player: 1, playerconfig: 1, image: 1, playimage: 1,
		    playertag: 1, flashembed: 1, throbberimage: 1}) {
	    if (f in media) ps.media[mediaid][f] = media[f];
	}
	if ("streams" in media) {
	    for (var stream in media.streams) {
		ps.media[mediaid].streams[stream] = media.streams[stream];
	    }
	}
    },
    setOpacity: function(element, opacity) {
	if (typeof element == "string") {
	    element = document.getElementById(element);
	}
	if (!element) return;
	element.style.opacity = opacity / 100;
	element.style.filter = "alpha(opacity="+opacity+")";
    },
    embed: function() {
	var o = this.getOptions(0, arguments);
	var embedMode = o.options.embedMode || ps.embedMode;
	var loadResources = true;
	var m;
	if ("loadResources" in o.options) loadResources = o.options.loadResources;
	var hasResources = false;
	var mediaid = o.options.mediaid || null;
	if (mediaid === null) {
	    if (ps.embedMode !== null) {
		o.success({embedMode: ps.embedMode});
		return;
	    }
	} else if (mediaid in ps.media) {
	    m = ps.media[mediaid];
	    if (embedMode == 'flash' && m.flashembed == 'flowplayer') {
		hasResources = ('player' in m) && ('playerconfig' in m);
	    } else if (embedMode == 'flash' && m.flashembed == 'generic') {
		hasResources = 'playertag' in m;
	    } else if (embedMode == 'html5' || embedMode == 'rtsp' || embedMode == 'iphone') {
		hasResources = (ps.streamName !== null) && ("streams" in m) && (ps.streamName in m.streams);
	    }
	    hasResources = hasResources && 'image' in m;
	    hasResources = hasResources && 'playimage' in m;
	}
	var width = o.options.width || 640;
	var height = o.options.height || 360;
	var container;
	var containerId;
	var blindsColor = o.options.blindsColor || null;
	if ('mediaid' in o.options) {
	    if ("containerId" in o.options) {
		containerId = o.options.containerId;
		container = document.getElementById(containerId);
	    } else if (document.getElementById(mediaid)) {
		containerId = mediaid;
		container = document.getElementById(containerId);
	    } else {
		container = document.createElement("div");
		container.id = mediaid;
		container.style.width = width + "px";
		container.style.height = height + "px";
		document.body.appendChild(container);
		containerId = mediaid;
	    }
	    width = o.options.width || container.width || width;
	    height = o.options.height || container.height || height;
	    o.options['width'] = width;
	    o.options['height'] = height;
	    o.options['containerId'] = containerId;
	}
	if (!hasResources && loadResources) {
	    var argstring = "&method=embed";
	    var opts = ["throbber", "containerId", "mediaid", "embedMode", "autoplay",
			"rdfa", "player", "autoload", "width", "height", "imagePadding"];
	    argstring += this.argstringify(o.options, opts, {}, false);
	    this.call(argstring,
		      function (data) {
			  if ("embedMode" in data) {
			      ps.embedMode = data.embedMode;
			      ps.streamName = data.streamName;
			  }
			  if ("media" in data) {
			      ps.mergeMedia(mediaid, data.media);			      
			      o.options["loadResources"] = false;
			      ps.embed(mediaid, o.options, o.success, o.failure);
			  } else if (o.success && (mediaid === null) && (ps.embedMode !== null)) o.success({embedMode: ps.embedMode});
			  else if (o.failure) o.failure();
		      });
	    return;
	}
	if (!hasResources) {
	    if (o.failure) o.failure();
	    return;
	}
	var parent;
	if (embedMode == "html5") {
	    parent = document.createElement("div");
	    parent.id = containerId;
	} else {
	    var padding = o.options.imagePadding || 0;
	    if (embedMode == 'flash') parent = document.createElement("div");
	    else parent = document.createElement("a");
	    parent.id = containerId;
	    parent.style.position = "relative";
	    parent.style.width = width + "px";
	    parent.style.height = height + "px";
	    var paddingh = "";
	    if (padding > 0) paddingh = "padding: " + padding + "px;";
	    var wp = width - (2*padding);
	    var hp = height - (2*padding);
	    var hblinds = "";
	    if (blindsColor) hblinds = "background-color: " + blindsColor + ";";
	    var h = '<div style="position: relative; overflow: hidden; width: '+width+'px; height: '+height+'px;"><div style="height: '+height+'px; text-align: center; vertical-align: middle; width: '+width+'px; display: table-cell;"><img id="'+containerId+'-icon" onmouseover="ps.setOpacity(this, 100)" onmouseout="ps.setOpacity(this, 60)" src="'+m.playimage+'" /></div><div style="position: absolute; top: 0; left: 0; width: '+wp+'px; height: '+hp+'px; z-index: -1; display: table; table-layout: fixed;'+paddingh+'"><div  id="'+containerId+'-splash" style="width: '+wp+'px; height: '+hp+'px; display: table-cell; text-align: center; vertical-align: middle;'+hblinds+'"><img style="max-height: '+hp+'px; max-width: '+wp+'px;" src="'+m.image+'" /></div></div></div>';
	    parent.innerHTML = h;
	}
	container.parentNode.replaceChild(parent, container);
	container = parent;
	var response = {embedMode: ps.embedMode, playerContainer: container};
	if (o.options.throbber == true) {
	    var playerdiv = document.createElement("div");
	    container.id = containerId + "-parent";
	    playerdiv.id = containerId;
	    playerdiv.style.width = width + "px";
	    playerdiv.style.height = height + "px";
	    playerdiv.style.position = "absolute";
	    playerdiv.style.top = "0";
	    playerdiv.style.left = "0";
	    playerdiv.style.zIndex = -2;
	    container.appendChild(playerdiv);
	    container = playerdiv;
	    ps.setOpacity(containerId+"-icon", 60);
	}
	if (embedMode == "flash") {
	    if (o.options.autoload !== false) {
		if (o.options.throbber == true) {
		    //document.getElementById(containerId+"-splash").style.display = "none";
		    var icon = document.getElementById(containerId+"-icon");
		    icon.src = m.throbberimage;
		    container.style.zIndex = 0;
		}
		if (m.flashembed == 'flowplayer') {
		    container.innerHTML = "";
		    var fp = flowplayer(containerId, m.player, m.playerconfig);
		    response["player"] = fp;
		} else {
		    var ddiv = document.createElement("div");
		    ddiv.innerHTML = m.playertag;
		    var object = ddiv.getElementsByTagName("object").item(0);
		    object.height = height;
		    object.width = width;
		    var embed = object.getElementsByTagName("embed").item(0);
		    embed.height = height;
		    embed.width = width;
		    container.innerHTML = "";
		    container.appendChild(ddiv);
		}
	    } else {
		if (o.options.throbber) {
		    var throbber = document.createElement("img");
		    throbber.src = m.throbberimage;
		}
		var icon = document.getElementById(containerId+"-icon");
		icon.onclick = function() {
		    //document.getElementById(containerId+"-splash").style.display = "none";
		    container.style.zIndex = 0;
		    if (o.options.throbber) {
			icon.src = m.throbberimage;
		    }
		    if (m.flashembed == 'flowplayer') {
			container.innerHTML = "";
			flowplayer(containerId, m.player, m.playerconfig);
		    } else {
			var ddiv = document.createElement("div");
			ddiv.innerHTML = m.playertag;
			var object = ddiv.getElementsByTagName("object").item(0);
			object.height = height;
			object.width = width;
			var embed = object.getElementsByTagName("embed").item(0);
			embed.height = height;
			embed.width = width;
			container.innerHTML = "";
			container.appendChild(ddiv);
		    }
		}
	    }
	} else if (embedMode == "html5") {
	    var video = document.createElement("video");
	    video.width = width;
	    video.height = height;
	    video.controls = true;
	    if ("image" in m) video.poster = m["image"];
	    var source = document.createElement("source");
	    source.src = m.streams[ps.streamName];
	    source.type = 'video/mp4; codecs=\"avc1.42E01E, mp4a.40.2\"';
	    video.appendChild(source);
	    container.appendChild(video);
	} else if (embedMode == 'rtsp' || embedMode == 'iphone') {
	    container.href = m.streams[ps.streamName];
	}
	if (o.success) o.success(response);
    },
    print: function(message) {
	if (window.console !== undefined) {
	    console.log(message);
	} else {
	    var oNewP = document.createElement("p");
	    var oText = document.createTextNode(message);
	    oNewP.appendChild(oText);
	    document.body.appendChild(oNewP);
	}
    }

};