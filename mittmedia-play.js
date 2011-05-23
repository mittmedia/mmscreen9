/*  MittMediaPlay 1.0
 *	JS/AJAX Play interface for Screen9 video service
 *	Copyright 2011 MittMedia DMU
 *	2011-03-30
 *	Authors: 	Tomas Jogin, 			tomas.jogin@mittmedia.se
 *						Magnus Engström, 	magnus.engstrom@mittmedia.se
 */

/* Todo:
 *
 * ? Display loading indicator
 *
 */
 
/* Browser compatibility
 * 
 * + Chrome 
 * + Firefox 3.6
 * + IE 8
 * + iPad
 *
 */
var MittMediaPlay = (function(){

	var player;
	var config;
	var navigation;

	/* Set up VideoPlayer and  CategoryListing, initiate */
	function init(configuration){
		config = configuration;
		player = new VideoPlayer();
		player.init();

		navigation = new MediaNavigation();
		document.observe("dom:loaded", function(){
			navigation.init();
		});
		
		debug("MittMediaPlay initialized");
	}
	
	/* MediaNavigation represents the tabs and tabbed content
		 of categorized videos. */
	function MediaNavigation(){
		var video_lists;
		var tabs;
		var template_container;
		var page_size;
		var row_size;
		var pagination;

		function current_tab(){
			return tabs.down(".current");
		}

		function set_current_tab(new_tab){
			var old_tab = current_tab();
			if(old_tab)
				old_tab.removeClassName("current");
			new_tab.addClassName("current");
		}

		function current_list(){
			return video_lists.down(".current");
		}
		
		function set_current_list(new_list){
			var old_list = current_list();
			if(old_list)
				old_list.removeClassName("current");
			new_list.addClassName("current");
		}
		
		function current_page(){
			return video_lists.down(".page.current")
		}
		
		function set_current_page(new_page){
			var old_page = current_page();
			if(typeof(old_page) != "undefined")
				old_page.removeClassName("current");
			new_page.addClassName("current");
			var page_no_display = pagination.down(".page-no");
			if(page_no_display){
				page_no_display.update(new_page.readAttribute("rel"));			
			}
			enable_pagination();
		}
		
		/* Event callback that gets fired when a tab is clicked */
		function select_tab(tab){
			var tab_id = tab.readAttribute("rel");
			var new_tab = tabs.down("[rel=\""+tab_id+"\"]");
			if(new_tab){
				set_current_tab(new_tab);
				select_list(tab_id);
			}
		}

		function select_tab_by_title(title){
			if(typeof(title) !== "undefined" && title && title != ""){
				title = title.toLowerCase();
				var matching_tab = tabs.childElements().detect(function(tab){
					return tab.innerHTML.toLowerCase() == title;
				});
				if(matching_tab){
					select_tab(matching_tab);
				}
			}
		}


		/* Selects a list, populates it with videos if not already done */
		function select_list(list_id){
			var new_list = video_lists.down("#list-"+list_id);
			if(typeof(new_list) === "undefined"){
				fetch_videos({ animate_videos: true, page_no: 1, categoryid: list_id });
			}else{
				set_current_list(new_list);
				var first_page = new_list.down(".page-1");
				set_current_page(first_page);
				animate_videos(first_page);
			}
		}
		
		/* Iterates over all videos in a given page, hides them, 
			 then attaches a fade-in effect with a small delay 
			 between each video. */
		function animate_videos(page){
			// prevent flickering
			var current_height = page.getHeight() || current_list().getHeight() || video_lists.getHeight();
			video_lists.setStyle({'minHeight': current_height.toString() + 'px'});

			var videos = page.childElements();
			videos.each(function(video, index){
				video.hide();
				setTimeout(function(){
					Effect.Appear(video, {'duration': 0.5, 'transition': Effect.Transitions.linear});
				}, 70*index, video);
			});
		}
		
		/* Enables or disables next/prev-page buttons. */
		function enable_pagination(){
			var prev_page = pagination.down(".prev-page");
			var next_page = pagination.down(".next-page");
			
			prev_page.addClassName("disabled");
			next_page.addClassName("disabled");
			
			if(has_previous_page())
				prev_page.removeClassName("disabled");
			if(has_next_page())
				next_page.removeClassName("disabled");
		}
		
		function has_previous_page(){
			var page_no = parseInt(current_page().readAttribute("rel"));
			return (page_no > 1);
		}
		
		function has_next_page(){
			return current_page().childElements().length == page_size
		}
		
		function next_page(){
			var page = current_page();
			var page_no = parseInt(page.readAttribute("rel"));
			if(has_next_page())
				select_page(page_no+1);
		}
		
		function previous_page(){
			var page_no = parseInt(current_page().readAttribute("rel"));
			if(has_previous_page())
				select_page(page_no-1);
		}
		
		/* Selects a page of videos. Loads it with videos if not
		   already loaded, otherwise just switches back to previously
			 loaded page. */
		function select_page(page_no){
			var list = current_list();
			var page = list.down(".page-" + page_no);
			if(typeof(page) != "undefined"){
				set_current_page(page);
				animate_page(page);
			}else{
				var categoryid = list.readAttribute("rel");
				if(categoryid == "alla")
					categoryid = null;
				fetch_videos({page_no: page_no, categoryid: categoryid, animate_videos: true, animate_page: true});
			}
		}
		
		function animate_page(page){
			animate_videos(page);
		}
		
		/* Fetches videos for given category via Picsearch AJAX api
		   Renders list of video clips		*/
		function fetch_videos(opts){
			var fields						= ["mediaid", "title", "description", "categoryname", "duration", "thumbnail", "posted"];
			var field_formatters 	= { "length": function(media){
																	var duration = config.picsearch.parseDuration(media.duration);
																	return duration.minutes.toString() + "." + ("0" + duration.seconds.toString()).substr(-2, 2) + "min";
																},
																"date": function(media){
																	return media.posted.substr(0,10);
																},
																"categoryclass": function(media){
																	return media.categoryname.underscore().gsub(/[\u00f6]/, "o").gsub(/[\u00e4\u00e5]/, "a").gsub(/\W+/, '');
																},
																"thumbnail": function(media){
																	return "<img src=\""+media.thumbnail+"\" />";
																}
															};

			var rel = opts.categoryid;
			var filters = {};
			
			/* Set filters to retrieve videos of a specific category, or for all categories. */
			if(typeof(opts.categoryid) != "undefined" && opts.categoryid && opts.categoryid != "alla"){
				filters.categoryid = opts.categoryid;
			}else{
				rel = "alla";
			}
			/* Limit _all_ results to that with a specific tag/tags */
			if(typeof(config.tag_filter) !== "undefined"){
				filters.tags = config.tag_filter;
			}
			
			var page_no, page_start;
			page_no = opts.page_no;
			page_start = (page_no * page_size) - page_size + 1;

			var list = video_lists.down("#list-"+rel);
			if(typeof(list) === "undefined"){
				list = new Element(template_container.tagName, {'rel': rel, 'class': 'video-list', 'id': 'list-' + rel});
				video_lists.insert(list);
			}


			set_current_list(list);
			var page = new Element('div', {'class': 'page page-' + page_no, 'rel': page_no});
			list.insert(page);

			/* Call to remote Picsearch AJAX API */
			var api_args = {start: page_start, count: page_size, fields: fields, filters: filters};
			debug("API call: listMedia");
			debug(api_args);
			config.picsearch.listMedia(function(data){
				debug("listMedia");
				debug(data);
				var video_template = template_container.down();
				for(i=0;i<data.media.length;i++){
					var media = data.media[i];
					/* Use html-template (see html source),
						 replace pseudo-tags with field content */
					var content = video_template.innerHTML.gsub(/#{(\w+)}/, function(match){
						var formatter = field_formatters[match[1]];
						if(typeof(formatter) == "function")
							return formatter(media);
						else
							return media[match[1]];
					});

					/* Insert video in DOM */
					var row_pos = " pos-" + (i % row_size);
					var video = new Element(video_template.tagName, {'rel': media.mediaid, 'class': video_template.className + row_pos}).update(content);
					video.observe('click', function(){
						player.play(this.readAttribute("rel"), true);
					});
					page.insert(video);
					set_current_page(page);
				}
				
				if(opts.animate_videos){
					animate_videos(page);
				}
				if(opts.animate_page){
					animate_page(page);
				}

				player.navigation_ready();
				
			}, null, api_args);
		}
		
		/* Callback: categoryListingResponse(data)
		Runs when lists of categories are received via Picsearch API call
		Renders list of categories of video clips		*/
		function categoryListingResponse(data){
			/* Insert virtual 'all clips' tab prior to actual categories */
			var li = new Element("li", {rel: "alla"}).update("Alla klipp");
			li.observe('click', function(event){ select_tab($(event.target)) });
			tabs.insert(li);
			if(!config.category){
				set_current_tab(li);
				fetch_videos({page_no: 1});
			}

			/* Insert actual categories to tab list */
			data.categories.reverse().each(function(category){
				var li = new Element("li", {rel: category.categoryid}).update(category.categoryname);
				li.observe('click', function(event){ select_tab($(event.target)) });
				tabs.insert(li);
				if(category.categoryname === config.category){
					set_current_tab(li);
					fetch_videos({categoryid: category.categoryid, page_no: 1});
				}
			});
		}
		
		/* Initiate members, retrieve category listings from Picsearch AJAX API */
		function init(){
			tabs = $(config.category_tabs || "category-tabs");
			video_lists = $(config.video_lists || "video-lists");
			template_container = $(config.template_container || "template-container");
			pagination = $(config.pagination || "pagination");
			page_size = config.page_size || 12;
			row_size = config.row_size || 4;
			debug("API call: listCategories");
			config.picsearch.listCategories(categoryListingResponse, null, {filters: {}});
			
			var go_to_previous_page = pagination.down(".prev-page");
			go_to_previous_page.observe('click', previous_page);
			
			var go_to_next_page = pagination.down(".next-page");
			go_to_next_page.observe('click', next_page);
		}

		return { init: init, current_list: current_list, select_tab_by_title: select_tab_by_title };		
	}
	

	/* VideoPlayer represents the behaviour of the video 
		 and the video meta data in the html structure. */
	function VideoPlayer(){
		var picsearch_player_id;
		var player_meta;
		var player_meta_template;
		var ratio;
		var width;
		var height;
		var mediaid;
		var autoload = true;
		
		var voter;

		var fields = ["mediaid", "title", "description", "categoryname", "duration", "rating", "downloads_started", "tags"];
		var field_formatters 	= { "length": function(media){
																var duration = config.picsearch.parseDuration(media.duration);
																return duration.minutes.toString() + "." + ("0" + duration.seconds.toString()).substr(-2, 2) + "min";
															},
															"views": function(media){
																return media.downloads_started.toString();
															},
															"categoryclass": function(media){
																return media.categoryname.underscore().gsub(/[\u00f6]/, "o").gsub(/[\u00e4\u00e5]/, "a").gsub(/\W+/, '');
															},
															"ratingclass": function(media){
																return "rating-" + voter.rating_to_stars(parseInt(media.rating));
															}
														};

		function play(mediaid, autoplay){
			voter.hide();
			debug("API call: activateMedia");
			if(autoplay){
				location.hash = mediaid;			
			}
			config.picsearch.activateMedia(mediaid);
		}
		
		/* Updates html with information about the video */
		function show_meta(data){
			debug("meta data");
			debug(data);
			player_meta.innerHTML = player_meta_template.innerHTML.gsub(/#{(\w+)}/, function(match){
				var formatter = field_formatters[match[1]];
				if(typeof(formatter) == "function")
					return formatter(data);
				else
					return data[match[1]];
			});
		}
		
		function scroll_into_view(){
			var player_screen = $(picsearch_player_id);
			var offset = player_screen.viewportOffset();
			if(offset[1] < 0){
				Effect.ScrollTo(player_screen, {'duration': 1, 'offset': -20});
			}
		}
		
		/* Callback: mediaActivationListener(data)
		Runs when media is activated (played) via Picsearch API call */
		function mediaActivationListener(data){
			var autoplay = false;
			if (!data) { return false; }

			if (location.hash.substr(1, location.hash.length) === data.mediaid){
				// when the video id is found in location.hash (user came here via direct url to video), autoplay video
				autoplay = true;
			}
			
			if(autoload && autoplay){
				// autonavigate to video's category, on autoplay, otherwise not
				navigation.select_tab_by_title(data.categoryname);				
			}
			
			player.mediaid = location.hash = data.mediaid;
			var api_args = {mediaid: data.mediaid, containerId: picsearch_player_id, width: width, height: height, autoload: true, autoplay: autoplay, player: 'rutile'};
			debug("API call: embed");
			debug(api_args);
			config.picsearch.embed(api_args, mediaLoaded, mediaFailed);
			show_meta(data);
			scroll_into_view();
		}
		
		
		function navigation_ready(){
			if(autoload){
				if(location.hash !== ""){
					debug("Autoload from URL hashmark");
					var mediaid = location.hash.substring(1, location.hash.length);
					player.play(mediaid);
				}else{
					var list = navigation.current_list();
					if(list){
						var first_video = list.down(".video");
						if(first_video){
							debug("Autoload first video in listing");
							player.play(first_video.readAttribute("rel"));
						}
					}
				}
				autoload = false;
			}
		}
		
		/* Runs when media was successfully loaded */
		function mediaLoaded(data){
			voter.show();
		}
		
		/* Runs when media fails to load */
		function mediaFailed(){
		
		}
		
		
		/* Initiate members, add event listener for media playback */
		function init(){
			picsearch_player_id = config.picsearch_player || "picsearch-player";
			player_meta = $(player_meta || "player-meta");
			player_meta_template = $(config.player_meta_template || "player-meta-template");
			ratio = config.ratio || (16/9);
			var player_screen = $(picsearch_player_id);
			width = parseInt(player_screen.getWidth());
			height = Math.round(width * 1/ratio);

			voter = new Voter();
			voter.init();
			
			config.picsearch.addEventListener("mediaActivated", { fields: fields }, mediaActivationListener);
		}

		function Voter(){
			
			var rating_widget;
			var media_rating;
			var is_visible = false;

			function vote(vote){
				media_rating.className = vote.className;
				media_rating.className.scan(/rating-(\d)/, function(stars){
					var value = stars_to_rating(stars[1]);
					var api_args = {rating: value};
					debug("API call: assignRating");
					debug(api_args)
					config.picsearch.assignRating(player.mediaid, api_args);
				});
			}
			
			function stars_to_rating(stars){
				return (parseInt(stars) * 20) - 10;
			}
			
			function rating_to_stars(rating){
				var stars = Math.round((rating / 20));
				return stars;
			}
			
			function show(){
				setTimeout(function(){
					media_rating = player_meta.down(".rating");
					var offset = media_rating.cumulativeOffset();
					var x = offset[0] + "px";
					var y = offset[1] + "px";
					rating_widget.setStyle({'position': 'absolute', 'top': y, 'left': x});
					new Effect.Appear(rating_widget);//.show();
				}, 100);
			}
			
			function hide(){
				rating_widget.hide();
			}
						
			function init(){		
				rating_widget = $(config.rating_widget || "rating-widget");
				rating_widget.descendants().each(function(rating){
					rating.observe('click', function(event){
						Event.stop(event);
						vote(this);
					});
				});
			}
			
			return { init: init, show: show, hide: hide, rating_to_stars: rating_to_stars };
		}

		
		return { init: init, play: play, mediaid: mediaid, navigation_ready: navigation_ready };
	}

	return { init: init };
})();

function debug(something){
	if(typeof(console)!="undefined"){
		console.log(something);
	}
}