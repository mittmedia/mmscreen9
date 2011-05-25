###
  MMScreen9
  JS/Ajax video catalogue interface for Screen9 (screen9.com)
  Copyright MittMedia DMU (C) 2011
  Authors:  Tomas Jogin, tomas.jogin(a)mittmedia.se
            Magnus Engström, magnus.engstrom(a)mittmedia.se
###
MMScreen9 =
  init: (@config) ->
    jQuery =>
      @player.init(this)
      @navigation.init(this)
    mmdebug "MMScreen9 initialized"

  player:
    init: (root) ->
      @config               = root.config
      @navigation           = root.navigation
      @picsearch_player_id  = @config.picsearch_player_id or "picsearch-player"
      @player_meta          = jQuery @config.player_meta or "#player-meta"
      @player_meta_template = jQuery @config.player_meta_template or "#player-meta-template"
      @autoplay             = false
      @autoload_first       = location.hash is ""
      @autoload_url         = location.hash isnt ""
      @ratio                = @config.ratio or (16/9)
      @screen               = jQuery("##{@picsearch_player_id}")
      @width                = @screen.width
      @height               = Math.round(@width * 1/@ratio)
      @fields               = ["mediaid", "title", "description", "categoryname", "duration", "rating", "downloads_started", "tags"]

      @config.picsearch.addEventListener( "mediaActivated", { fields: @fields }, (media) => @media_activated(media) )
      @voter.init(@config, this)
      
      mmdebug "MMScreen9 player initialized"

    field_formatters:
      length: (media) ->
        duration = @config.picsearch.parseDuration(media.duration)
        duration.minutes.toString() + "." + ("0" + duration.seconds.toString()).substr(-2, 2) + "min"
      views: (media) ->
        media.downloads_started.toString()
      categoryclass: (media) ->
        media.categoryname.toLowerCase().replace(/-/, "_").replace(/[\u00f6]/g, "o").replace(/[\u00e4\u00e5]/g, "a").replace(/\W+/g, '')
      ratingclass: (media, player) =>
        "rating-" + player.voter.rating_to_stars(parseInt(media.rating))

    media_activated: (media) ->
      if @autoload_url
        @navigation.select_tab_by_title media.categoryname
      api_args = { mediaid: media.mediaid, containerId: @picsearch_player_id, width: @width, height: @height, autoload: true, autoplay: @autoplay }
      config.picsearch.embed api_args, ((media) => @media_loaded(media)), ((media) => @media_failed(media))
      @show_meta media
      @scroll_into_view()
      @autoload_url = @autoload_first = false
      mmdebug "Media activated"

    navigation_ready: ->
      if @autoload_url
        mediaid = location.hash.substring(1, location.hash.length)
        @play mediaid, true
      else if @autoload_first
        list = @navigation.current_list()
        if list.length
          first_video = list.find(".page .video:first-child")
          if first_video.length
            @play first_video.attr "rel"
      mmdebug "MMScreen9 navigation ready"
    
    play: (@mediaid, @autoplay = false) ->
      @voter.hide()
      @config.picsearch.activateMedia(@mediaid)
      
    show_meta: (media) ->
      content = @player_meta_template.html().replace /#{(\w+)}/g, (match...) =>
        formatter = @field_formatters[match[1]]
        if formatter?
          formatter(media, this)
        else
          media[match[1]]
      @player_meta.html content
    
    scroll_into_view: ->
      setTimeout((=>
          player_position = jQuery("##{@picsearch_player_id}").offset().top - 10
          window_scroll_offset = window.pageYOffset
          distance = window_scroll_offset - player_position
          distance = 0 if distance < 0
          delay = 10
          if distance > 0
            interval = setInterval((=> 
                distance = Math.round(distance * 0.7)
                if distance <= 1
                  clearInterval(interval)
                  distance = 0
                window.scrollTo(0, player_position + distance)
              ), delay)
        ), 1000)

    media_loaded: (media) ->
      location.hash = @mediaid
      @voter.show()
    media_failed: (media) ->
      mmdebug "MMScreen9 video failed to load"

    voter:
      init: (@config, @player) ->
        @rating_widget = jQuery @config.rating_widget or "#rating-widget"
        @hide()
        rating_html = '''<div class="rating rating-1">
                          <div class="rating rating-2">
                          <div class="rating rating-3">
                          <div class="rating rating-4">
                          <div class="rating rating-5">
                          </div></div></div></div></div>'''
        @rating_widget.html(rating_html)
        @rating_widget.find(".rating").each (index, element) =>
          jQuery(element).click (event) =>
            event.stopPropagation()
            @vote event.target
        mmdebug "MMScreen9 voter initialized"
      vote: (vote) ->
        @media_rating[0].className = vote.className
        stars = /rating-(\d)/.exec vote.className
        value = @stars_to_rating(stars[1])
        @config.picsearch.assignRating(@player.mediaid, {rating: value})
      show: ->
        @media_rating = @player.player_meta.find(".rating")
        offset = @media_rating.offset()
        @rating_widget.css { position: 'absolute', top: "#{offset.top}px", left: "#{offset.left}px" }
        @rating_widget.show()
      hide: ->
        @rating_widget.hide()
      rating_to_stars: (rating) ->
        Math.round(rating / 20)
      stars_to_rating: (stars) ->
        (parseInt(stars) * 20) - 10
    
  navigation:
    init: (root) ->
      @config             = root.config
      @player             = root.player
      @tabs               = jQuery @config.category_tabs or "#category-tabs"
      @video_lists        = jQuery @config.video_lists or "#video-lists"
      @template_container = jQuery @config.template_container or "#template-container"
      @pagination         = jQuery @config.pagination or "#pagination"
      @page_size          = config.page_size or 12
      @row_size           = config.row_size or 4
      
      @fields             = ["mediaid", "title", "description", "categoryname", "duration", "thumbnail", "posted"]
      
      @config.picsearch.listCategories (result) => @categoryListingResponse(result)
      @pagination.find(".prev-page").click (event) => @previous_page()
      @pagination.find(".next-page").click (event) => @next_page()
      
      mmdebug "MMScreen9 navigation initialized"

    current_tab: ->
      @tabs.find ".current"
      
    set_current_tab: (tab) ->
      tab.addClass "current"
      tab.siblings().removeClass "current"
    
    select_tab: (tab, animate = true) ->
      @set_current_tab tab
      @select_list tab.attr("rel"), animate
    
    select_tab_by_title: (title) ->
      if title
        matching_tab = jQuery.grep @tabs.children(), (tab) ->
          jQuery(tab).text().toLowerCase() is title.toLowerCase()
        @select_tab jQuery(matching_tab), false

    current_list: ->
      @video_lists.find ".video-list.current"

    select_list: (list_id, animate = true) ->
      list = @video_lists.find("#list-#{list_id}")
      if list[0]?
        @set_current_list list
        first_page = list.find(".page-1")
        @set_current_page first_page
        @animate_videos first_page
      else
        @setup_videos { animate: animate, page_no: 1, categoryid: list_id }
    
    set_current_list: (list) ->
      list.addClass "current"
      list.siblings().removeClass "current"
    
    current_page: ->
      @video_lists.find ".page.current"
    
    set_current_page: (page) ->
      old_page = @current_page()
      if old_page?
        old_page.removeClass "current"
      page.addClass "current"
      display = @pagination.find ".page-no"
      if display[0]?
        display.html(page.attr("rel"))
      @enable_pagination()
    
    enable_pagination: ->
      prev_page = @pagination.find(".prev-page").addClass "disabled"
      next_page = @pagination.find(".next-page").addClass "disabled"
      if @has_previous_page()
        prev_page.removeClass "disabled"
      if @has_next_page
        next_page.removeClass "disabled"

     has_previous_page: ->
       parseInt(@current_page().attr("rel")) > 1
     has_next_page: ->
       @current_page().find(".video").length == @page_size  
     
    previous_page: ->
      if @has_previous_page()
        page_no = parseInt @current_page().attr("rel")
        @select_page(page_no - 1)

    next_page: ->
      if @has_next_page()
        page_no = parseInt @current_page().attr("rel")
        @select_page(page_no + 1)

    select_page: (page_no) ->
      list = @current_list()
      page = list.find(".page-#{page_no}")
      if page[0]?
        @set_current_page page
        @animate_videos page
      else
        categoryid = list.attr("rel")
        categoryid = null if categoryid is "alla"
        @setup_videos { categoryid: categoryid, page_no: page_no, animate: true }

    categoryListingResponse: (response) ->
      li = jQuery("<li rel=\"alla\"></li>").text("Alla klipp")
      li.click (event) => @select_tab(jQuery(event.target))
      @tabs.append li
      if !@config.category and @player.autoload_first
        @set_current_tab li
        @setup_videos { page_no: 1 }
      for category in response.categories.reverse()
        li = jQuery("<li rel=\"#{category.categoryid}\">#{category.categoryname}</li>")
        li.click (event) => @select_tab(jQuery(event.target))
        @tabs.append(li)
        if category.categoryname is @config.category
          @set_current_tab li
          @setup_videos {categoryid: category.categoryid, page_no: 1}
      @player.navigation_ready() if @player.autoload_url
      
    setup_videos: (options) ->
      filters = { }
      rel = "alla"
      if options.categoryid? and options.categoryid != "alla"
        rel = filters.categoryid = options.categoryid
      if @config.tag_filter?
        filters.tag_filter = @config.tag_filter
      page_no = options.page_no
      animate = options.animate
      page_start = (page_no * @page_size) - @page_size + 1
      [list, page] = @setup_video_page rel, page_no
      @fetch_videos(list, page, page_start, animate, filters)

    setup_video_page: (rel, page_no) ->
      list = @video_lists.find("#list-#{rel}")
      if !list[0]?
        @video_lists.append( jQuery("<div rel=\"#{rel}\" class=\"video-list\" id=\"list-#{rel}\"></div>") )
        list = @video_lists.find("#list-#{rel}")
      list.append( jQuery("<div id=\"page-#{rel}-#{page_no}\" class=\"page page-#{page_no}\" rel=\"#{page_no}\">") )
      page = list.find(".page-#{page_no}")
      [list, page]
      
    fetch_videos: (list, page, page_start, animate, filters) ->
      mmdebug "Fetching video page: #{page.selector}"
      api_args = { start: page_start, count: @page_size, fields: @fields, filters: filters }
      video_template = @template_container.find(".video")[0]
      @config.picsearch.listMedia api_args, (response) => 
        for media in response.media
          row_pos = " pos-#{_i % @row_size}"
          content = video_template.innerHTML.replace /#{(\w+)}/g, (match...) =>
            formatter = @field_formatters[match[1]]
            if formatter?
              formatter(media)
            else
              media[match[1]]
          video = jQuery("<div rel=\"#{media.mediaid}\" class=\"#{video_template.className}#{row_pos}\"></div>").html(content)
          video.click => 
            @player.play video.attr("rel"), true
          page.append(video)
        @set_current_list list
        @set_current_page page
        @animate_videos page if animate
        @player.navigation_ready() if @player.autoload_first
		
    animate_videos: (page) ->
      @video_lists.css("min-height", "#{page.height()}px")
      page.children().hide()
      page.children().each (index, video) ->
        setTimeout((=> jQuery(video).fadeIn(500)), index*70)
        
          
    field_formatters:
      length: (media) ->
        duration = @config.picsearch.parseDuration(media.duration)
        duration.minutes.toString() + "." + ("0" + duration.seconds.toString()).substr(-2, 2) + "min"
      date: (media) ->
        media.posted.substr(0,10)
      categoryclass: (media) ->
        media.categoryname.toLowerCase().replace(/-/, "_").replace(/[\u00f6]/g, "o").replace(/[\u00e4\u00e5]/g, "a").replace(/\W+/g, '')
      thumbnail: (media) ->
        "<img src=\"#{media.thumbnail}\" />"
    

mmdebug = (thing) ->
  console.log thing if console and console.log

this.MMScreen9 = MMScreen9