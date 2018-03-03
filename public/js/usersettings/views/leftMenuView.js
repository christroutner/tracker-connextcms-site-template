/*global define*/
define([
	'jQuery-2.1.4.min',
	'underscore_1.3.3',
	'backbone_0.9.2',
	'text!../../../js/usersettings/templates/leftMenu.html'
], function ($, _, Backbone, LeftMenuTemplate) {
	'use strict';

	var LeftMenuView = Backbone.View.extend({

		tagName:  'div',
    
    el: '#leftMenu',

		template: _.template(LeftMenuTemplate),

		// The DOM events specific to an item.
		events: {
			//'click .toggle':	'toggleCompleted',
			//'dblclick label':	'edit',
			//'click .destroy':	'clear',
			//'keypress .edit':	'updateOnEnter',
			//'keydown .edit':	'revertOnEscape',
			//'blur .edit':		'close'
      'click #dashboardLink': 'showDashboard',
      'click #dataFiles': 'showDataFiles',
      'click #editProfileLink': 'showEditProfile'
		},

		// The TodoView listens for changes to its model, re-rendering. Since there's
		// a one-to-one correspondence between a **Todo** and a **TodoView** in this
		// app, we set a direct reference on the model for convenience.
		initialize: function () {
			//this.listenTo(this.model, 'change', this.render);
			//this.listenTo(this.model, 'destroy', this.remove);
			//this.listenTo(this.model, 'visible', this.toggleVisible);
		},

		// Re-render the titles of the todo item.
		render: function () {
			//this.$el.html(this.template(this.model.toJSON()));
      this.$el.html(this.template);
			//this.$el.toggleClass('completed', this.model.get('completed'));

			//this.toggleVisible();
			//this.$input = this.$('.edit');
			return this;
		},
    
    showDashboard: function() {
      //debugger;
      
      //Hide old Views and show new one.
      $('#dashboardView').show();
      $('#dataFilesView').hide();
      $('#editProfileView').hide();
      $('#oneDayMapView').hide();
      
      //Show the Dashboard help
      global.helpView.showDashboardHelp();
      
      //Remove the 'active' class from the menu item, unless it's a treeview menu item.
      //(treeview) menu items will remove their active class in their click event.
      if( !$('.sidebar-menu').find('.active').hasClass('treeview') )
        $('.sidebar-menu').find('.active').removeClass('active');
      else
        this.closeCollapsableLeftMenu();
      
      //Switch the 'active' class to the selected menu item
      $('#dashboardLink').parent().addClass('active');
      
    
      $('#app-location').text('Dashboard');
    },
    
    showDataFiles: function() {
      $('#dashboardView').hide();
      $('#dataFilesView').show();
      $('#editProfileView').hide();
      $('#oneDayMapView').hide();
      
      //Change navigation breadcrumb.
      $('#app-location').text('Data Files');
      
      //Show Data Files Help
      global.helpView.showDataFileHelp();
      
      //Remove the 'active' class from the menu item, unless it's a treeview menu item.
      //(treeview) menu items will remove their active class in their click event.
      if( !$('.sidebar-menu').find('.active').hasClass('treeview') )
        $('.sidebar-menu').find('.active').removeClass('active');      
      //Switch the 'active' class to the selected menu item
      $('#dataFiles').parent().addClass('active');
      
      global.dataFilesView.render();
    },
    
    showEditProfile: function() {
      $('#dashboardView').hide();
      $('#dataFilesView').hide();
      $('#oneDayMapView').hide();
      
      $('#app-location').text('Edit Profile');
      
      //Show Data Files Help
      global.helpView.showProfileHelp();
      
      //Remove the 'active' class from the menu item, unless it's a treeview menu item.
      //(treeview) menu items will remove their active class in their click event.
      if( !$('.sidebar-menu').find('.active').hasClass('treeview') )
        $('.sidebar-menu').find('.active').removeClass('active');      
      //Switch the 'active' class to the selected menu item
      $('#editProfileLink').parent().addClass('active');
      
      global.editProfileView.render();
    },
    
    
    //This function copied from adminlte.js. Moved here as it controls the animation of this view
    //and the animation was getting screwed up.
    treeMenu: function(e, linkElem) {
      //debugger;
      
      //Get the clicked link and the next element
      var $this = $(linkElem);
      var checkElement = $this.next();
      var animationSpeed = $.AdminLTE.options.animationSpeed;
      var _this = $.AdminLTE;
      
      //Check if the next element is a menu and is visible
      if ((checkElement.is('.treeview-menu')) && (checkElement.is(':visible'))) {
        //Close the menu
        checkElement.slideUp(animationSpeed, function () {
          checkElement.removeClass('menu-open');
          //Fix the layout in case the sidebar stretches over the height of the window
          //_this.layout.fix();
        });
        checkElement.parent("li").removeClass("active");
      }
      //If the menu is not visible
      else if ((checkElement.is('.treeview-menu')) && (!checkElement.is(':visible'))) {
        //Get the parent menu
        var parent = $this.parents('ul').first();
        //Close all open menus within the parent
        var ul = parent.find('ul:visible').slideUp(animationSpeed);
        //Remove the menu-open class from the parent
        ul.removeClass('menu-open');
        //Get the parent li
        var parent_li = $this.parent("li");

        //Open the target menu and add the menu-open class
        checkElement.slideDown(animationSpeed, function () {
          //Add the class active to the parent li
          checkElement.addClass('menu-open');
          parent.find('li.active').removeClass('active');
          parent_li.addClass('active');
          //Fix the layout in case the sidebar stretches over the height of the window
          _this.layout.fix();
        });
      }
      //if this isn't a link, prevent the page from being redirected
      if (checkElement.is('.treeview-menu')) {
        try{
          e.preventDefault();
        } catch(err) {
          if( e == undefined ) {
            log.push('treeMenu() called without event.');
          } else {
            console.error('Unhandled error in treeMenu() in leftMenuView.js. Error:');
            console.error(err.message);
            
            log.push('Unhandled error in treeMenu() in leftMenuView.js. Error:');
            log.push(err.message);
            sendLog();
          }
        }
      }
    },
    
    //This function is called to close collapsable menus.
    closeCollapsableLeftMenu: function() {
      //debugger;
      
      var $this = $('.menu-open').parent().find('a');
      var checkElement = $this.next();
      var animationSpeed = $.AdminLTE.options.animationSpeed;
      
      //Check if the next element is a menu and is visible
      if ((checkElement.is('.treeview-menu')) && (checkElement.is(':visible'))) {
        //Close the menu
        checkElement.slideUp(animationSpeed, function () {
          checkElement.removeClass('menu-open');
          //Fix the layout in case the sidebar stretches over the height of the window
          //_this.layout.fix();
        });
        checkElement.parent("li").removeClass("active");
      }
    },
    
		
	});

  //debugger;
	return LeftMenuView;
});
