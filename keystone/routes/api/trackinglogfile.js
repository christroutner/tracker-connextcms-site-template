var async = require('async'),
keystone = require('keystone');
var exec = require('child_process').exec;
var fs = require('fs');
var http = require('http'); //Used for GET and POST requests
var request = require('request'); //Used for CURL requests.
var Promise = require('node-promise'); //Promises to handle asynchonous callbacks.

var TrackingData = keystone.list('TrackingLogFile');
var UserData = keystone.list('UserData');
var UserFiles = keystone.list('UserFiles');
var User = keystone.list('User');
var updateReady = true;
var security = keystone.security;

//A global variable used by processLogFile() and supported functions.
var logObj = new Object();
logObj.state = 0;                 //State of the function.
logObj.filename = "";             //Name of the temp log file.
logObj.logfile = "";              //Name of the filtered log file saved to the server.
logObj.userDataId = "";
logObj.userId = "";
logObj.req = undefined;
logObj.serverLastDate = "";       //The newest date stored in the log file, before scrubbing.
logObj.lastValidDate = "";        //The newest date stored in the log file, after scrubbing.
logObj.logFileDate = undefined;   //Date object matching the logfile name.
logObj.clientData = undefined;    //GeoJSON data read in from the temp log file.
logObj.filteredData = undefined;  //GeoJSON data filtered so that it spans only the target date.
logObj.rolloverData = undefined;  //Any GeoJSON newer than the target date.
logObj.breakIndex = 0;            //Index in clientData where data splits from target date to next day.
logObj.keepOut = [];              //Array of keep out coordinates stored in the UserData model.

/**
 * List Images
 */
exports.list = function(req, res) {
        TrackingData.model.find(function(err, items) {

                if (err) return res.apiError('database error', err);

                res.apiResponse({
                        collections: items
                });

        });
}

/**
 * Get Image by ID
 */
exports.get = function(req, res) {

  //logTS('ID: '+req.params.id);
  //logTS('Filename: '+req.params.filedate);
  logTS('Retrieving '+req.params.filedate+'.json for UserData ID '+req.params.id);

  var userDataId = req.params.id;
  var filedate = req.params.filedate;
  var filename = filedate+'.json';

  UserData.model.findById(req.params.id).exec(function(err, userDataModel) {

    //Error handling
    if(err) return res.apiError('database error', err);
    if(!userDataModel) return res.apiError(userDataId+' not found');

    var userFilesModelId = userDataModel.get('userFiles');
      
    //Retrieve the UserFiles model referenced by the UserData model.
    UserFiles.model.findById(userFilesModelId).exec(function(err, userFilesModel) {

      //Error handling
      if(err) return res.apiError('database error', err);
      if(!userFilesModel) return res.apiError('not found');

      try {
      
        var textArray = userFilesModel.get('textArray');

        //Find the entry that corresponds to this filename entry
        var fileStatusIndex = -1;
        for(var i=0; i < textArray.length; i++) {
          var hit = textArray[i].indexOf(filedate);
          if(hit > -1) {
            //debugger;
            fileStatusIndex = i;
            break;
          }
        }

        //If the filename exists in the UserFiles text array.
        if(fileStatusIndex > -1) {

          //Retreive the JSON string for this file and convert into a JavaScript object.
          var thisFileStatus = textArray[fileStatusIndex];
          thisFileStatus = JSON.parse(thisFileStatus);

          var filename = thisFileStatus.fileName;
        
          //Read in the JSON file
          fs.readFile('private/userdata/'+userDataId+'/'+filename+'.json', function(err, data) {
            if(err) {
              logTS('Error: '+err.message);
              return res.apiError(filename+' not found');
            }

            //Error Handling
            if((data.length == 0) || (data == "")) {
              logTS('Data file '+filename+'.json is empty. Exiting.');
              return;
            }

            //Parse the JSON data
            var serverData = data.toString();
            serverData = JSON.parse(serverData);

            //Return the JSON data.
            res.apiResponse({
              success: true,
              data: serverData 
            });

          });
         

        //If the file name does not exist in the array, no further processing necessary.
        } else {
          debugger;
          console.error('Error in /api/trackinglogfile/status: '+filedate+' does not exist in the UserFile Text Array!');
          return res.apiError('not found');
        }
        
      //Catch any errors
      } catch(err) {
        console.error('Error in trackinglogfile/get:', err);
        return res.apiError('Error in trackinglogfile/get: ', err)
      }

    });
    
    

  })

}


/**
 * Update Image by ID
 */
exports.update = function(req, res) {
        TrackingData.model.findById(req.params.id).exec(function(err, item) {

                if (err) return res.apiError('database error', err);
                if (!item) return res.apiError('not found');

                var data = (req.method == 'POST') ? req.body : req.query;

                item.getUpdateHandler(req).process(data, function(err) {
                  debugger;
                        if (err) return res.apiError('create error', err);

                        res.apiResponse({
                                collection: item
                        });

                });

        });
}

/**
 * Upload a New Image
 */
exports.create = function(req, res) {
  //debugger;

  UserData.model.findById(req.params.id).exec(function(err, item) {
    
    //debugger;
    
    //Error handling.
    if (err) return res.apiError('database error', err);
    if (!item) return res.apiError('UserData not found');
    
    //Get the last server date from the User model.
    var serverLastDate = item.get('lastDate');
    var userId = req.params.id;
    
    //Save the UserId to the global variable
    logObj.userId = item.get('author');
    logObj.keepOut = item.get('keepOut'); //Save the keepOut coordinates.
    
    //Create a new tracking model.
    var item = new TrackingData.model(),
      data = (req.method == 'POST') ? req.body : req.query;

    //Attach the uploaded file to the new tracking model.
    item.getUpdateHandler(req).process(req.files, function(err) {
      //debugger;
      
      if (err) return res.apiError('error', err);

      res.apiResponse({
              file_upload: item
      });

      var fileData = item.get('file');
      
      //Process the log file.
      logObj.serverLastDate = serverLastDate;
      logObj.userDataId = userId;
      logObj.req = req;
      logObj.filename = fileData.filename;
      logObj.originalFilename = req.files.file_upload.originalname;
      processLogFile();

    });
    
  })
  
 
  
  
}

/**
 * Delete Image by ID
 */
exports.remove = function(req, res) {
  
  //Retrieve the list of superusers saved in keystone.js
  var superusers = keystone.get('superusers');
  
  //Ensure the user making the request is either the user being changed or a superuser. 
  //Reject normal admins or users maliciously trying to change other users settings.
  var userId = req.user.get('id');
  if(userId != req.params.id) {
    if(superusers.indexOf(userId) == -1) {
      return res.apiError(403, 'Not allowed to change this user settings.');
    }
  }
  
  logTS('datestr = '+req.params.filedate);
  logTS('user GUID = '+req.user.get('id'));
  logTS('userData GUID = '+req.user.get('userData'));
  
  var fileDate = req.params.filedate;
  var userDataId = req.user.get('userData');
  
  //Get the userData model associated with this user
  UserData.model.findById(userDataId).exec(function(err, item) {
  
    //Error Handling
    if (err) return res.apiError('database error', err);
    if (!item) return res.apiError('not found');
    
    //Remove the datestr from the TextArray of files.
    var logFiles = item.get('fileList');
    var index = logFiles.indexOf(fileDate);
    
    //Error Handling
    if(index == -1) return res.apiResponse({ success: false, message: 'not found' });
    
    //Remove the element from the array.
    logFiles.splice(index, 1); 
    
    //Save the changed model to the database.
    item.set('fileList', logFiles);
    item.save(function(err) {
      if(err) return res.apiError('Error saving model data', err);
    });
    
    
    //Remove the log file from the server.
    exec('rm private/userdata/'+userDataId+'/'+fileDate+'.json', function(err, stdout, stderr) {
      if (err) {
          logTS('Deleting private file: child process exited with error code ' + err.code);
          logTS(stderr);
          return;
      }
      
      logTS(stdout);
      
      //Attempt to delete the file in the public directory if it exists
      exec('rm public/uploads/geologs/'+userDataId+'/'+fileDate+'.json', function(err, stdout, stderr) {
        if (err) {
            logTS('Deleting public file: child process exited with error code ' + err.code);
            logTS(stderr);
            return;
        }

        logTS(stdout);

        return res.apiResponse({
          success: true
        });
      });
    });
    
  });  
    
}

exports.status = function(req, res) {
  //debugger;

  var userDataId = req.params.id;
  var filedate = req.params.filedate;
  var filename = filedate+'.json';

  logTS('Retrieving upload status on '+filename+' for UserData ID '+userDataId);
  
  UserData.model.findById(userDataId).exec(function(err, userDataModel) {
    
    //Error handling
    if(err) return res.apiError('database error', err);
    if(!userDataModel) return res.apiError('not found');
    
    try {
      
      var userFilesModelId = userDataModel.get('userFiles');
      
      //Retrieve the UserFiles model referenced by the UserData model.
      UserFiles.model.findById(userFilesModelId).exec(function(err, userFilesModel) {
        
        //Error handling
        if(err) return res.apiError('database error', err);
        if(!userFilesModel) return res.apiError('not found');
        
        var textArray = userFilesModel.get('textArray');
        
        //Find the entry that corresponds to this filename entry
        var fileStatusIndex = -1;
        for(var i=0; i < textArray.length; i++) {
          var hit = textArray[i].indexOf(filedate);
          if(hit > -1) {
            //debugger;
            fileStatusIndex = i;
            break;
          }
        }
        
        //If the filename exists in the UserFiles text array.
        if(fileStatusIndex > -1) {
          //logTS('editFileInList editing fileName '+fileName+'. Setting status to '+status);

          //Retreive the JSON string for this file and convert into a JavaScript object.
          var thisFileStatus = textArray[fileStatusIndex];
          //thisFileStatus = JSON.parse(thisFileStatus);

          //Return the status value for this file.
          res.apiResponse({
            //status: thisFileStatus.status
            status: thisFileStatus
          });
          
        //If the file name does not exist in the array, no further processing necessary.
        } else {
          debugger;
          console.error('Error in /api/trackinglogfile/status: '+filedate+' does not exist in the UserFile Text Array!');
          return res.apiError('not found');
        }
        
      });
      
        
    } 
    
    //Catch any errors
    catch(err) {
      console.error('Error in trackinglogfile/status:', err);
      return res.apiError('Error in trackinglogfile/status: ', err)
    }
    
  });
}

//This function is called by the /create API.
//This is a state-function. It calls itself and can be called asynchronously.
function processLogFile() {
  debugger;
  
  switch(logObj.state) {
      
    //This state is reads in the files listed in the temp log directory where KeystoneJS places the
    //log file uploaded by the client.
    case 0:
      try {
        
        
        //Create a new directory for the UserID if it doesn't exist.
        fs.access('private/userdata/'+logObj.userDataId, fs.W_OK, function(err) {
          //debugger;

          //The directory exists.
          if(!err) {
            //debugger;
          
          //The directory does not exist.
          } else {
            exec('mkdir private/userdata/'+logObj.userDataId, function(err, stdout, stderr) {
              debugger;
              
              if(err) {
                logTS('Error trying to create user subdirectory in private/userdata/ directory. Error code: ' + err.code);
                return;
              } else {
                logTS('Directory private/userdata/'+logObj.userDataId+' created.');
              }
            });
          }

          logObj.state = 10;
          processLogFile();

        });
        
      } catch(err) {
        console.error('Error executing processLogFile(). State = '+logObj.state);
        console.error('Error message: '+err.message);
      }
      break;
      
    //This state reads in the temp file created upon file upload to the server.
    //It parses the GeoJSON data into an object, gets the last data point in the file,
    //scrubs the data against keep-out coordinates.
    case 10:
      try {
      logTS('Reading data in from temp file '+logObj.filename);
      
        //Read in the file.
        fs.readFile('private/tmplogs/'+logObj.filename, function(err, data) {

          try {

            try {
              //Convert the JSON data in the log file to an object.
              var clientData = data.toString()
              clientData = JSON.parse(clientData);
            } catch(err) {
              debugger;
              //I need to call addFileToList(), but I need to know:
              //-logObj.userDataId, mostCurrentTimeStamp, logObj.req
              //This should be retrievable from logObj.filename
              var dateStr = logObj.originalFilename.slice(0,10);
              var fileDate = new Date(dateStr);
              addFileToList(logObj.userDataId, fileDate, logObj.req, 'error');
              
              logTS('Error while trying parse JSON from log file. Skipping.');
              
              logObj.state = 40;
              processLogFile();
              return;
            }
      
            //Get the last timestamp before scrubbing the data.
            var clientDataLastPoint = clientData.features.length-1;
            var mostCurrentTimeStamp = new Date(clientData.features[clientDataLastPoint].properties.timestamp);
            logTS('Before scrubbing: mostCurrentTimeStamp = '+mostCurrentTimeStamp);
            
            //Record the last timestamp, before scrubbing, for this log file in a global variable.
            logObj.serverLastDate = mostCurrentTimeStamp;
            
            //Update the lastDate field in the UserData model.
            updateServerTimeStamp(logObj.userDataId, mostCurrentTimeStamp, logObj.req);
            
            //Scrub any data that falls into the keep out coordinates
            clientData = scrubData(clientData);
            
            //If the resulting array is empty, then the program is done.
            if((clientData.features.length == 0) 
               || (clientData.features.length == undefined) 
               || (clientData.features.length < 2)) {
              logTS('Data empty after scrubbing for keep out coordinates.')
              
              debugger; //Manually inspect this corner case.
              
              //if(mostCurrentTimeStamp > logObj.serverLastDate) {
              //  logObj.serverLastDate = mostCurrentTimeStamp;
              //  updateServerTimeStamp(logObj.userDataId, mostCurrentTimeStamp, logObj.req);
              //}
              
              addFileToList(logObj.userDataId, mostCurrentTimeStamp, logObj.req, 'scrubbed');
              
              logObj.state = 40;
              processLogFile();
              return;
            }
            
            logObj.clientData = clientData;

            try {
              logTS('First timestamp in log file = '+clientData.features[0].properties.timestamp);
            } catch(err) {}
            
            //Generate logfile name for today
            var logFileDate = new Date(clientData.features[1].properties.timestamp);
            var logfile = generateFileName(logFileDate);
            logfile = logfile+'.json';
            logObj.logfile = logfile;
            logObj.logFileDate = logFileDate;

            //Filter the data so that it only contains data for the selected date.
            //This will also control if state 20 or 30 is called next.
            filterDates(logObj.clientData, logObj.logFileDate, logObj.userDataId, logObj.req, logObj.serverLastDate);

          } catch(err) {
            debugger;
            console.error('Catastrophic error in processLogFile() state 10.');
            console.error('Error message: '+err.message);
            
          }

        });
      } catch(err) {
        console.error('Error executing processLogFile(). State = '+logObj.state);
        console.error('Error message: '+err.message);
      }
      break;
      
    //This state processes the 'rollover' data, any data in the log file that is newer than the target date.
    case 20:
      try {
        saveRolloverData(logObj.rolloverData, logObj.userDataId, logObj.req, logObj.serverLastDate);
      } catch(err) {
        console.error('Error executing processLogFile(). State = '+logObj.state);
        console.error('Error message: '+err.message);
      }
      break;
      
    //This state processes the GeoJSON data for the target date and writes it out to a log file.
    case 30:
      try {
        //Error handing
        if(logObj.logfile == undefined)
          return;

        //Check if the log file already exists.
        exec('ls private/userdata/'+logObj.userDataId, function(err, stdout, stderr) {

          if (err) {
            logTS('child process exited with error code ' + err.code);
            return;
          }

          //The file does not exist.
          if(stdout.indexOf(logObj.logfile) == -1) {
            logTS('Logfile '+logObj.logfile+' does not exist.');

            //Write out a new log file.
            fs.writeFile('private/userdata/'+logObj.userDataId+'/'+logObj.logfile, JSON.stringify(logObj.filteredData, null, 4), function (err) {
              if(err) {
                logTS('Error while trying to write GeoJSON Point file output: '+logObj.logfile);
                logTS(err);
              } else {
                logTS('New log file '+logObj.logfile+' created.');

                var clientDataLastPoint = logObj.filteredData.features.length-1;
                var mostCurrentTimeStamp = new Date(logObj.filteredData.features[clientDataLastPoint].properties.timestamp);

                //if(updateReady)
                //if(mostCurrentTimeStamp > logObj.serverLastDate) {
                //  logObj.serverLastDate = mostCurrentTimeStamp;
                //  updateServerTimeStamp(logObj.userDataId, mostCurrentTimeStamp, logObj.req);
                //}
                  

                addFileToList(logObj.userDataId, mostCurrentTimeStamp, logObj.req, 'success');

                //Update the public version of the log file if appropriate.
                updatePublicFiles(logObj.userDataId, logObj.logfile);
                
                logObj.state = 40;
                processLogFile();
              }
            });

          //The file already exists.
          } else {
            logTS('Logfile '+logObj.logfile+' already exists.');

            //Read in the existing file
            fs.readFile('private/userdata/'+logObj.userDataId+'/'+logObj.logfile, function(err, data) {
              if(err) {
                logTS('Error: '+err.message);
                return;
              }

              //Error Handling
              if((data.length == 0) || (data == "")) {
                logTS('Data file '+logObj.logfile+' is empty. Exiting.');
                return;
              }

              var serverData = data.toString();
              serverData = JSON.parse(serverData);


              //Compare the timestamp on the last entries of each file.
              var lastServerTimeStamp = new Date(serverData.features[serverData.features.length-1].properties.timestamp);
              var lastClientTimeStamp = new Date(logObj.filteredData.features[logObj.filteredData.features.length-1].properties.timestamp);

              //Only need to continue if the client data has updated data points.
              if(lastClientTimeStamp > lastServerTimeStamp) {

                for(var i=0; i<logObj.filteredData.features.length; i++) {

                  //Convert the timestamp string to an actual Date object.
                  logObj.filteredData.features[i].properties.timestamp = new Date(logObj.filteredData.features[i].properties.timestamp);

                  //Add the geoJSON data point to the server data file it is newer than the last timestamp in the server file.
                  if(logObj.filteredData.features[i].properties.timestamp > lastServerTimeStamp) {
                    serverData.features.push(logObj.filteredData.features[i]);
                  }
                }

                //Write out a new log file.
                fs.writeFile('private/userdata/'+logObj.userDataId+'/'+logObj.logfile, JSON.stringify(serverData, null, 4), function (err) {
                  if(err) {
                    logTS('Error while trying to write GeoJSON Point file output.');
                    logTS(err);
                  } else {
                    logTS('Updated log file '+logObj.logfile+'.');

                    //debugger;
                    //Update lastServerDate in userData

                    var clientDataLastPoint = logObj.filteredData.features.length-1;
                    var mostCurrentTimeStamp = new Date(logObj.filteredData.features[clientDataLastPoint].properties.timestamp);

                    
                    //if(mostCurrentTimeStamp > logObj.serverLastDate) {
                    //  logObj.serverLastDate = mostCurrentTimeStamp;
                    //  updateServerTimeStamp(logObj.userDataId, mostCurrentTimeStamp, logObj.req);
                    //}
                      
                    //Update the public version of the log file if appropriate.
                    updatePublicFiles(logObj.userDataId, logObj.logfile);
                    
                    var userId = logObj.userDataId;
                    var req = logObj.req;
                    
                    debugger;
                    
                    editFileInList(userId, mostCurrentTimeStamp, req, 'success');
                    
                    logObj.state = 40;
                    processLogFile();
                  }
                });

              } else {
                logTS('No new data in client file.');

                debugger;

                //Update the userdata time stamp even if there is no new data. Fixes corner case of spotty internet connection.
                var clientDataLastPoint = logObj.filteredData.features.length-1;
                var mostCurrentTimeStamp = new Date(logObj.filteredData.features[clientDataLastPoint].properties.timestamp);

                var now = new Date();
                
                //var oneDay = 1000*60*60*24;
                //mostCurrentTimeStamp = new Date(mostCurrentTimeStamp.getTime()+oneDay);
                
                //Increment the timestamp to the next day, so long as it doesn't move the time stamp into the future.
                var dayBump = new Date((mostCurrentTimeStamp.getUTCMonth()+1)+'/'+(mostCurrentTimeStamp.getUTCDate()+1)+'/'+mostCurrentTimeStamp.getUTCFullYear());
                if(dayBump < now) {
                  mostCurrentTimeStamp = dayBump;  
                }
                
                
                //if(mostCurrentTimeStamp > logObj.serverLastDate) {
                //  logObj.serverLastDate = mostCurrentTimeStamp;
                //  updateServerTimeStamp(logObj.userDataId, mostCurrentTimeStamp, logObj.req);
                //}
                  
                
                logObj.state = 40;
                processLogFile();
              }

            });
          }

        });


        //Delete the file after it's been processed.
        //exec('rm private/tmplogs/*.json', function(err, stdout, stderr) {
        exec('rm private/tmplogs/'+logObj.filename, function(err, stdout, stderr) {
          
          //logTS('Temp code. logObj.filename = '+logObj.filename);
          
          if (err) {
              logTS('child process exited with error code ' + err.code);
              return;
          }

          logTS('temp file deleted');
          //debugger;
        });

      } catch(err) {
        console.error('Error executing processLogFile(). State = '+logObj.state);
        console.error('Error message: '+err.message);
      }
        
      break;
      
    //This state resets the logObj data structure.
    case 40:
      
      logTS('Reseting logObj');
      
      //A global variable used by processLogFile() and supported functions.
      //var logObj = new Object();
      logObj.state = 0;     //State of the function.
      logObj.filename = ""; //Name of the temp log file.
      logObj.logfile = ""; //Name of the filtered log file saved to the server.
      logObj.userDataId = "";
      logObj.req = undefined;
      logObj.serverLastDate = "";
      logObj.logFileDate = undefined;  //Date object matching the logfile name.
      logObj.clientData = undefined;   //GeoJSON data read in from the temp log file.
      logObj.filteredData = undefined;  //GeoJSON data filtered so that it spans only the target date.
      logObj.rolloverData = undefined;  //Any GeoJSON newer than the target date.
      logObj.breakIndex = 0;            //Index in clientData where data splits from target date to next day.
      
      break;
      
    default:
      logTS('Unexpected state for ProcessLogFile(). State = '+logObj.state);
      debugger;
  }
}


//This function updates lastDate timestamp saved to the UserData model.
function updateServerTimeStamp(userId, timeStamp, req) {
  //debugger;

  //Update the lastServerDate stored in the userData model.
  //userModel.set('lastDate', mostCurrentTimeStamp);
  UserData.model.findById(userId).exec(function(err, item) {
    //debugger;

    item.set('lastDate', timeStamp.toISOString());
    logTS('Setting time stamp to : '+timeStamp.toUTCString()+'. Executing Update Handler...');

    //item.getUpdateHandler(req).process(data, function(err) {
    item.getUpdateHandler(req).process(item, function(err) {
      //debugger;

      if (err) {
        debugger;
        return logTS('Error updating User Data. Error: ', err.message);
      }
    

      logTS('User data last timestamp updated to: '+timeStamp.toISOString());

    });

  });
}

//The purpose of this function is to add a log file to the list of log files stored in the UserFiles model.
//ASSUMPTION: the timeStamp passed into this function is the last/newest time stamp in the file being processed.
function addFileToList(userId, timeStamp, req, status) {
  debugger;
  
  //Access the userData
  UserData.model.findById(userId).exec(function(err, item) {
    
    //Get data from the UserData model.
    var userFiles = item.get('userFiles');
    
    //Generate a file name from the timeStamp;
    var fileName = generateFileName(timeStamp);
    
      
    //Additionally, add the JSON info to the new UserFiles model
    UserFiles.model.findById(userFiles).exec(function(err, item) {
      //debugger;

      var fileListJSON = item.get('textArray');

      //Check to see if the file name already exists in the list
      var fileStatusIndex = -1;
      for(var i=0; i < fileListJSON.length; i++) {
        var hit = fileListJSON[i].indexOf(fileName);
        if(hit > -1) {
          debugger;
          fileStatusIndex = i;
          break;
        }
      }

      //If the file does not exist in the list, then add it.
      if(fileStatusIndex == -1) {
        var obj = new Object();
        obj.fileName = fileName;
        obj.status = status;
        obj.lastTimeStamp = timeStamp;
        var statusStr = JSON.stringify(obj);
        fileListJSON.push(statusStr);

        item.set('textArray', fileListJSON);

        item.save();

      //If the file name already exists in the list, then pass it to editFileInList().
      } else {
        debugger;
        logTS('addFileToList() called to add file '+fileName+' to the text array, but it already exists in the list!');
        editFileInList(userId, timeStamp, req, status);
      }

    });
      
  });
  
}

//The purpose of this function is to edit the status of a file in the list of log files stored on the server.
function editFileInList(userId, timeStamp, req, status) {
  debugger;
  
  logTS('Time in editFileInList(): '+new Date());
  
  //Access the userData model for this user.
  UserData.model.findById(userId).exec(function(err, item) {
    debugger;
    
    //Get data from the UserData model.
    var userFiles = item.get('userFiles');
    
    //Generate a file name from the timeStamp;
    var fileName = generateFileName(timeStamp);
    
    //Retrieve the UserFiles model associated with this user.
    var promiseUserFilesModel = getUserFilesModel(userFiles);

    promiseUserFilesModel.then( function(thisModel) {
      debugger;

      //fileName should already exist in the scope.
      //var fileName = generateFileName(timeStamp);

      //Copy the textArray into a local variable.
      var fileListJSON = thisModel.textArray;

      //Find the entry that corresponds to this fileName entry
      var fileStatusIndex = -1;
      for(var i=0; i < fileListJSON.length; i++) {
        var hit = fileListJSON[i].indexOf(fileName);
        if(hit > -1) {
          //debugger;
          fileStatusIndex = i;
          break;
        }
      }

      //Check if the current date-filename already exists in the file list.
      //If it does, update the status for that entry
      if(fileStatusIndex > -1) {
        logTS('editFileInList() editing fileName '+fileName+'. Setting status to '+status);

        //Retreive the JSON string for this file and convert into a JavaScript object.
        var thisFileStatus = fileListJSON[fileStatusIndex];
        thisFileStatus = JSON.parse(thisFileStatus);

        //Double check that the fileName matches.
        if(fileName != thisFileStatus.fileName) {
          var msg = 'Error in editFileInList()! Filename mismatch! fileName = '+fileName+', thisFileStatus.fileName = '+thisFileStatus.fileName;
          console.error(msg);
          debugger;
          return;
        }

        //Update the processing status of this file.
        thisFileStatus.status = status;
        thisFileStatus.lastTimeStamp = timeStamp; //Also update the last timestamp for this file.

        //Convert the object back into a JSON string.
        fileListJSON[fileStatusIndex] = JSON.stringify(thisFileStatus);

        //Replace the textArray in this model with the updated textArray.
        thisModel.textArray = fileListJSON;

        //Generate a POST request to update the model on the server.
        //Dev Note: 3/20/17 There are bugs discovered when using model.save() or getUpdateHandler(),
        //with TextArray fields. Using HTTP requests is the only way to get around them. See this GitHub issue:
        //https://github.com/keystonejs/keystone/issues/3170
        request({
          url: 'http://localhost/api/userfiles/'+thisModel.id+'/update',
          method: "POST",
          json: true,   // <--Very important!!!
          body: thisModel
        }, function (error, response, body){
          debugger;

          if(error) {
            console.error('Error sending POST request in editFileInList: ', error);
          }

          logTS('UserFiles model '+body.collection._id+' updated');
        });

      //If the file name does not exist in the array, pass it to addFileToList().
      } else {
        debugger;
        console.error('Error in editFileInList(). fileName '+fileName+' does not exist!');
        addFileToList(userId, timeStamp, req, status);
        return;
      }

    }, function(error) {
      debugger;  
    });
    
  });
}

//This function is called by editFileInList. 
//This function retrieves a UserFiles model from the database then returns a promise.
//When the database returns in the info, the promise is resolved.
function getUserFilesModel(id) {
  debugger;
  
  var promise = new Promise.Promise();
  
  UserFiles.model.findById(id).exec(function(err, item) {
    debugger;
    
    //Error handling
    if(err) {
      promise.reject(err);
      return;
    }
    if(!item) {
      promise.reject(id+' not found');
      return;
    }
    
    //Return the values contained in the model.
    try {
      var thisModel = {};
      thisModel.id = item.get('id');
      thisModel.author = item.get('author');
      thisModel.userData = item.get('userData');
      thisModel.textArray = item.get('textArray');

      promise.resolve(thisModel);
    } catch(err) {
      promise.reject('Syntax error in getUserFilesModel()');
    }
  });
  
  return promise;
}

//This function filters an array of GeoJSON data based on the selected date.
//It separates data into a log file based on its date.
function filterDates(data, date, userId, req, serverLastDate) {
  debugger;
  
  try {
  
    var correctDate = date.getUTCDate();
    var filteredArray = [];
    
    for(var i=0; i < data.features.length; i++) {
      
      //Convert the timestamp to a date
      var currentDate = new Date(data.features[i].properties.timestamp);
      currentDate = currentDate.getUTCDate();
      
      //Error Handling
      if(isNaN(currentDate))
        continue;
      
      //Add the data point to the filtered array if the dates match.
      if(currentDate == correctDate) {
        filteredArray.push(data.features[i]);
      } else {

        logTS('Date mismatch: currentDate='+currentDate+' correctDate='+correctDate);
        //saveRolloverData(i, data, userId, req, serverLastDate);
        
        logObj.breakIndex = i;
        
        //Generate the two data GeoJSON data sets
        var data3 = new Object();
        data3.type = "FeatureCollection";
        data3.features = data.features.splice(i);
        logObj.rolloverData = data3;
        
        var data2 = new Object();
        data2.type = "FeatureCollection";
        data2.features = data.features;
        logObj.filteredData = data2;
        
        
        logObj.state = 20;
        processLogFile();
        
        //break;
        return;
      }
    }
    
    //Reconstruct the input data structure with data from the filtered array.
    //debugger;
    var data2 = new Object();
    data2.type = "FeatureCollection";
    data2.features = filteredArray;
    
    //Save the filtered data to the object.
    logObj.filteredData = data2;
    
    logObj.state = 30;
    processLogFile();
    
    //return data2;
    
  } catch(err) {
    console.error('Error executing filterDates.');
    console.error('Error message: '+err.message);
  }
  
}

//This function generates and returns a file name string based on an input date.
function generateFileName(dateIn) {
  //debugger;
  
  logTS('dateIn='+dateIn.toUTCString());
  var month = dateIn.getUTCMonth()+1;
  month = '00'+month;
  month = month.slice(-2);
  var date = dateIn.getUTCDate();
  date = '00'+date;
  date = date.slice(-2);
  var year = dateIn.getUTCFullYear();
  year = year.toString();
  year = year.slice(-2);
  
  return month+date+year;
}

//This function is called by filterDates() when it detects data for multiple days in the same log file.
//The purpose of this function is to save the rest of the data to a new log file.
//Calls to UpdateHandler will cause errors because of collisions with calls from processLogFile(), so they are avoided in this function.
//Note on the above line: I *need* to call UpdateHandler, so I'm trying a flag.
function saveRolloverData(data, userId, req, serverLastDate) {
  //debugger;
  
  try {
  
    updateReady = false; //Signal to processLogFile() not to update it's time stamp.

    //Convert the timestamp to a date and generate a filename.
    var currentDate = new Date(data.features[0].properties.timestamp);
    var logfile = generateFileName(currentDate);
    logfile = logfile+'.json';

    //Cut out the tail end of the data that bleeds over to the next day.
    var dataLength = data.features.length-1;
    var clientData = new Object();
    clientData.type = data.type;
    //clientData.features = data.features.slice(index, dataLength);
    clientData.features = data.features;

    //Check if the log file already exists.
    exec('ls private/userdata/'+logObj.userDataId+'/', function(err, stdout, stderr) {
      //debugger;
      
      if (err) {
        logTS('child process exited with error code ' + err.code);
        return;
      }

      //The file does not exist.
      if(stdout.indexOf(logfile) == -1) {
        logTS('Logfile '+logfile+' does not exist.');

        //Write out a new log file.
        fs.writeFile('private/userdata/'+logObj.userDataId+'/'+logfile, JSON.stringify(clientData, null, 4), function (err) {
          if(err) {
            logTS('Error while trying to write GeoJSON Point file output: '+logfile);
            logTS(err);
          } else {
            logTS('New log file '+logfile+' created.');

            var clientDataLastPoint = clientData.features.length-1;
            var mostCurrentTimeStamp = new Date(clientData.features[clientDataLastPoint].properties.timestamp);

            //Causes mongodb error
            //logObj.serverLastDate = mostCurrentTimeStamp;
            //updateServerTimeStamp(userId, mostCurrentTimeStamp, req);
            addFileToList(userId, mostCurrentTimeStamp, req, 'success');
            updateReady = true;

            //Update the public version of the log file if appropriate.
            updatePublicFiles(logObj.userDataId, logfile);
            
            logObj.state = 30;
            processLogFile();
          }
        });

      //The file already exists.
      } else {
        logTS('Logfile '+logfile+' already exists.');

        //Read in the existing file
        fs.readFile('private/userdata/'+logObj.userDataId+'/'+logfile, function(err, data) {
          if(err) {
            logTS('Error: '+err.message);
            return;
          }

          //Error Handling
          if((data.length == 0) || (data == "")) {
            logTS('Data file '+logfile+' is empty. Exiting.');
            return;
          }

          var serverData = data.toString();
          serverData = JSON.parse(serverData);


          //Compare the timestamp on the last entries of each file.
          var lastServerTimeStamp = new Date(serverData.features[serverData.features.length-1].properties.timestamp);
          var lastClientTimeStamp = new Date(clientData.features[clientData.features.length-1].properties.timestamp);

          //Only need to continue if the client data has updated data points.
          if(lastClientTimeStamp > lastServerTimeStamp) {

            for(var i=0; i<clientData.features.length; i++) {

              //Convert the timestamp string to an actual Date object.
              clientData.features[i].properties.timestamp = new Date(clientData.features[i].properties.timestamp);

              //Add the geoJSON data point to the server data file it is newer than the last timestamp in the server file.
              if(clientData.features[i].properties.timestamp > lastServerTimeStamp) {
                serverData.features.push(clientData.features[i]);
              }
            }

            //Write out a new log file.
            fs.writeFile('private/userdata/'+logObj.userDataId+'/'+logfile, JSON.stringify(serverData, null, 4), function (err) {
              if(err) {
                logTS('Error while trying to write GeoJSON Point file output.');
                logTS(err);
              } else {
                logTS('Updated log file '+logfile+'.');

                //debugger;
                //Update lastServerDate in userData

                var clientDataLastPoint = clientData.features.length-1;
                var mostCurrentTimeStamp = new Date(clientData.features[clientDataLastPoint].properties.timestamp);

                //Causes mongodb error
                if(mostCurrentTimeStamp > serverLastDate) {
                  //logObj.serverLastDate = mostCurrentTimeStamp;
                  //updateServerTimeStamp(userId, mostCurrentTimeStamp, req);
                  
                  //Do I need a call here to editFileInList()?
                  debugger;
                  editFileInList(userId, mostCurrentTimeStamp, req, 'success');
                  updateReady = true;
                }

                //Update the public version of the log file if appropriate.
                updatePublicFiles(logObj.userDataId, logfile);
                
                logObj.state = 30;
                processLogFile();
              }
            });

          } else {
            logTS('No new data in client file.');

            //TO-DO:
            //-If the status of the file is 'error', then fix it by marking it 'success'
            //-Is mostCurrentTimeStamp here getting persisted to the UserData model?
            debugger;
            
            //Update the userdata time stamp even if there is no new data. Fixes corner case of spotty internet connection.
            var clientDataLastPoint = clientData.features.length-1;
            var mostCurrentTimeStamp = new Date(clientData.features[clientDataLastPoint].properties.timestamp);

            //Causes mongodb error
            if(mostCurrentTimeStamp.getTime() > serverLastDate.getTime()) {
              //logObj.serverLastDate = mostCurrentTimeStamp;
              //updateServerTimeStamp(userId, mostCurrentTimeStamp, req);
              updateReady = true;
            }

            logObj.state = 30;
            processLogFile();
          }

        });
      }


    });
  } catch(err) {
    console.error('Error executing saveRolloverData().');
    console.error('Error message: '+err.message);
  }
}

//This function is called to copy an updated files in a users /public directory if the files in the /private directory
//get updated AND the user has the User.privateMapData flag set to false.
function updatePublicFiles(userDataId, logfile) {
  //logTS('updatePublicFiles() called. UserData ID = '+userDataId+', logfile = '+logfile+', userId = '+logObj.userId);
  
  var userId = logObj.userId;
  
  //Error handling.
  if(userDataId != logObj.userDataId) {
    console.error('Global variable conflict. logObj.userDataId != userDataId! Quitting updatePublicFiles()');
    return;
  }
  
  //Verify the privateMapData flag in the User model is set to false
  User.model.findById(userId).exec(function(err, item) {
    
    //Error handling
    if(err) {console.error('database error:'+err); return;}
    if(!item) {console.error('User not found!'); return;}
    
    var privateMapData = item.get('privateMapData');
    
    if(privateMapData) {
      logTS('trackinglogfile.js/updatePublicFiles(): privateMapData for userId '+userId+' == true. Exiting updatePublicFiles()');
      return;
    }
    
    //Verify the /public directory exists for this userDataId
    fs.access('public/uploads/geologs/'+userDataId, fs.W_OK, function(err) {
      if(err) {

        logTS('Error in trackinglogfile.js/updatePublicFiles(): User directory does NOT exists in the public directory.');
        return;
      } else {

        //logTS('updatePublicFiles() verified that user directory exists in the public directory.');

        //Copy the file from /private to /public
        exec('cp private/userdata/'+userDataId+'/'+logfile+' public/uploads/geologs/'+userDataId+'/' , function(err, stdout, stderr) {
          if (err) {
            logTS('trackinglogfile.js/updatePublicFiles() file copy exited with error code ' + err.code);
            return;
          } else {
            //logTS('trackinglogfile.js/updatePublicFiles() copied '+logfile+' to /public folder.');
          } 
        });
        
      }
    });
    
  })
}

//http://www.codecodex.com/wiki/Calculate_Distance_Between_Two_Points_on_a_Globe#JavaScript
//This function returns a distance between two GPS coordinates in kilometers.
function measureDistance(lat1, lon1, lat2, lon2) {
  //debugger;
  
  var R = 6371; // km  
  var dLat = (lat2-lat1)*Math.PI/180;  
  var dLon = (lon2-lon1)*Math.PI/180;   
  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +  
          Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) *   
          Math.sin(dLon/2) * Math.sin(dLon/2);   
  var c = 2 * Math.asin(Math.sqrt(a));   
  var d = R * c;
  
  return d;
}

//This function is called by processLogFile(10). The input variable is expected to get valid GeoJSON data.
//This function compares all the data in geojson with the keep our coordinates in the logObj.keepOut Array.
//Any data that falls inside the keep out coordinates are deleted.
function scrubData(geojson) {
  debugger;
  
  //Loop through each entry of the keepOut array.
  for(var i=0; i < logObj.keepOut.length; i++) {
    
    //Get the lat, long, and radius from the keepOut array.
    var coords = logObj.keepOut[i];
    coords = coords.split(',');
    var lat = Number(coords[0]);
    var long = Number(coords[1]);
    var radius = Number(coords[2]);
    
    //Loop through all the data point uploaded
    for(var j=geojson.features.length-1; j >= 0; j--) {
      var dataPoint = geojson.features[j];
      var tmpLat = dataPoint.geometry.coordinates[1];
      var tmpLong = dataPoint.geometry.coordinates[0]

      var radiusKM = measureDistance(lat, long, tmpLat, tmpLong);
      var radiusFeet = radiusKM * 3280.84; //Convert from KM to Feet.

      if(radiusFeet < radius) {
        geojson.features.splice(j, 1); //Remove this entry from the array.
      }
    }
    
  }
  
  return geojson;
}

//This function appends a timestamp to any string input and then writes it out to console.log.
function logTS(msg) {
  var now = new Date();
  
  var month = ('00'+(now.getUTCMonth()+1)).slice(-2);
  var day = ('00'+(now.getUTCDate())).slice(-2);
  var year = now.getUTCFullYear().toString().slice(-2);
  
  var hour = ('00'+now.getUTCHours()).slice(-2);
  var minute = ('00'+now.getUTCMinutes()).slice(-2);
  var seconds = ('00'+now.getUTCSeconds()).slice(-2);
  
  var dateStamp = month+'/'+day+'/'+year+' '+hour+':'+minute+':'+seconds;
  
  console.log(dateStamp+': '+msg);
}

//Fixing node Date.toLocalDateString() so that it's the same as in a browser.
//http://stackoverflow.com/questions/14792949/date-tolocaledatestring-in-node
Date.prototype.toLocaleDateString = function () {
  var d = new Date();
  return (d.getMonth() + 1) + "/" + d.getDate() + "/" + d.getFullYear();
};