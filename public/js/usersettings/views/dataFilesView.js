/*global define*/
//Define libraries this file depends on.
define([
	'jQuery-2.1.4.min',
	'underscore_1.3.3',
	'backbone_0.9.2',  
  'bootstrap-datepicker.min',
  'bootstrap-table',
  'text!../../../js/usersettings/templates/dataFiles.html'
], function ($, _, Backbone, Datepicker, BootstrapTable, DataFilesTemplate) {

	'use strict';

	var DataFilesView = Backbone.View.extend({

		tagName:  'div',
    
    el: '#dataFilesView', 

		template: _.template(DataFilesTemplate),

		// The DOM events specific to an item.
		events: {
      //'click #submitButton': 'logWork',
      //'change #logProject': 'populateWorkType'
      'change #uploadLogFileBtn': 'uploadFile'
		},

		initialize: function () {

		},

    render: function () {
      //debugger;
      try {
        log.push('Executing dataFilesView.js/render()');
      
        this.$el.html(this.template);

        $('#dataFilesView').show();

        this.$el.find('#resultsTable').bootstrapTable({
            sortName: '',
            sortOrder: 'desc',
            showExport: false,
            columns: [{
                field: 'date',
                title: 'Date',
                sortable: true
            }, {
                field: 'format',
                title: 'Format',
                sortable: false
            }, {
                field: 'download',
                title: 'Download',
                sortable: false
            }, {
                field: 'delete',
                title: 'Delete',
                sortable: false
            }
            ],
          });

        this.getUserData();
        
      } catch(err) {
        debugger;
        var msg = 'Error in dataFilesView.js/render() Error: '+err.message;
        console.error(msg);
        log.push(msg);
        sendLog();
        
        global.modalView.closeModal(); //Hide the waiting screen.
      }
      
			return this;
		},
    
    openModal: function() {
      //debugger;
      //global.modalView.render();
      global.modalView.openModal();
    },
    
    //This function is responsible for displaying the User Files in the Bootstrap table.
    getUserData: function() {
      //debugger;
      try {
        log.push('Executing dataFilesView.js/getUserData()');
      
        //Error Handling. Exit if no data userData is defined.
        if(userdata.userData == undefined) {
          return;
        }

        
        var tableData = []; 
        var fileData = global.userFilesModel.get('fileObjs');
        for(var i=0; i < fileData.length; i++) {

          //Skip any files with a status other than 'success'
          if(fileData[i].status != 'success')
            continue;
          
          var lineItem = new Object();
          lineItem.date = '<a href="#/" onclick="global.oneDayMapView.render(\''+fileData[i].fileName+'\')">'+fileData[i].fileName+'</a>';

          var dropDown = $('#dropDownScaffolding').clone(); //Clone the drop-down scaffolding
          dropDown.find('select').attr('id', fileData[i].fileName+'dropdown'); //Remove the ID from the cloned element.
          lineItem.format = dropDown.html();

          lineItem.download = '<a type="button" class="btn btn-primary" href="/uploads/geologs/'+userdata.userData+'/'+fileData[i].fileName+'.json" download>Download</a>';
          lineItem.delete = "<button type='button' class='btn btn-danger' onclick='global.dataFilesView.deleteFile(\""+fileData[i].fileName+"\")'>Delete</button>";

          tableData.push(lineItem);
        }
        
        //Write the results to the table.
        global.dataFilesView.$el.find('#resultsTable').bootstrapTable('load', tableData);

      } catch(err) {
        debugger;
        var msg = 'Error in dataFilesView.js/getUserData() Error: '+err.message;
        console.error(msg);
        log.push(msg);
        sendLog();
        
        global.modalView.closeModal(); //Hide the waiting screen.
      }
    },
    
    downloadFile: function(fileDateStr) {
      debugger;
    },
    
    deleteFile: function(fileDateStr) {
      //debugger;
      try {
        log.push('Executing dataFilesView.js/deleteFile()');
        
        var ans = confirm('Are you sure you want to delete the file '+fileDateStr+'?');

        if(ans) {

          //Hide the map view if the selected file is the one up on the screen.
          if(global.oneDayMapView.currentlyViewedFile == fileDateStr) {
            $('#oneDayMapView').hide();
          }

          $.get('/api/trackinglogfile/remove/'+userdata._id+'/'+fileDateStr, '', function(data) {
            //debugger;

            if(!data.success) {
              console.error('Error trying delete file '+fileDateStr);
              return;
            }

            global.dataFilesView.render();
          });
        }
        
      } catch(err) {
        debugger;
        var msg = 'Error in dataFilesView.js/deleteFile() Error: '+err.message;
        console.error(msg);
        log.push(msg);
        sendLog();
        
        global.modalView.closeModal(); //Hide the waiting screen.
      }
    },
    
    
    uploadFile: function() {
      debugger;
      try {
        log.push('Executing dataFilesView.js/uploadFile()');

        var newFile = $('#uploadLogFileBtn').get(0).files[0];

        //If a new avatar image has been uploaded, then send it to the server.
        if( newFile != undefined ) {

          //Error Handling - Ensure file has a .json extension.
          if(newFile.name.slice(-4) != 'json') {
            alert('Error: Log files must be a GeoJSON Point file with an exentnsion of .json');
            return;
          }

          //Error Handling - Ensure file is a GeoJSON Point file.
          //Based on Stack Overflow Solution: http://stackoverflow.com/questions/23344776/access-data-of-uploaded-json-file-using-javascript
          var reader = new FileReader();
          reader.onload = function(event) {          
            var obj = JSON.parse(event.target.result);

            try {
              if(obj.features[2].properties.timestamp == "") {
                alert('Error: Log files must be a GeoJSON Point file with an exentnsion of .json');
                return;
              }

            } catch (err) {
              alert('Error: Log files must be a GeoJSON Point file with an exentnsion of .json');
              return;
            }

            //File is Valid. Upload to server.

            //Create a promise that resolves after the avatar image has been uploaded.
            var uploadPromise = global.dataFilesView.uploadLogFile();

            //This function gets executed the when promise resolves.
            uploadPromise.done(function(data) {
              debugger;

              if(data.file_upload)
                console.log('Newly uploaded log file GUID: '+data.file_upload._id);

            });

            //This function gets executed if the promise fails.
            uploadPromise.fail(function(err) {
              debugger;
              console.error('Error trying to upload new log file.');
            })

          };
          reader.readAsText(newFile);

        //New avatar image was not uploaded, but user data still needs to be updated.
        }
      
      
      } catch(err) {
        debugger;
        var msg = 'Error in dataFilesView.js/uploadFile() Error: '+err.message;
        console.error(msg);
        log.push(msg);
        sendLog();
        
        global.modalView.closeModal(); //Hide the waiting screen.
      }
      
    },
    
    //This function is called from updateUserData(). It's returns a promise that resolves after an avatar image has successfully been uploaded.
    uploadLogFile: function() {
      //debugger;
      try {
        log.push('Executing dataFilesView.js/uploadLogFile()');
        
        var selectedFile = $('#uploadLogFileBtn').get(0).files[0];

        //Create the FormData data object and append the file to it.
        var newFile = new FormData();
        newFile.append('file_upload', selectedFile); //This is the raw file that was selected

        //Create a new promise object (jQuery called them Deferred).
        var promise = $.Deferred();

        //Upload the image to the server.
        var opts = {
          url: '/api/trackinglogfile/create/'+userdata.userData,
          data: newFile,
          cache: false,
          contentType: false,
          processData: false,
          type: 'POST',

          success: function(data){
            debugger;
            //var avatarId = data.image_upload._id;

            //GET the newly created useravatar DB entry to get all the filename of the public image.
            //This is needed to get the GUID and the new file name.
            //$.get('/api/useravatar/'+avatarId, '', function(data) {
              promise.resolve(data);
            //});

          },

          //This error function is called if the POST fails for submitting the file itself.
          error: function(err) {
            debugger;
            promise.reject(err);
          }

        };

        //Execute the AJAX operation, and return a promise.
        jQuery.ajax(opts);      
        return promise;
        
      } catch(err) {
        debugger;
        var msg = 'Error in dataFilesView.js/uploadLogFile() Error: '+err.message;
        console.error(msg);
        log.push(msg);
        sendLog();
        
        global.modalView.closeModal(); //Hide the waiting screen.
      }
    },
    
	});
  

  //debugger;
	return DataFilesView;
});
