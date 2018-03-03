/*global define*/
//Define libraries this file depends on.
define([
	'jQuery-2.1.4.min',
	'underscore_1.3.3',
	'backbone_0.9.2',  
  'bootstrap-datepicker.min',
  '/js/lib/bootstrap-table.js',
  'text!../../../js/usersettings/templates/mapSettings.html'
], function ($, _, Backbone, Datepicker, BootstrapTable, MapSettingsTemplate) {
            //  BootstrapTable
            // ) {
	'use strict';

	var MapSettingsView = Backbone.View.extend({

		tagName:  'div',
    
    el: '#mapSettingsView', 

		template: _.template(MapSettingsTemplate),

		// The DOM events specific to an item.
		events: {
      //'click #submitButton': 'logWork',
      'change #makePublicCheckbox': 'changePrivacy',
      'click #addKeepOut': 'addKeepOut'
		},

		initialize: function () {

		},

    render: function () {
      //debugger;
      
      try {
        log.push('Executing mapSettingsView.js/render()');
        
        this.$el.html(this.template);

        $('#mapSettingsView').show();

        //Initialize the checkbox and input text box based on user settings.
        if(userdata.privateMapData) {
          this.$el.find('#makePublicCheckbox').prop('checked', false); //Uncheck the checkbox
          this.$el.find('#embedCodeText').val(''); //Clear the input text box.
          this.$el.find('#embedCodeText').prop('disabled', true); //Disable the input text box
          this.$el.find('#shareLink').val('');
          this.$el.find('#shareLink').prop('disabled', true);
        } else {
          this.$el.find('#makePublicCheckbox').prop('checked', true); //Uncheck the checkbox
          this.$el.find('#embedCodeText').removeAttr("disabled"); //Enable the input text box
          this.$el.find('#shareLink').removeAttr("disabled"); //Enable the input text box

          //Fill in the input text box with the appropriate information.
          var embedCode = '<iframe src="http://crumbshare.net/uploads/geologs/'+userdata.userData+'/embedMap.html" height="600" width="800"></iframe>';
          this.$el.find('#embedCodeText').val(embedCode);
          var shareLink = "http://crumbshare.net/uploads/geologs/'+userdata.userData+'/embedMap.html";
          this.$el.find('#shareLink').val(shareLink);
        }

        //Initialize the Keep Out table.
        this.initKeepOut();
      
      } catch(err) {
        debugger;
        var msg = 'Error in mapSettingsView.js/render() Error: '+err.message;
        console.error(msg);
        log.push(msg);
        sendLog();
        
        global.modalView.closeModal(); //Hide the waiting screen.
      }
        
			return this;
		},
    
    //This function is called anytime the 'Make Data Public' checkbox is changed (checked or unchecked).
    changePrivacy: function() {
      //debugger;
      
      try {
        log.push('Executing mapSettingsView.js/changePrivacy()');
        
        var checkBoxState = this.$el.find('#makePublicCheckbox').is(':checked');

        //If the checkbox is checked, make the map data public.
        if(checkBoxState) {

          this.$el.find('#embedCodeText').removeAttr("disabled"); //Enable the input text box
          this.$el.find('#shareLink').removeAttr("disabled"); //Enable the input text box

          //Fill in the input text box with the appropriate information.
          var embedCode = '<iframe src="http://crumbshare.net/uploads/geologs/'+userdata.userData+'/embedMap.html" height="600" width="800"></iframe>';
          this.$el.find('#embedCodeText').val(embedCode);
          var shareLink = "http://crumbshare.net/uploads/geologs/'+userdata.userData+'/embedMap.html";
          this.$el.find('#shareLink').val(shareLink);

          //Make an API call to move the user data to the /public directory.
          //This API call also CLEARS the privateMapData flag in the User model.
          $.post('/api/users/'+userdata._id+'/makepublic', '', function(data) {
            //debugger;
            console.log('privateMapData flag = '+data.user.privateMapData);
          })
          .fail(function(jqXHR, textStatus, errorThrown) {
            debugger;
            console.error('Error: '+errorThrown+' Server status returned: '+jqXHR.status);
          });

          userdata.privateMapData = false; //Change the privacy flag
          //global.editProfileView.updateUserData(); //Update the user data model on the server.

        //If it's unchecked, make the map data private.
        } else {
          userdata.privateMapData = true; //Change the user data

          this.$el.find('#embedCodeText').val(''); //Clear the input text box.
          this.$el.find('#embedCodeText').prop('disabled', true); //Disable the input text box

          this.$el.find('#shareLink').val(''); //Clear the input text box.
          this.$el.find('#shareLink').prop('disabled', true); //Disable the input text box

          //Make an API call to delete the user data to the /public directory.
          //This API call also SETS the privateMapData flag in the User model.
          $.post('/api/users/'+userdata._id+'/makeprivate', '', function(data) {
            //debugger;
            console.log('privateMapData flag = '+data.user.privateMapData);

            //Disable the Public Profile on the editProfileView.js if the Public Profile checkbox is checked.
            if(global.editProfileView.$el.find('#showProfile').prop('checked')) {
              global.editProfileView.$el.find('#showProfile').prop('checked', false); //Check the box
              global.editProfileView.toggleAbout();
              userdata.publicProfile = false;
              //Persistance to the DB is handled by the API.
            }
          })
          .fail(function(jqXHR, textStatus, errorThrown) {
            debugger;
            var msg = 'Error: '+errorThrown+' Server status returned: '+jqXHR.status;
            console.error(msg);
            sendLog();
          });

          userdata.privateMapData = true; //Change the privacy flag on the global variable

        }
        
      } catch(err) {
        debugger;
        var msg = 'Error in mapSettingsView.js/changePrivacy() Error: '+err.message;
        console.error(msg);
        log.push(msg);
        sendLog();
        
        global.modalView.closeModal(); //Hide the waiting screen.
      }

    },
    
    //This function is called when the user clicks on the '+' button to add a Keep-Out coordinate.
    addKeepOut: function() {
      //debugger;
      
      try {
        log.push('Executing mapSettingsView.js/addKeepOut()');
        
        var ans = confirm('Are you sure you want to add these coordinates? All data files will be '+
                          'scrubbed and data falling within this keep out area will be deleted.');
        if(!ans) {
          return;
        }

        //Throw up the spinny waiting gif
        global.modalView.waitingModal();

        log.push('starting mapSettingsView.js/addKeepOut()');

        //Ensure the all input fields are numbers.
        var lat = Number(this.$el.find('#lat1').val());
        var long = Number(this.$el.find('#long1').val());
        var radius = Number(this.$el.find('#radius1').val());
        if(isNaN(lat) || isNaN(long) || isNaN(radius)) {
          alert('Coordinates and radius must be numbers!');
          return;
        }
        if( (lat==0) || (long==0) || (radius==0) ) return;

        log.push('addKeepOut: Input lat, long, and radius validated.');

        //if the 'Make Data Public' is checked
        //Call /makeprivate to remove all data from the public directory
        var checkBoxState = this.$el.find('#makePublicCheckbox').is(':checked');
        if(checkBoxState) {

          this.$el.find('#makePublicCheckbox').prop('checked', false); //Uncheck the checkbox

          this.changePrivacy(); //Delete the files in the /public directory.
        }

        //Add coordinates and radius to the UserData model
        var inputData = {'coordinates': lat+','+long+','+radius};
        $.get('/api/keepout/add/'+userdata._id, inputData, function(data) {
          //debugger;

          if(checkBoxState) {
            //Wait a few seconds before issuing the commands, to give the server time to process all 
            //the files in the /private directory.
            setTimeout(function() {
              global.mapSettingsView.$el.find('#makePublicCheckbox').prop('checked', true); //Uncheck the checkbox

              global.mapSettingsView.changePrivacy(); //Re-populate the /public directory with scrubbed files.

              //Hide the waiting screen.
              global.modalView.closeModal();
            }, 5000);
          } else {
            //Hide the waiting screen.
            global.modalView.closeModal();
          }

          global.mapSettingsView.render();
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
          debugger;
          var msg = 'Error: '+errorThrown+' Server status returned: '+jqXHR.status;
          console.error(msg);
          log.push('addKeepOut: Error while calling /keepout/add: '+msg);
          sendLog();
          //Hide the waiting screen.
          global.modalView.closeModal();
        });
      
      } catch(err) {
        debugger;
        var msg = 'Error in mapSettingsView.js/addKeepOut() Error: '+err.message;
        console.error(msg);
        log.push(msg);
        sendLog();
        
        global.modalView.closeModal(); //Hide the waiting screen.
      }
        
    },
    
    //This function is called by render. It creates a Bootstrap table of Keep Out coordinates 
    //if there are any stored in the UserData model for this user.
    initKeepOut: function() {
      //debugger;
      try {
        log.push('Executing mapSettingsView.js/initKeepOut()');
        
        this.$el.find('#keepOutRow').show();

        $.get('/api/userdata/'+userdata.userData, '', function(data) {
          //debugger;

          var userData = data.geodata;

          if(userData.keepOut) {
            if(userData.keepOut.length > 0) {

              //Initialize the table.
              global.mapSettingsView.$el.find('#keepOutTable').bootstrapTable({
                sortName: 'lat',
                sortOrder: 'desc',
                showExport: false,
                columns: [{
                    field: 'lat',
                    title: 'Latitude',
                    sortable: true
                }, {
                    field: 'long',
                    title: 'Longitude',
                    sortable: true
                }, {
                    field: 'radius',
                    title: 'Radius (feet)',
                    sortable: false
                }, {
                    field: 'delete',
                    title: 'Delete',
                    sortable: false
                }
                ],
              });

              //Loop through the Keep Out coordinates.
              var tableData = [];
              for(var i=0; i<userData.keepOut.length; i++) {
                var coords = userData.keepOut[i].split(',');
                var obj = new Object();

                obj.lat = coords[0];
                obj.long = coords[1];
                obj.radius = coords[2];

                obj.delete = '<center><button class="btn btn-danger" onclick="global.mapSettingsView.removeKeepOut(\''+
                  userData.keepOut[i]+'\')" style="font-size: 20px; font-weight: bold;">-</button></center>';

                tableData.push(obj);
              }
              global.mapSettingsView.$el.find('#keepOutTable').bootstrapTable('load', tableData);

            } else {
              $('#keepOutRow').hide();
            }
          } else {
            $('#keepOutRow').hide();
          }

        })
        .fail(function(jqXHR, textStatus, errorThrown) {
          debugger;
          var msg = 'Error: '+errorThrown+' Server status returned: '+jqXHR.status;
          console.error(msg);
          log.push('addKeepOut: Error while calling /api/userdata: '+msg);
          sendLog();
        });
        
      } catch(err) {
        debugger;
        var msg = 'Error in mapSettingsView.js/initKeepOut() Error: '+err.message;
        console.error(msg);
        log.push(msg);
        sendLog();
        
        global.modalView.closeModal(); //Hide the waiting screen.
      }
    },
    
    removeKeepOut: function(keepOutCoords) {
      //debugger;
      try {
        log.push('Executing mapSettingsView.js/removeKeepOut()');
        
        var ans = confirm('Are you sure you want to delete these coordinates?');
        if(!ans) {
          return;
        }

        var obj = {
          keepOutCoords: keepOutCoords
        }

        $.get('/api/keepout/remove/'+userdata._id, obj, function(data) {
          //debugger;

          try {

            //Error handling
            if(!data.success) {
              if(data.message) {
                var msg = 'Error returned by /api/keepout/remove API. '+data.message;
                console.error(msg);
                log.push('removeKeepOut: '+msg);
              } else {
                var msg = 'Error returned by /api/keepout/remove API. ';
                console.error(msg);
                log.push('removeKeepOut: '+msg);
              }
            }

            //Re-render the View
            global.mapSettingsView.render();

            //Hide the waiting screen.
            global.modalView.closeModal();

          } catch(err) {
            debugger;
            var msg = 'Error in /api/keepout/remove handler. Error: '+err.message;
            console.error(msg);
            log.push('removeKeepOut: '+msg);
            sendLog();
            
            //Hide the waiting screen.
            global.modalView.closeModal();
          }


        })
        .fail(function(jqXHR, textStatus, errorThrown) {
          debugger;
          var msg = 'Error: '+errorThrown+' Server status returned: '+jqXHR.status+'; Server message: '+jqXHR.responseText;
          console.error(msg);
          log.push('addKeepOut: Error while calling /api/keepout/remove: '+msg);
          sendLog();
          
          //Hide the waiting screen.
          global.modalView.closeModal();
        });
        
      } catch(err) {
        debugger;
        var msg = 'Error in mapSettingsView.js/removeKeepOut() Error: '+err.message;
        console.error(msg);
        log.push(msg);
        sendLog();
        
        global.modalView.closeModal(); //Hide the waiting screen.
      }
    }
    
	});
  

  //debugger;
	return MapSettingsView;
});
