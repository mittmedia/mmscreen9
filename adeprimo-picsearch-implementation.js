var search = {

paginationCount: 20,

  count:3,

  start: 1,

  order: 'posted',

 updateStart: function(start) {

   search.start = start;

   search.update();

   

  },

  update: function() {

   var fields;

   fields = ["title", "mediaid", "duration", "downloads_started", "rating", "thumbnail"];

     searchphrase = document.getElementById("search-textbox").value;

    document.getElementById("search_msg_box").style.display="block";

    document.getElementById("search_msg_box").innerHTML =  "<div id='search_msg_box_inner'><div class='search-message'><div class='result-for searchtext' id='search-message'>S&ouml;ker efter: "+searchphrase+"</div> <div id='closeSearch'><a href='javascript:playlist.mode=1;playlist.start=1;playlist.update();'></a></div></div></div>";

    ps.search(searchphrase, {count: search.count, start: search.start, order: search.order, fields: fields}, function(data) {

     document.getElementById("search-message").innerHTML = data.count + " resultat f&ouml;r: " + document.getElementById("search-textbox").value;

     search.display(data);

    });

  },

  display: function(data) {

   var i, m, t, r;

   

   document.getElementById("video-list-pagination").innerHTML = "";

   var videoHtml = "";

   for (i in data.media) {

    m = data.media[i];

    t = ps.parseDuration(m.duration);



    var emptystar = "<img  src='img/small-rating-disable.png'>";

    var star = "<img  src='img/small-rating.png'>";

    var rat = "";

    for (r = 16; r < m.rating; r += 17) {

     rat += star;

    }

    for (; r < 100; r += 17) {

     rat += emptystar;

    }

  

    videoHtml += "<div class='video-list-container'><a href='javascript:ps.activateMedia(\""+m.mediaid+"\")'><div class='video-list-image thumb-blinds' style='width: 124px; height:93px;'><table cellpadding=0 cellspacing=0><tr height=93><td style='vertical-align: middle;'><img src='"+m.thumbnail+"' style='max-width: 124px; max-height: 93px;'></tr></td></table></div><div class='video-list-details'><div class='video-list-heading themecolor'>"+m.title+"</div><p>"+m.description+"</p><span class='clearleft'></span></div></a></div>";

   }

   document.getElementById("video-list").innerHTML = videoHtml;

  

   if (data.count > data.media.length) {

    document.getElementById("video-list-pagination").innerHTML = makePagination(data.count, search.start, search.count, search.paginationCount, "search.updateStart");

   }

  }

 };


function makePagination(itemsCount, currentStart, itemsPerPage, maxButtons, updateFunctionName, guid, filters) {
    var pag = "";
    var style = "";
    pag += "<ul>";
    if (currentStart <= 1) {
        style = "opacity: 0.3;filter:alpha(opacity=30);";
    }
    pag += "<li><a style='" + style + "' class='pag-previous' href='javascript:" + updateFunctionName + "(" + Math.max(1, currentStart - itemsPerPage) + ", \"" + guid + "\");'></a></li>";

    var totalPages = parseInt((itemsCount + (itemsPerPage - 1)) / itemsPerPage);
    var currentPage = parseInt((currentStart + (itemsPerPage - 1)) / itemsPerPage);
    var lastPage = Math.min(totalPages, currentPage + parseInt((maxButtons) / 2));
    var firstPage = Math.max(1, lastPage - (maxButtons - 1));
    lastPage = Math.min(totalPages, firstPage + (maxButtons - 1));
    var page;
    var active = '';
    var start = 1;
    for (page = firstPage; page <= lastPage; page++) {
        start = 1 + (page - 1) * itemsPerPage;
        active = '';
        if (start <= currentStart && start + itemsPerPage > currentStart) {
            active = ' active';
        }
        pag += "<li><a class='" + active + "' href='javascript:" + updateFunctionName + "(" + start + ", \"" + guid + "\");'>" + page + "</a></li>";
    }
    style = "opacity: 0.3;filter:alpha(opacity=30);";
    if (active == '') {
        start = currentStart + itemsPerPage;
        style = "";
    }
    pag += "<li><a style='" + style + "' class='pag-next' href='javascript:" + updateFunctionName + "(" + start + ", \"" + guid + "\");'></a></li>";
    pag += "</ul>";
    
    
    
    return pag;
}

var playlist = {
    paginationCount: 7,
    copy: {
        sortByDate: "Datumsortering",
        sortByViews: "Mest visat",
        sortByRating: "Popul&auml;rast",
        length: "L&auml;ngd",
        views: "Visningar",
        rating: "Betyg"
    },
    order: "posted",
    start: 1,
    count: 4,
    mode: 1,
    playlistLink : null,
    // 1 = list, 2 = search
    imgcache: [],
    updateOrder: function(order, guid) {
        playlist.order = order;
        playlist.update(guid);
    },
    updateStart: function(start, guid) {
        playlist.start = start;
        playlist.update(guid);
    },
    update: function(guid) {
        var fields;
        fields = ["title", "mediaid", "duration", "downloads_started", "rating", "thumbnail"];
        setOpacity("video-list", 50);
        var filters = playlists.filters;
        var searchBox = document.getElementById("search-textbox" + guid);
        if (searchBox) {
          searchphrase = searchBox.value;
        }
        
        if (playlist.mode == 2 && searchphrase) {
            document.getElementById("search_msg_box" + guid).style.display = "block";
            document.getElementById("search_input" + guid).style.display = "none";
            document.getElementById("search_msg_box" + guid).innerHTML = "<div id='search_msg_box_inner'><div class='search-message'><div class='result-for searchtext' id='search-message'>S&ouml;ker efter: " + searchphrase + "</div> <div id='closeSearch'><a href='javascript:playlist.mode=1;playlist.start=1;playlist.update('" + guid + "');'></a></div></div></div>";
            ps.search(searchphrase, {
                count: playlist.count,
                start: playlist.start,
                order: playlist.order,
                fields: fields
            },
            function(data) {
                document.getElementById("search-message").innerHTML = data.count + " resultat f&ouml;r: " + document.getElementById("search-textbox" + guid).value;
                playlist.display(data);
            });
        } else {
            if (searchBox) {
              searchBox.value = "";
              document.getElementById("search_msg_box" + guid).style.display = "none";
              document.getElementById("search_input" + guid).style.display = "block";
            }
            ps.listMedia({
                count: playlist.count,
                start: playlist.start,
                order: playlist.order,
                fields: fields,
                filters: playlists[guid].filters
            },
            function(data) {
                playlist.display(data, guid);
            });
  
        }
    },
    display: function(data, guid) {
        var i,
        m,
        t,
        r;
        
 
        playlist.media = data.media;
        var videoListPagination = document.getElementById("video-list-pagination" + guid);
        if (!videoListPagination || !data.media) {
          return; // EXIT
        }
        videoListPagination.innerHTML = "";
        var videoHtml = "";
        for (var i = 0; i < data.media.length; i++) {
            m = data.media[i];
            t = ps.parseDuration(m.duration);

            var emptystar = "<img  src='img/small-rating-disable.png'>";
            var star = "<img  src='img/small-rating.png'>";
            var rat = "";
            for (r = 16; r < m.rating; r += 17) {
                rat += star;
            }
            for (; r < 100; r += 17) {
                rat += emptystar;
            }
            var pc = playlist.copy;
            var length = "";
            if (pc.length !== 0) {
                var length = "<span class='video-list-detail'>" + pc.length + " " + t.timestamp + "</span>";
            }
            var views = "";
            if (pc.views !== 0) {
                var views = "<span class='video-list-detail'>" + pc.views + " " + m.downloads_started + "</span>";
            }
            var separator = "";
            if (pc.length !== 0 && pc.views !== 0) {
                var separator = "<span class='video-list-detail'>|</span>";
            }
            
            videoHtml += "<div class='video-list-container'><a href='";
            
            if (playlist.playlistLink !== null) {
              videoHtml += playlist.playlistLink + "#" + m.mediaid;
            } else {
              videoHtml += "javascript:ps.activateMedia(\"" + m.mediaid + "\")";  
            }
            
            
            videoHtml += "'><div class='video-list-image thumb-blinds' style='width: 124px; height:93px;'><table cellpadding=0 cellspacing=0><tr height=93><td style='vertical-align: middle;'>";
            videoHtml += "<img src='" + m.thumbnail + "' style='max-width: 124px; max-height: 93px;'></tr></td></table></div><div class='video-list-details'><div class='video-list-heading themecolor'>" + m.title + "</div>";
            //<a href='' class='videolink'></a>
            if (typeof m.description !== "undefined") {
              videoHtml += "<p>" + m.description + "</p>"; 
            }
            
            videoHtml += length + separator + views + "<span class='clearleft'><span class='video-list-detail'>" + pc.rating + " " + rat + "</span></span></div></a></div>";
        }
        document.getElementById("video-list" + guid).innerHTML = videoHtml;
        
        /*
        $(".videolink").each(function(link){
          link.href = "http://na.se";
        });
        */
        
        setOpacity("video-list" + guid, 100);
        if (data.count > data.media.length) {
            videoListPagination.innerHTML = makePagination(data.count, playlist.start, playlist.count, playlist.paginationCount, "playlist.updateStart", guid);
        }
    },
    activateTab: function(tab, order, guid) {
        var tab1 = document.getElementById("tab1" + guid);
        if (tab1) {
          tab1.className = "tab-heading";
        }
        var tab2 = document.getElementById("tab2" + guid);
        if (tab2) {
          tab2.className = "tab-heading";
        }
        var tab3 = document.getElementById("tab3" + guid);
        if (tab3) {
          tab3.className = "tab-heading";
        }
        tab.className = "selected-tab tab-heading-selected";
        playlist.updateOrder(order, guid);
    },
    init: function(guid) {
      
        if (typeof guid === "undefined") {
          guid = "";
        }
        
        playlist.renderHTML(guid);
        
        var categoryId = "";
        var filters = {};
        
		
        ps.listCategories({
          "filters" : {}
        },
        function(data) {            
            for (i in data.categories) {
              if (data.categories[i].categoryname == guid) {
                categoryId = data.categories[i].categoryid;
                if (typeof categoryId !== "undefined") {
                  filters = {"categoryid": categoryId};
                }
              }
            }
        
          var playlistObj = new createPlaylistObj(guid);
          playlistObj.filters = filters;
          playlists[guid] = playlistObj;
          
          var tab1 = document.getElementById("tab1" + guid);
          if (tab1) {
            tab1.innerHTML = playlist.copy.sortByDate;
          }
          var tab2 = document.getElementById("tab2" + guid);
          if (tab2) {
            tab2.innerHTML = playlist.copy.sortByViews;
          }
          var tab3 = document.getElementById("tab3" + guid);
          if (tab3) {
            tab3.innerHTML = playlist.copy.sortByRating;
          }
          
          var fields = ["title", "mediaid", "duration", "downloads_started", "rating", "thumbnail"];
          
  
          ps.listMedia({
              count: playlist.count,
              start: playlist.start,
              order: playlist.order,
              fields: fields,
              filters: filters
          },
          function(data) {
              playlist.display(data, guid);
              ps.activateMedia(location.hash.substr(1) || findParam("m", "") || playlist.media[0].mediaid);
          });
        
       });
    },
    renderHTML: function(guid) {
      document.write (
           '<div class="tabbed-panel">' +
            '<ul class="tabs">' +
             '<li id="tab1' + guid + '" class="selected-tab tab-heading-selected" tabindex="0" onclick="playlist.activateTab(this, \'posted\', \'' + guid + '\')">Datumsortering</li>' +
             '<li id="tab2' + guid + '" class="tab-heading" tabindex="1" onclick="playlist.activateTab(this, \'downloads\', \'' + guid + '\')">mest visat</li>' +
             '<li id="tab3' + guid + '" class="tab-heading" tabindex="2" onclick="playlist.activateTab(this, \'rating\', \'' + guid + '\')">Popul&auml;rast</li>' +
            '</ul>' +
            '<div  class="tab-content">' +
             '<div id="video-list' + guid + '" class="video-list" ></div>' +
             '<div id="video-list-pagination' + guid + '" class="pagination"></div>' +
            '</div>' +
           '</div>');
    }
};
function findParam(param, def) {
    param = param.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var re = new RegExp("[\\?&]" + param + "=([^&#]*)");
    var value = re.exec(window.location.href);
    if (value == null) {
        return def;
    } else {
        return value[1];
    }
}
function useHtml5() {
    return ((navigator.userAgent.match(/iPhone/i)) || (navigator.userAgent.match(/iPad/i)));
}
var player = {
    style: 0,
    autoPlayFirst: false,
    autoPlaySpecific: true,
    init: function() {
        ps.addEventListener("mediaActivated", {
            fields: ["mediaid"]
        },
        function(data) {
            if (!data) {
              return; // EXIT
            }
            if (location.hash == "") var autoplay = player.autoPlayFirst;
			else var autoplay = player.autoPlaySpecific;
			location.hash = data.mediaid;
            ps.embed({mediaid: data.mediaid, containerId: "mediaplayer", width: 620, height: 430, autoplay: autoplay, player: 'rutile'});

        });
    }
};

var clone = function(obj, copied) {
    if (! (/array|object/.test(typeof obj))) return obj;
    if (copied === undefined) copied = [];
    for (var i in copied) if (copied[i][0] === obj) return copied[i][1];
    var copy = {};
    copied.push([obj, copy]);
    for (var key in obj) copy[key] = clone(obj[key], copied);
    return copy;
};

var infoPanel = {
    copy: {
        length: "L&auml;ngd",
        views: "Visningar",
        rating: "Betyg",
        download: "Ladda ner",
        sendToPhone: 0
    },
    init: function() {
        var fields = ["title", "description", "duration", "rating", "downloads_started", "downloadlink"];
        ps.addEventListener("mediaActivated", {
            fields: fields
        },
        function(media) {
            var r,
            t;
            t = ps.parseDuration(media.duration);
            var m = 'ps.assignRating("' + media.mediaid + '", {rating: ';
            var bigstar = "k";
            var bigemptystar = "l";
            var bigstar = "<img  src='img/big-star.png' onclick='" + m;
            var bigemptystar = "<img  src='img/big-star-disable.png' onclick='" + m;
            var ratBig = "";
            var rating = 0;
            for (r = 16; r < media.rating; r += 17) {
                ratBig += bigstar + rating + "});'>";
                rating += 25;
            }
            for (; r < 100; r += 17) {
                ratBig += bigemptystar + rating + "});'>";
                rating += 25;
            }
            var sendToPhone = "";
            var ic = infoPanel.copy;
            if (ic.sendToPhone !== 0) {
                sendToPhone = "<div class='details-right'><img src='img/send-phone.png' width='21' height='23' class='float-left'><a href='javascript:void(0);'>" + ic.sendToPhone + "</a></div>";
            }
            var download = "";
            if (ic.download !== 0) {
                download = "<div class='details-right'><img src='img/download-icon.png' width='21' height='23' class='float-left'><a href='" + media.downloadlink + "'>" + ic.download + "</div></a></div>";
            }
            document.getElementById("metavideo").innerHTML = "<div class='descriptionbox'><div class='video-name themecolor'><h1>" + media.title + "</h1></div><p class='video-description'>" + media.description + "</p></div><div class='video-detail'><div class='video-length'>" + ic.length + " " + t.timestamp + " </div><div class='video-views'>" + ic.views + " " + media.downloads_started + "</div><div class='video-rating'><div class='rating-text'>" + ic.rating + "</div><div class='rating-img'> " + ratBig + "</div></div>" + sendToPhone + download;
        });
    }
};

var recommendedVideos = {
    paginationCount: 20,
    copy: {
        recommendedVideos: "Rekommenderas",
        newVideos: "Nya",
        popularVideos: "Popul&auml;ra",
        topRated: "B&auml;st betyg",
        length: "L&auml;ngd",
        views: "Visningar",
        rating: "Betyg"
    },
    order: 'posted',
    count: 3,
    start: 1,
    media: [],
    init: function() {
        document.getElementById("recommended-head").innerHTML = recommendedVideos.copy.recommendedVideos;
        document.getElementById("recommended-posted").innerHTML = "<span></span>" + recommendedVideos.copy.newVideos;
        document.getElementById("recommended-downloads").innerHTML = "<span></span>" + recommendedVideos.copy.popularVideos;
        document.getElementById("recommended-rating").innerHTML = "<span></span>" + recommendedVideos.copy.topRated;
        recommendedVideos.display();
    },
    updateOrder: function(order) {
        document.getElementById("recommended-" + recommendedVideos.order).className = document.getElementById("recommended-" + recommendedVideos.order).className.replace("active", "");
        recommendedVideos.order = order;
        document.getElementById("recommended-" + recommendedVideos.order).className = "active";
        recommendedVideos.display();
    },
    updateStart: function(start) {
        recommendedVideos.start = start;
        recommendedVideos.display();
    },
    display: function() {
        var fields,
        filters,
		guid;
        if (recommendedVideos.media.length > 0) {
            setOpacity("recommended-bottom", 50);
        }
        fields = ["title", "posted", "mediaid", "duration", "downloads_started", "rating", "thumbnail"];
        filters = {
            "properties": {
                "recommended": "1"
            }
        };
        ps.listMedia({
            count: recommendedVideos.count,
            start: recommendedVideos.start,
            order: recommendedVideos.order,
            fields: fields,
            filters: filters
        },
        function(response) {
            var i,
            m,
            t;
            recommendedVideos.media = response.media;
            var recHtml = "";
            for (var i = 0; i < response.media.length; i++) {
                m = response.media[i];
                t = ps.parseDuration(m.duration);
                var emptystar = "<img src = 'img/small-rating-disable.png'>";
                var star = "<img src = 'img/small-rating.png'>";
                var ratrec = "";
                for (r = 16; r < m.rating; r += 17) {
                    ratrec += star;
                }
                for (; r < 100; r += 17) {
                    ratrec += emptystar;
                }
                var rc = recommendedVideos.copy;
                var date = m.posted.substr(0, 10);
                recHtml += "<div class='recommended-video-container'><a href='javascript:ps.activateMedia(\"" + m.mediaid + "\")'><div class='recommended-video-image'><table cellpadding=0 cellspacing=0 style='display:inline;'><tr height='93' class='thumb-blinds'><td style='vertical-align: middle;'><img src='" + m.thumbnail + "' style='max-width: 165px; max-height: 93px;'></tr></td></table></div><div class='recommended-video-title themecolor'>" + m.title + "</div><div class='recommended-video-date'>" + date + "</div><p>" + m.description + "</p><div class='recommended-video-details'>" + rc.length + " " + t.timestamp + " | " + rc.views + " " + m.downloads_started + " | " + rc.rating + " " + ratrec + "</div></a></div>";
            }
            document.getElementById("recommended-bottom").innerHTML = recHtml;
            setOpacity("recommended-bottom", 100);
            if (response.count > recommendedVideos.count) {
                document.getElementById("recommended-pagination").innerHTML = makePagination(response.count, recommendedVideos.start, recommendedVideos.count, recommendedVideos.paginationCount, "recommendedVideos.updateStart", guid);
            }
        });
    }
};
var pageDetails = {
    logoLink: "http://about.picsearch.com",
    copy: {
        copyright: "Copyright PICSEARCH 2009-2010. All Rights Reserved.",
        title: "Picsearch Image Gallery"
    },
    init: function() {
        document.title = pageDetails.copy.title;
        document.getElementById("copyright").innerHTML = pageDetails.copy.copyright;
        document.getElementById("logolink").href = pageDetails.logoLink;
    }
};
function setOpacity(element, opacity) {
    var objElement = document.getElementById(element);
    if (objElement) {
      objElement.style.opacity = "" + opacity / 100;
      objElement.style.filter = "alpha(opacity=" + opacity + ")";
    }
}

var playlists = {};

function createPlaylistObj(guid) {
  filters : {}
};

//player.init();