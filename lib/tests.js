jQuery(document).ready(function(){
  (function($){

    // Insert test markup in html to display test results
    (function(){
      var markup = "<div id='qunit-container'>\n<h1 id='qunit-header'>QUnit Test Suite</h1>\n<h2 id='qunit-banner'></h2>\n<div id='qunit-testrunner-toolbar'></div>\n<h2 id='qunit-userAgent'></h2>\n<ol id='qunit-tests'></ol>\n<div id='qunit-fixture'>test markup</div>\n</div>";
      $("body").append(markup);
      $("#qunit-container").css({'position': 'absolute', 'top': '10px', 'right': '10px', 'width': '500px'});
    })();
    
    /* Tests that the MMScreen9 object and sub-objects were properly initialized */
    module("Object initialization");
    
    test("MMScreen9", function(){
      ok(MMScreen9, "MMScreen9");
      ok(MMScreen9.player, "MMScreen9.player");
      ok(MMScreen9.player.voter, "MMScreen9.player.voter");
      ok(MMScreen9.navigation, "MMScreen9.navigation");
      ok(MMScreen9.search, "MMScreen9.search");
    });
    
    var assert_jq_obj = function(jqobj, description){
      equal(jqobj.length, 1, description + ": found one");
      ok(jqobj[0], description + ": exists");
    };
    
    var assert_dom_obj = function(dom_id, description){
      var jqobj = $(dom_id);
      assert_jq_obj(jqobj, description);
    };
    
    /* Tests that the html markup on which the system depends on exists */
    module("HTML compatibility");

    test("MMScreen9.player", function(){
      assert_dom_obj("#" + MMScreen9.player.picsearch_player_id, "picsearch_player_id");
      assert_jq_obj(MMScreen9.player.player_meta, "player_meta");
      assert_jq_obj(MMScreen9.player.player_meta_template, "player_meta_template");
    });

    test("MMScreen9.player.voter", function(){
      assert_jq_obj(MMScreen9.player.voter.rating_widget, "rating_widget");
      assert_dom_obj("#" + MMScreen9.player.voter.player_meta_rating_id, "player_meta_rating_id");
    });
    
    test("MMScreen9.navigation", function(){
      assert_jq_obj(MMScreen9.navigation.tabs, "tabs");
      assert_jq_obj(MMScreen9.navigation.video_lists, "video_lists");
      assert_jq_obj(MMScreen9.navigation.template_container, "template_container");
      assert_jq_obj(MMScreen9.navigation.pagination, "pagination");
    });

    test("MMScreen9.search", function(){
      assert_jq_obj(MMScreen9.search.search_results_container, "search_results_container");
    });

    
  })(jQuery);
});

