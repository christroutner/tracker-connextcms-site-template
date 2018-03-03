var async = require('async'),
keystone = require('keystone');
var exec = require('child_process').exec;
var fs = require('fs');

var TrackingData = keystone.list('TrackingLogFile');
var UserData = keystone.list('UserData');
var User = keystone.list('User');
var updateReady = true;
var security = keystone.security;


/**
 * Add Keep-Out Coordinates to a UserData model
 */
exports.add = function(req, res) {
  
  //Disabled till CSRF issues are fixed.
  //Ensure the CSRF token is valid
	//if (!security.csrf.validate(req)) {
	//	return res.apiError(403, 'invalid csrf');
	//}
  
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
  
  var userDataId = req.user.get('userData');
  
  UserData.model.findById(userDataId).exec(function(err, item) {

    if (err) return res.apiError('database error', err);
    if (!item) return res.apiError('not found');

    try {
      debugger;
      var queryData = req.query;
      var coordinates = queryData.coordinates
      
      //Add the new coordinates to the UserData model
      var keepOut = item.get('keepOut');
      keepOut.push(coordinates);
      item.set('keepOut', keepOut);
      item.save(function(err) {
        if(err) return res.apiError('Error saving model data', err);
      });
      
      //Split up the coordinates into an array.
      coordinates = coordinates.split(',');
      
      userDataId = userDataId.toString(); //Convert to a GUID string.
      
      //Scrub the private user directory data logs of data in the new Keep Out radius.
      var cmd = 'node private/util/removeNoTrackCoordinates.js '+userDataId+' '+
          coordinates[0]+' '+coordinates[1]+' '+coordinates[2];
      exec(cmd, function(err, stdout, stderr) {
        if (err) {
            debugger;
            console.log('Deleting private file: child process exited with error code ' + err.code);
            console.log(stderr);
            console.error(err.message);
            return;
        }

        debugger;
        
        console.log(stdout);
        
        res.apiResponse({
          success: true
        });
      });
        
      
    } catch(err) {
      res.apiResponse({
        success: false,
        message: 'Error executing /api/keepout/add',
        error: err
      })
    }

  });
}

/**
 * Remove Keep-Out Coordinates to a UserData model
 */
exports.remove = function(req, res) {
  debugger;
  
  //Disabled till CSRF issues are fixed.
  //Ensure the CSRF token is valid
	//if (!security.csrf.validate(req)) {
	//	return res.apiError(403, 'invalid csrf');
	//}
  
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
  
  
  var userDataId = req.user.get('userData');
  
  UserData.model.findById(userDataId).exec(function(err, item) {
    debugger;
    
    if (err) return res.apiError('database error', err);
    if (!item) return res.apiError('not found');

    try {

      userDataId = userDataId.toString(); //Convert to a GUID string.

      //Save the expected passed-in parameters to local variables.
      var queryData = req.query;
      var keepOutCoords = queryData.keepOutCoords;
      
      //Get the keep out array from the model.
      var keepOutArray = item.get('keepOut');
      
      //Find the entry in the model that matches the passed in value.
      for(var i=0; i < keepOutArray.length; i++) {
        if(keepOutArray[i] == keepOutCoords) {
          keepOutArray.splice(i,1);
          break;
        }
      }
      
      //If a match was not found, notify the caller.
      if( (i==(keepOutArray.length-1)) && (keepOutArray[i] != keepOutCoords) ) {
        return res.apiResponse({
          success: false,
          message: 'Coordinates not found!'
        })
      }
      
      //Update the keep out array in the model and save changes.
      item.set('keepOut', keepOutArray);
      item.save(function(err) {
        
        if(err) return res.apiError('Error saving model data', err);
        
        //Return success.
        return res.apiResponse({
          success: true
        });
        
      });

    } catch(err) {
      res.apiResponse({
        success: false,
        message: 'Error executing /api/keepout/remove',
        error: err
      })
    }
  });
}