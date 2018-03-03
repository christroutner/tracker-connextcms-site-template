define([
  'jQuery-2.1.4.min',
	'underscore_1.3.3',
	'backbone_0.9.2',
], function ($, _, Backbone) {

  
  //Create local Model to represent the Post model I'll retrieve from the server.
  var UserFilesModel = Backbone.Model.extend({

    idAttribute: "_id",  //Map the Model 'id' to the '_id' assigned by the server.

    //When initialized this.id is undefined. This url gets fixed in the initialize() function.
    //url: 'http://'+global.serverIp+':'+global.serverPort+'/api/post/'+this.id+'/update', 
    url: '',

    //Initialize is called upon the instantiation of this model. This function is executed once
    //per model retrieved from the server.
    initialize: function() {
      //This function is often used for debugging, so leave it here.
      //this.on('change', function() {
        //debugger;        
      //  this.save();
      //});
      //debugger;

      //this.url = 'http://'+global.serverIp+':'+global.serverPort+'/api/logwork/'+this.id+'/update';
      this.url = '/api/userfiles/'+this.id+'/update';
      
      //Create a variable to capture the scope of this model.
      var globalThis = this;
      
      if(userdata.userData == undefined) {
        console.log('UserData is undefined. Halting load.');
        return;
      }
      
      //Get the file list of available log files from the user data on the server.
      $.get('/api/userdata/'+userdata.userData, '', function(data) {
        //debugger;

        var userDataModel = data.geodata;
        var userFileId = userDataModel.userFiles;

        $.get('/api/userfiles/'+userFileId, '', function(data) {
          //debugger;
          
          //Save the textArray of user files JSON data to the Backbone model.
          globalThis.set('textArray', data.collection.textArray);
          
          //Parse the JSON data into objects and add an array of these parsed objects to the Backbone model.
          var tmpArray = [];
          for(var i=0; i < data.collection.textArray.length; i++) {
            var tmpObj = JSON.parse(data.collection.textArray[i]);
            
            //Add Date object and index value
            var dateStr = tmpObj.fileName.slice(0,2)+'/'+tmpObj.fileName.slice(2,4)+'/'+tmpObj.fileName.slice(4,6);
            tmpObj.date = new Date(dateStr);
            tmpObj.userFilesIndex = i;
            
            tmpArray.push(tmpObj);
            
          }
          
          //Sort the array by date
          tmpArray.sort(function(a,b) {
            //a = new Date(a.date.timeStamp);
            //b = new Date(b.date.timeStamp);
            return a.date > b.date ? -1 : a.date < b.date ? 1 : 0;
          });
          
          //Save the formatted data to the model.
          globalThis.set('fileObjs', tmpArray);
          
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
          debugger;

          console.error('Error: '+errorThrown+' Server status returned: '+jqXHR.status);
        });
        
      })
      .fail(function(jqXHR, textStatus, errorThrown) {
        debugger;

        console.error('Error: '+errorThrown+' Server status returned: '+jqXHR.status);
      });
    },

    defaults: {
      '_id': '',
      'author': '',
      'userData': '',
      'textArray': [],
      'fileObjs': []
    },
    
    //Override the default Backbone save() function with one that our API understands.
    save: function() {
      //debugger;

      $.getJSON(this.url, this.attributes, function(data) {
        //Regardless of success or failure, the API returns the JSON data of the model that was just updated.
        //debugger;
        log.push('UserFilesModel.save() executed.');
        
        //if(global.userCollection != undefined)
        //  global.userCollection.fetch();

      }).error( function(err) {
        //This is the error handler.
        //debugger;
        log.push('Error while trying UserFilesModel.save(). Most likely due to communication issue with the server.');
        sendLog();
        console.error('Communication error with server while executing UserFilesModel.save()');
      });

    }
  });
  
  return UserFilesModel;

});
