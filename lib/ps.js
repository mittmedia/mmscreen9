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
		    options[a] = args[mandatory + i];
		}
	    }
	}
	options.options = options.options || {};
	return options;
    },
    argstringifyPropertyFilter: function(args, label, multichoice) {
	var as = "";
	var p, t, u;
	for (p in args) {
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
	if (field in args) {
	    u = args[field];
	    if (u instanceof Array) {
		for (v in u) {
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
	var as = "";
	var t, u, f;
	for (f in fields) {
	    as += this.argstringify2(args, fields[f], fields[f]);
	}
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
		if ((f + "properties") in args.filters) {
		    as += this.argstringifyPropertyFilter(args.filters[f + "properties"], "filter." + f + "property", t[f]);
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
	for (i in arrayArray) {
	    for (j in arrayArray[i]) {
		tarray[arrayArray[i][j]] = true;
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
	var o = this.getOptions(1, arguments);
	var handler;
	if (!(mediaid in this.media)) {
	    if (o.options.noretry) {
		if (o.failure) o.failure();
		return;
	    }
	    this.getMediaDetails(mediaid, function (media){ps.activateMedia(mediaid, {noretry: true});});
	    return;
	}
	for (handler in this.eventListeners.mediaActivated) {
	    this.eventListeners.mediaActivated[handler](this.media[mediaid]);
	}
	if (o.success) o.success();
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
		      for (i in data.media) {
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
	    for (i in o.options.fields) {
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
    getRelatedMedia: function(mediaid) {
	var o = this.getOptions(1, arguments);
	var argstring = "&method=getRelatedMedia";
	o.options.mediaid = mediaid;
	argstring += this.argstringify(o.options, ["count", "mediaid"], {"fields": "field"}, false);
	this.call(argstring, o.success, o.failure);
    },
    getAccountOptions: function() {
	var o = this.getOptions(0, arguments);
	var argstring = "&method=getAccountOptions";
	argstring += this.argstringify(o.options, [], {"options": "option"}, false);
	this.call(argstring, o.success, o.failure);
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
	    parent.style.position = "relative";
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
	    var h = '<div style="position: relative; overflow: hidden; width: '+width+'px; height: '+height+'px;"><div style="position: absolute; top: 0; left: 0; width: '+wp+'px; height: '+hp+'px;'+paddingh+'"><div  id="'+containerId+'-splash" style="width: '+wp+'px; height: '+hp+'px; display: table-cell; text-align: center; vertical-align: middle;'+hblinds+'"><img style="max-height: '+hp+'px; max-width: '+wp+'px;" src="'+m.image+'" /></div></div><div style="position: absolute; top: 0; left: 0; width: '+width+'px; height: '+height+'px; line-height: '+height+'px; text-align: center; vertical-align: middle; background: transparent;"><a style="border: 1px solid transparent;"><img id="'+containerId+'-icon" onmouseover="ps.setOpacity(this, 100)" onmouseout="ps.setOpacity(this, 60)" src="'+m.playimage+'" style="cursor: pointer; vertical-align: middle;" /></a></div></div>'
	    parent.innerHTML = h;
	}
	container.parentNode.replaceChild(parent, container);
	container = parent;
	var response = {embedMode: ps.embedMode, playerContainer: container};
	if (o.options.throbber == true && embedMode == "flash") {
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
	}
	if (embedMode == "flash") {
	    ps.setOpacity(containerId+"-icon", 60);
	    if (o.options.autoload !== false) {
		if (o.options.throbber == true) {
		    //document.getElementById(containerId+"-splash").style.display = "none";
		    var icon = document.getElementById(containerId+"-icon");
		    icon.src = m.throbberimage;
		    container.style.zIndex = 0;
		}
		if (m.flashembed == 'flowplayer') {
		    container.innerHTML = "";
		    var po = {src: m.player}
		    if ("wmode" in o.options) po["wmode"] = o.options.wmode;
		    var fp = flowplayer(containerId, po, m.playerconfig);
		    response["player"] = fp;
		} else {
		    var ddiv = document.createElement("div");
		    ddiv.innerHTML = m.playertag;
		    var object = ddiv.getElementsByTagName("object").item(0);
		    object.id += "-obj";
		    object.height = height;
		    object.width = width;
		    var embed = object.getElementsByTagName("embed").item(0);
		    if (embed) {
			embed.height = height;
			embed.width = width;
		    }
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
		    if (m.flashembed == "flowplayer") {
			container.innerHTML = "";
			var po = {src: m.player}
			if ("wmode" in o.options) po["wmode"] = o.options.wmode;
			flowplayer(containerId, po, m.playerconfig);
		    } else {
			var ddiv = document.createElement("div");
			ddiv.innerHTML = m.playertag;
			var object = ddiv.getElementsByTagName("object").item(0);
			object.id += "-obj";
			object.height = height;
			object.width = width;
			var embed = object.getElementsByTagName("embed").item(0);
			if (embed) {
			    embed.height = height;
			    embed.width = width;
			}
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

/* 
 * flowplayer.js 3.2.4. The Flowplayer API
 * 
 * Copyright 2009 Flowplayer Oy
 * 
 * This file is part of Flowplayer.
 * 
 * Flowplayer is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * Flowplayer is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with Flowplayer.  If not, see <http://www.gnu.org/licenses/>.
 * 
 * Date: 2010-08-25 12:48:46 +0000 (Wed, 25 Aug 2010)
 * Revision: 551 
 */
(function(){function g(o){console.log("$f.fireEvent",[].slice.call(o))}function k(q){if(!q||typeof q!="object"){return q}var o=new q.constructor();for(var p in q){if(q.hasOwnProperty(p)){o[p]=k(q[p])}}return o}function m(t,q){if(!t){return}var o,p=0,r=t.length;if(r===undefined){for(o in t){if(q.call(t[o],o,t[o])===false){break}}}else{for(var s=t[0];p<r&&q.call(s,p,s)!==false;s=t[++p]){}}return t}function c(o){return document.getElementById(o)}function i(q,p,o){if(typeof p!="object"){return q}if(q&&p){m(p,function(r,s){if(!o||typeof s!="function"){q[r]=s}})}return q}function n(s){var q=s.indexOf(".");if(q!=-1){var p=s.slice(0,q)||"*";var o=s.slice(q+1,s.length);var r=[];m(document.getElementsByTagName(p),function(){if(this.className&&this.className.indexOf(o)!=-1){r.push(this)}});return r}}function f(o){o=o||window.event;if(o.preventDefault){o.stopPropagation();o.preventDefault()}else{o.returnValue=false;o.cancelBubble=true}return false}function j(q,o,p){q[o]=q[o]||[];q[o].push(p)}function e(){return"_"+(""+Math.random()).slice(2,10)}var h=function(t,r,s){var q=this,p={},u={};q.index=r;if(typeof t=="string"){t={url:t}}i(this,t,true);m(("Begin*,Start,Pause*,Resume*,Seek*,Stop*,Finish*,LastSecond,Update,BufferFull,BufferEmpty,BufferStop").split(","),function(){var v="on"+this;if(v.indexOf("*")!=-1){v=v.slice(0,v.length-1);var w="onBefore"+v.slice(2);q[w]=function(x){j(u,w,x);return q}}q[v]=function(x){j(u,v,x);return q};if(r==-1){if(q[w]){s[w]=q[w]}if(q[v]){s[v]=q[v]}}});i(this,{onCuepoint:function(x,w){if(arguments.length==1){p.embedded=[null,x];return q}if(typeof x=="number"){x=[x]}var v=e();p[v]=[x,w];if(s.isLoaded()){s._api().fp_addCuepoints(x,r,v)}return q},update:function(w){i(q,w);if(s.isLoaded()){s._api().fp_updateClip(w,r)}var v=s.getConfig();var x=(r==-1)?v.clip:v.playlist[r];i(x,w,true)},_fireEvent:function(v,y,w,A){if(v=="onLoad"){m(p,function(B,C){if(C[0]){s._api().fp_addCuepoints(C[0],r,B)}});return false}A=A||q;if(v=="onCuepoint"){var z=p[y];if(z){return z[1].call(s,A,w)}}if(y&&"onBeforeBegin,onMetaData,onStart,onUpdate,onResume".indexOf(v)!=-1){i(A,y);if(y.metaData){if(!A.duration){A.duration=y.metaData.duration}else{A.fullDuration=y.metaData.duration}}}var x=true;m(u[v],function(){x=this.call(s,A,y,w)});return x}});if(t.onCuepoint){var o=t.onCuepoint;q.onCuepoint.apply(q,typeof o=="function"?[o]:o);delete t.onCuepoint}m(t,function(v,w){if(typeof w=="function"){j(u,v,w);delete t[v]}});if(r==-1){s.onCuepoint=this.onCuepoint}};var l=function(p,r,q,t){var o=this,s={},u=false;if(t){i(s,t)}m(r,function(v,w){if(typeof w=="function"){s[v]=w;delete r[v]}});i(this,{animate:function(y,z,x){if(!y){return o}if(typeof z=="function"){x=z;z=500}if(typeof y=="string"){var w=y;y={};y[w]=z;z=500}if(x){var v=e();s[v]=x}if(z===undefined){z=500}r=q._api().fp_animate(p,y,z,v);return o},css:function(w,x){if(x!==undefined){var v={};v[w]=x;w=v}r=q._api().fp_css(p,w);i(o,r);return o},show:function(){this.display="block";q._api().fp_showPlugin(p);return o},hide:function(){this.display="none";q._api().fp_hidePlugin(p);return o},toggle:function(){this.display=q._api().fp_togglePlugin(p);return o},fadeTo:function(y,x,w){if(typeof x=="function"){w=x;x=500}if(w){var v=e();s[v]=w}this.display=q._api().fp_fadeTo(p,y,x,v);this.opacity=y;return o},fadeIn:function(w,v){return o.fadeTo(1,w,v)},fadeOut:function(w,v){return o.fadeTo(0,w,v)},getName:function(){return p},getPlayer:function(){return q},_fireEvent:function(w,v,x){if(w=="onUpdate"){var z=q._api().fp_getPlugin(p);if(!z){return}i(o,z);delete o.methods;if(!u){m(z.methods,function(){var B=""+this;o[B]=function(){var C=[].slice.call(arguments);var D=q._api().fp_invoke(p,B,C);return D==="undefined"||D===undefined?o:D}});u=true}}var A=s[w];if(A){var y=A.apply(o,v);if(w.slice(0,1)=="_"){delete s[w]}return y}return o}})};function b(q,G,t){var w=this,v=null,D=false,u,s,F=[],y={},x={},E,r,p,C,o,A;i(w,{id:function(){return E},isLoaded:function(){return(v!==null&&v.fp_play!==undefined&&!D)},getParent:function(){return q},hide:function(H){if(H){q.style.height="0px"}if(w.isLoaded()){v.style.height="0px"}return w},show:function(){q.style.height=A+"px";if(w.isLoaded()){v.style.height=o+"px"}return w},isHidden:function(){return w.isLoaded()&&parseInt(v.style.height,10)===0},load:function(J){if(!w.isLoaded()&&w._fireEvent("onBeforeLoad")!==false){var H=function(){u=q.innerHTML;if(u&&!flashembed.isSupported(G.version)){q.innerHTML=""}if(J){J.cached=true;j(x,"onLoad",J)}flashembed(q,G,{config:t})};var I=0;m(a,function(){this.unload(function(K){if(++I==a.length){H()}})})}return w},unload:function(J){if(this.isFullscreen()&&/WebKit/i.test(navigator.userAgent)){if(J){J(false)}return w}if(u.replace(/\s/g,"")!==""){if(w._fireEvent("onBeforeUnload")===false){if(J){J(false)}return w}D=true;try{if(v){v.fp_close();w._fireEvent("onUnload")}}catch(H){}var I=function(){v=null;q.innerHTML=u;D=false;if(J){J(true)}};setTimeout(I,50)}else{if(J){J(false)}}return w},getClip:function(H){if(H===undefined){H=C}return F[H]},getCommonClip:function(){return s},getPlaylist:function(){return F},getPlugin:function(H){var J=y[H];if(!J&&w.isLoaded()){var I=w._api().fp_getPlugin(H);if(I){J=new l(H,I,w);y[H]=J}}return J},getScreen:function(){return w.getPlugin("screen")},getControls:function(){return w.getPlugin("controls")._fireEvent("onUpdate")},getLogo:function(){try{return w.getPlugin("logo")._fireEvent("onUpdate")}catch(H){}},getPlay:function(){return w.getPlugin("play")._fireEvent("onUpdate")},getConfig:function(H){return H?k(t):t},getFlashParams:function(){return G},loadPlugin:function(K,J,M,L){if(typeof M=="function"){L=M;M={}}var I=L?e():"_";w._api().fp_loadPlugin(K,J,M,I);var H={};H[I]=L;var N=new l(K,null,w,H);y[K]=N;return N},getState:function(){return w.isLoaded()?v.fp_getState():-1},play:function(I,H){var J=function(){if(I!==undefined){w._api().fp_play(I,H)}else{w._api().fp_play()}};if(w.isLoaded()){J()}else{if(D){setTimeout(function(){w.play(I,H)},50)}else{w.load(function(){J()})}}return w},getVersion:function(){var I="flowplayer.js 3.2.4";if(w.isLoaded()){var H=v.fp_getVersion();H.push(I);return H}return I},_api:function(){if(!w.isLoaded()){throw"Flowplayer "+w.id()+" not loaded when calling an API method"}return v},setClip:function(H){w.setPlaylist([H]);return w},getIndex:function(){return p},_swfHeight:function(){return v.clientHeight}});m(("Click*,Load*,Unload*,Keypress*,Volume*,Mute*,Unmute*,PlaylistReplace,ClipAdd,Fullscreen*,FullscreenExit,Error,MouseOver,MouseOut").split(","),function(){var H="on"+this;if(H.indexOf("*")!=-1){H=H.slice(0,H.length-1);var I="onBefore"+H.slice(2);w[I]=function(J){j(x,I,J);return w}}w[H]=function(J){j(x,H,J);return w}});m(("pause,resume,mute,unmute,stop,toggle,seek,getStatus,getVolume,setVolume,getTime,isPaused,isPlaying,startBuffering,stopBuffering,isFullscreen,toggleFullscreen,reset,close,setPlaylist,addClip,playFeed,setKeyboardShortcutsEnabled,isKeyboardShortcutsEnabled").split(","),function(){var H=this;w[H]=function(J,I){if(!w.isLoaded()){return w}var K=null;if(J!==undefined&&I!==undefined){K=v["fp_"+H](J,I)}else{K=(J===undefined)?v["fp_"+H]():v["fp_"+H](J)}return K==="undefined"||K===undefined?w:K}});w._fireEvent=function(Q){if(typeof Q=="string"){Q=[Q]}var R=Q[0],O=Q[1],M=Q[2],L=Q[3],K=0;if(t.debug){g(Q)}if(!w.isLoaded()&&R=="onLoad"&&O=="player"){v=v||c(r);o=w._swfHeight();m(F,function(){this._fireEvent("onLoad")});m(y,function(S,T){T._fireEvent("onUpdate")});s._fireEvent("onLoad")}if(R=="onLoad"&&O!="player"){return}if(R=="onError"){if(typeof O=="string"||(typeof O=="number"&&typeof M=="number")){O=M;M=L}}if(R=="onContextMenu"){m(t.contextMenu[O],function(S,T){T.call(w)});return}if(R=="onPluginEvent"||R=="onBeforePluginEvent"){var H=O.name||O;var I=y[H];if(I){I._fireEvent("onUpdate",O);return I._fireEvent(M,Q.slice(3))}return}if(R=="onPlaylistReplace"){F=[];var N=0;m(O,function(){F.push(new h(this,N++,w))})}if(R=="onClipAdd"){if(O.isInStream){return}O=new h(O,M,w);F.splice(M,0,O);for(K=M+1;K<F.length;K++){F[K].index++}}var P=true;if(typeof O=="number"&&O<F.length){C=O;var J=F[O];if(J){P=J._fireEvent(R,M,L)}if(!J||P!==false){P=s._fireEvent(R,M,L,J)}}m(x[R],function(){P=this.call(w,O,M);if(this.cached){x[R].splice(K,1)}if(P===false){return false}K++});return P};function B(){if($f(q)){$f(q).getParent().innerHTML="";p=$f(q).getIndex();a[p]=w}else{a.push(w);p=a.length-1}A=parseInt(q.style.height,10)||q.clientHeight;E=q.id||"fp"+e();r=G.id||E+"_api";G.id=r;t.playerId=E;if(typeof t=="string"){t={clip:{url:t}}}if(typeof t.clip=="string"){t.clip={url:t.clip}}t.clip=t.clip||{};if(q.getAttribute("href",2)&&!t.clip.url){t.clip.url=q.getAttribute("href",2)}s=new h(t.clip,-1,w);t.playlist=t.playlist||[t.clip];var I=0;m(t.playlist,function(){var K=this;if(typeof K=="object"&&K.length){K={url:""+K}}m(t.clip,function(L,M){if(M!==undefined&&K[L]===undefined&&typeof M!="function"){K[L]=M}});t.playlist[I]=K;K=new h(K,I,w);F.push(K);I++});m(t,function(K,L){if(typeof L=="function"){if(s[K]){s[K](L)}else{j(x,K,L)}delete t[K]}});m(t.plugins,function(K,L){if(L){y[K]=new l(K,L,w)}});if(!t.plugins||t.plugins.controls===undefined){y.controls=new l("controls",null,w)}y.canvas=new l("canvas",null,w);u=q.innerHTML;function J(L){var K=w.hasiPadSupport&&w.hasiPadSupport();if(/iPad|iPhone|iPod/i.test(navigator.userAgent)&&!/.flv$/i.test(F[0].url)&&!K){return true}if(!w.isLoaded()&&w._fireEvent("onBeforeClick")!==false){w.load()}return f(L)}function H(){if(u.replace(/\s/g,"")!==""){if(q.addEventListener){q.addEventListener("click",J,false)}else{if(q.attachEvent){q.attachEvent("onclick",J)}}}else{if(q.addEventListener){q.addEventListener("click",f,false)}w.load()}}setTimeout(H,0)}if(typeof q=="string"){var z=c(q);if(!z){throw"Flowplayer cannot access element: "+q}q=z;B()}else{B()}}var a=[];function d(o){this.length=o.length;this.each=function(p){m(o,p)};this.size=function(){return o.length}}window.flowplayer=window.$f=function(){var p=null;var o=arguments[0];if(!arguments.length){m(a,function(){if(this.isLoaded()){p=this;return false}});return p||a[0]}if(arguments.length==1){if(typeof o=="number"){return a[o]}else{if(o=="*"){return new d(a)}m(a,function(){if(this.id()==o.id||this.id()==o||this.getParent()==o){p=this;return false}});return p}}if(arguments.length>1){var t=arguments[1],q=(arguments.length==3)?arguments[2]:{};if(typeof t=="string"){t={src:t}}t=i({bgcolor:"#000000",version:[9,0],expressInstall:"http://static.flowplayer.org/swf/expressinstall.swf",cachebusting:true},t);if(typeof o=="string"){if(o.indexOf(".")!=-1){var s=[];m(n(o),function(){s.push(new b(this,k(t),k(q)))});return new d(s)}else{var r=c(o);return new b(r!==null?r:o,t,q)}}else{if(o){return new b(o,t,q)}}}return null};i(window.$f,{fireEvent:function(){var o=[].slice.call(arguments);var q=$f(o[0]);return q?q._fireEvent(o.slice(1)):null},addPlugin:function(o,p){b.prototype[o]=p;return $f},each:m,extend:i});if(typeof jQuery=="function"){jQuery.fn.flowplayer=function(q,p){if(!arguments.length||typeof arguments[0]=="number"){var o=[];this.each(function(){var r=$f(this);if(r){o.push(r)}});return arguments.length?o[arguments[0]]:new d(o)}return this.each(function(){$f(this,k(q),p?k(p):{})})}}})();(function(){var h=document.all,j="http://www.adobe.com/go/getflashplayer",c=typeof jQuery=="function",e=/(\d+)[^\d]+(\d+)[^\d]*(\d*)/,b={width:"100%",height:"100%",id:"_"+(""+Math.random()).slice(9),allowfullscreen:true,allowscriptaccess:"always",quality:"high",version:[3,0],onFail:null,expressInstall:null,w3c:false,cachebusting:false};if(window.attachEvent){window.attachEvent("onbeforeunload",function(){__flash_unloadHandler=function(){};__flash_savedUnloadHandler=function(){}})}function i(m,l){if(l){for(var f in l){if(l.hasOwnProperty(f)){m[f]=l[f]}}}return m}function a(f,n){var m=[];for(var l in f){if(f.hasOwnProperty(l)){m[l]=n(f[l])}}return m}window.flashembed=function(f,m,l){if(typeof f=="string"){f=document.getElementById(f.replace("#",""))}if(!f){return}if(typeof m=="string"){m={src:m}}return new d(f,i(i({},b),m),l)};var g=i(window.flashembed,{conf:b,getVersion:function(){var m,f;try{f=navigator.plugins["Shockwave Flash"].description.slice(16)}catch(o){try{m=new ActiveXObject("ShockwaveFlash.ShockwaveFlash.7");f=m&&m.GetVariable("$version")}catch(n){try{m=new ActiveXObject("ShockwaveFlash.ShockwaveFlash.6");f=m&&m.GetVariable("$version")}catch(l){}}}f=e.exec(f);return f?[f[1],f[3]]:[0,0]},asString:function(l){if(l===null||l===undefined){return null}var f=typeof l;if(f=="object"&&l.push){f="array"}switch(f){case"string":l=l.replace(new RegExp('(["\\\\])',"g"),"\\$1");l=l.replace(/^\s?(\d+\.?\d+)%/,"$1pct");return'"'+l+'"';case"array":return"["+a(l,function(o){return g.asString(o)}).join(",")+"]";case"function":return'"function()"';case"object":var m=[];for(var n in l){if(l.hasOwnProperty(n)){m.push('"'+n+'":'+g.asString(l[n]))}}return"{"+m.join(",")+"}"}return String(l).replace(/\s/g," ").replace(/\'/g,'"')},getHTML:function(o,l){o=i({},o);var n='<object width="'+o.width+'" height="'+o.height+'" id="'+o.id+'" name="'+o.id+'"';if(o.cachebusting){o.src+=((o.src.indexOf("?")!=-1?"&":"?")+Math.random())}if(o.w3c||!h){n+=' data="'+o.src+'" type="application/x-shockwave-flash"'}else{n+=' classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"'}n+=">";if(o.w3c||h){n+='<param name="movie" value="'+o.src+'" />'}o.width=o.height=o.id=o.w3c=o.src=null;o.onFail=o.version=o.expressInstall=null;for(var m in o){if(o[m]){n+='<param name="'+m+'" value="'+o[m]+'" />'}}var p="";if(l){for(var f in l){if(l[f]){var q=l[f];p+=f+"="+(/function|object/.test(typeof q)?g.asString(q):q)+"&"}}p=p.slice(0,-1);n+='<param name="flashvars" value=\''+p+"' />"}n+="</object>";return n},isSupported:function(f){return k[0]>f[0]||k[0]==f[0]&&k[1]>=f[1]}});var k=g.getVersion();function d(f,n,m){if(g.isSupported(n.version)){f.innerHTML=g.getHTML(n,m)}else{if(n.expressInstall&&g.isSupported([6,65])){f.innerHTML=g.getHTML(i(n,{src:n.expressInstall}),{MMredirectURL:location.href,MMplayerType:"PlugIn",MMdoctitle:document.title})}else{if(!f.innerHTML.replace(/\s/g,"")){f.innerHTML="<h2>Flash version "+n.version+" or greater is required</h2><h3>"+(k[0]>0?"Your version is "+k:"You have no flash plugin installed")+"</h3>"+(f.tagName=="A"?"<p>Click here to download latest version</p>":"<p>Download latest version from <a href='"+j+"'>here</a></p>");if(f.tagName=="A"){f.onclick=function(){location.href=j}}}if(n.onFail){var l=n.onFail.call(this);if(typeof l=="string"){f.innerHTML=l}}}}if(h){window[n.id]=document.getElementById(n.id)}i(this,{getRoot:function(){return f},getOptions:function(){return n},getConf:function(){return m},getApi:function(){return f.firstChild}})}if(c){jQuery.tools=jQuery.tools||{version:"3.2.4"};jQuery.tools.flashembed={conf:b};jQuery.fn.flashembed=function(l,f){return this.each(function(){$(this).data("flashembed",flashembed(this,l,f))})}}})();