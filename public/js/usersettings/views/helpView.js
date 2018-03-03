/*global define*/
//Define libraries this file depends on.
define([
	'jQuery-2.1.4.min',
	'underscore_1.3.3',
	'backbone_0.9.2',  
  'text!../../../js/usersettings/templates/helpDashboard.html',
  'text!../../../js/usersettings/templates/helpDataFiles.html',
  'text!../../../js/usersettings/templates/helpProfile.html',
  //'/js/lib/bootstrap-table.js'
], function ($, _, Backbone, HelpDashboardTemplate, HelpDataFilesTemplate, HelpProfileTemplate) {
            //  BootstrapTable
            // ) {
	'use strict';

	var HelpView = Backbone.View.extend({

		tagName:  'div',
    
    el: '#helpView', 

		template: _.template(HelpDashboardTemplate),

		// The DOM events specific to an item.
		events: {
      //'click #submitButton': 'logWork',
      //'change #logProject': 'populateWorkType'
		},

		initialize: function () {

		},

    render: function () {
      //debugger;
      try {
        log.push('Executing helpView.js/render()');
        
        this.$el.html(this.template);

        this.$el.show();


      } catch(err) {
        debugger;
        var msg = 'Error in helpView.js/render() Error: '+err.message;
        console.error(msg);
        log.push(msg);
        sendLog();
        
        global.modalView.closeModal(); //Hide the waiting screen.
      }
      
			return this;
		},
    
    showDashboardHelp: function() {
      //debugger;
      
      this.template = _.template(HelpDashboardTemplate);
      this.render();
    },
    
    showDataFileHelp: function() {
      //debugger;
      
      this.template = _.template(HelpDataFilesTemplate);
      this.render();
    },
    
    showProfileHelp: function() {
      //debugger;
      
      this.template = _.template(HelpProfileTemplate);
      this.render();
    },
    
	});
  

  //debugger;
	return HelpView;
});
