var async = require('async'),
	keystone = require('keystone');
var Promise = require('node-promise'); //Promises to handle asynchonous callbacks.
var fs = require('fs');
var exec = require('child_process').exec;

var User = keystone.list('User');
var UserData = keystone.list('UserData');
var UserFiles = keystone.list('UserFiles');
var security = keystone.security;
var Mailgun = require('mailgun-js'); //Mailgun API library.

//debugger;

/**
 * List User
 */
exports.list = function(req, res) {
	User.model.find(function(err, items) {
		
		if (err) return res.apiError('database error', err);
		
    debugger;
    //Blank out the password hash.
    for(var i=0; i < items.length; i++) {
      items[i].set('password', '');
    }
    
		res.apiResponse({
			user: items
		});
		
	});
}

/**
 * Get User by ID
 */
exports.get = function(req, res) {
	User.model.findById(req.params.id).exec(function(err, item) {
		
		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');
		
		res.apiResponse({
			user: item
		});
		
	});
}


/**
 * Create a User
 */
exports.create = function(req, res) {
	
	var item = new User.model(),
		data = (req.method == 'POST') ? req.body : req.query;
	
  //debugger;
  
	item.getUpdateHandler(req).process(data, function(err) {
		//debugger;
    
		if (err) return res.apiError('error', err);
		
    
    //Create a new UserData model
    var newUserData = new UserData.model();
    
    //Create a new UserFiles model
    var newUserFiles = new UserFiles.model();
    
    // BEGIN CREATE USERDATA MODEL
    
    //Build up new values for UserData model.
    var data2 = {
      'author': item.id,
      'firstDate': new Date(),
      'lastDate': new Date(),
      'accountActive': true,
      'userFiles': newUserFiles.id
    };
    
    //Update the UserData model.
    newUserData.getUpdateHandler(req).process(data2, function(err) {
      //debugger;
      
      if (err) return res.apiError('error', err);
      
      //Update the User model with the ID of the UserData model.
      item.set('privateMapData', true); //Set default value to true.
      item.set('userData', newUserData.id); //Link to the User model to UserData model.
      item.save();
    
      sendNewUserEmail(item, newUserData);
      
      res.apiResponse({
        user: item
      });
      
    });
    
    // END CREATE USERDATA MODEL
    
    
    // BEGIN CREATE USERFILES MODEL
    
    newUserFiles.set('author', item.id);
    newUserFiles.set('userData', newUserData.id);
    newUserFiles.set('textArray', []);
    
    newUserFiles.save();
    
    //Update the User model with a link to the UserFiles model
    //item.userFiles = newUserFiles.id;
    item.set('userFiles', newUserFiles.id);
    item.save();
    
    // END CREATE USERFILES MODEL
    
	});
}


/**
 * Get User by ID
 */

exports.update = function(req, res) {
  //debugger;
  
  
  //var keystonereq = req.keystone;
	//if (!security.csrf.validate(req)) {
  //  return res.apiError(403, 'invalid csrf');
	//}
  
  //Retrieve the list of superusers saved in keystone.js
  var superusers = keystone.get('superusers');
  
  //Ensure the user making the request is either the user being changes or a superuser. 
  //Reject normal admins or users maliciously trying to change other users settings.
  var userId = req.user.get('id');
  if(userId != req.params.id) {
    if(superusers.indexOf(userId) == -1) {
      return res.apiError(403, 'Not allowed to change this user settings.');
    }
  }
  
	User.model.findById(req.params.id).exec(function(err, item) {
		//debugger;
		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');
		
		var data = (req.method == 'POST') ? req.body : req.query;
		
		item.getUpdateHandler(req).process(data, function(err) {
			
			if (err) return res.apiError('create error', err);
			
			res.apiResponse({
				user: item
			});
			
		});
		
	});
}


/**
 * Delete User by ID
 */
/*
exports.remove = function(req, res) {
	User.model.findById(req.params.id).exec(function (err, item) {
		
		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');
		
		item.remove(function (err) {
			if (err) return res.apiError('database error', err);
			
			return res.apiResponse({
				success: true
			});
		});
		
	});
}
*/

/*
 *  Make User Map Data private
 */
exports.makeprivate = function(req, res) {
  debugger;
  
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
  
  User.model.findById(req.params.id).exec(function(err, item) {
		debugger;
    
    //Error handling
		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');
		
		var data = (req.method == 'POST') ? req.body : req.query;
    
    //Set the privateMapData flag in the User model to false.
    item.set('privateMapData', true);
    item.set('publicProfile', false); //If map data is private, than the user CAN NOT have a public profile.
    
    //Save the changed model to the database.
    item.save(function(err) {
      if(err) return res.apiError('Error saving model data', err);
      
      res.apiResponse({
        user: item
      });
      
      var userData = item.get('userData');
      
      
      //Ensure the /public/uploads/geologs/<userID> directory exists
      var promisePublicDirExists = verifyPublicUserDir(userData);
      
      promisePublicDirExists.then( function(result) {
        debugger;
        
        //Delete the /public/uploads/geologs/<userID> directory to /private/userdata/<userID>
        
        var promiseDeletePublicMapDir = deletePublicMapDir(userData);
        
        promiseDeletePublicMapDir.then( function(result) {
          debugger;
        }, function(error) {
          debugger;
          if (error) console.error('Error in users.js/promiseDeletePublicMapDir(), Error: ', error);
        });
        
        
      }, function(error) {
        debugger;
        if (error) console.error('Error in users.js/promiseDeletePublicMapDir(), Error: ', error);
      });
      
    });
    
	});
}

/*
 * Make User Map Data public
 */
exports.makepublic = function(req, res) {
  //debugger;
  
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
  
  
  User.model.findById(req.params.id).exec(function(err, item) {
		//debugger;
    
    //Error handling
		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');
		
		var data = (req.method == 'POST') ? req.body : req.query;
    
    //Set the privateMapData flag in the User model to false.
    item.set('privateMapData', false);
        
    //Save the changed model to the database.
    item.save(function(err) {
      if(err) return res.apiError('Error saving model data', err);
      
      res.apiResponse({
        user: item
      });
      
      var userData = item.get('userData');
      
      //Ensure the /private/userdata/<userID> directory exists
      var promisePrivateDirExists = verifyPrivateUserDir(userData);
      
      promisePrivateDirExists.then( function(result) {
        //debugger;
        
        //Move the /private/userdata/<userID> directory to /public/uploads/geologs/<userID>
        
        var promiseCopyPrivateToPublic = copyPrivateToPublic(userData);
        
        promiseCopyPrivateToPublic.then( function(result) {
          //debugger;
        }, function(error) {
          debugger;
          if(error) console.error('Error in users.js/promiseMovePrivateToPublic(), Error: ', error);
        });
        
        
      }, function(error) {
        debugger;
        if (error) console.error('Error in users.js/promisePrivateDirExists: ', error);
      });
      
      
        
    });
    
		
	});
  
}

//This function is called by exports.makePrivate. The input is a user GUID and the function returns a Promise.
//When the callback resolves, it returns true or false indicating the the userData directory exists or not.
//If the callback is rejected, the error message is returned.
function verifyPublicUserDir(userData) {
  //debugger;

  var promise = new Promise.Promise();
  
  //Read in log file
  //fs.readFile(global.dataLog.logFilePath+ fileName, 'utf8', function(err, data) { 
  //Check if the file exists.
  fs.access('public/uploads/geologs/'+userData, fs.R_OK, function(err) {
    if(err) {
      
      console.log('Error: User directory does NOT exists in the public directory.');
      
      //Pass on the error message.
      promise.reject(false);
    } else {
      
      console.log('Verified that user directory exists in the public directory.');

      //Resolve with the last time stamp.
      promise.resolve(true);
    }
  });

  return promise;
}

function verifyPrivateUserDir(userData) {
  //debugger;

  var promise = new Promise.Promise();
  
  //Read in log file
  //fs.readFile(global.dataLog.logFilePath+ fileName, 'utf8', function(err, data) { 
  //Check if the file exists.
  fs.access('private/userdata/'+userData, fs.R_OK, function(err) {
    if(err) {
      
      console.log('Error: User directory does NOT exists in the PRIVATE directory.');
      
      //Pass on the error message.
      promise.reject(false);
    } else {
      
      console.log('Verified that user directory exists in the PRIVATE directory.');

      //Resolve with the last time stamp.
      promise.resolve(true);
    }
  });

  return promise;
}

function deletePublicMapDir(userData) {
  var promise = new Promise.Promise();
  
  exec('rm -rf public/uploads/geologs/'+userData, function(err, stdout, stderr) {
    if (err) {
      console.log('deletePublicMapDir() child process exited with error code ' + err.code);
      promise.reject(false);
    } else {
      console.log('Deleted '+userData+' user data from /public folder.');
      promise.resolve(true);  
    } 
  });
  
  return promise;
}

function copyPrivateToPublic(userData) {
  var promise = new Promise.Promise();
  
  exec('cp -r private/userdata/'+userData+' public/uploads/geologs/', function(err, stdout, stderr) {
    if (err) {
      console.log('user.js/copyPrivateToPublic() child process exited with error code ' + err.code);
      promise.reject(false);
    } else {
      console.log('Copied '+userData+' user data to /public folder.');
      
      //Copy the embedMap.html file into the public directory
      exec('cp private/embedMap.html public/uploads/geologs/'+userData+'/', function(err, stdout, stderr) {
        if(err) {
          console.error('Error copying /embedMap.html into public/uploads/geologs/'+userData+'/');
          return
        }
        
        console.log('Copied embed map to '+userData+' directory in /public');
      });
      
      promise.resolve(true);  
    } 
  });
  
  return promise;
}

//This function is called by exports.create function. It sends an email to the new user with
//information they need to conncect their RPi-Tracks to the server.
function sendNewUserEmail(UserModel, UserDataModel) {
  console.log('sendNewUserEmail() executing...');
  
  //Process email address in query string.
  var email = UserModel.get('email');

  if(email.indexOf('@') == -1) {  //Reject if there is no @ symbol.
    console.log('Invalid email: '+email);
  }
  console.log('Got email: '+email);
  email = [email];  //Convert into an array.

  
  //Error handling - undefined email
  if( email == undefined ) {
    console.log('Failure: email == undefined');
  }
  
  var subject = "Your CrumbShare.com Account";
  var body = "Thank you for signing up for a Beta Tester account on CrumbShare.com. Your UserData ID is: \n"+
      UserDataModel.get('id')+"\n\n"+
      "You can find additional information on connecting your RPi-Tracker at http://crumbshare.com";
  
  //Send the email log via MailGun email.
  var emailObj = new Object();
  emailObj.email = email;
  emailObj.subject = subject;
  emailObj.message = body
  sendMailGun(emailObj);
  
  //Return success.
  return true;
}

//This function sends an email using MailGun using an emailObj.
//emailObj = {
//  email = array of strings containing email addresses
//  subject = string for subject line
//  message = text message to email
//  html = (default = false). True = message contains html and should be treated as html.
//}
function sendMailGun(emailObj) {
  
  //Error Handling - Detect invalid emailObj
  if(
    //Conditions for exiting:
    (emailObj.email == undefined) ||
    (emailObj.subject == undefined) || (emailObj.subject == "") ||
    (emailObj.message == undefined) || (emailObj.message == "")
    ) 
  {
    console.log('Invalid email Object passed to sendMailGun(). Aborting.');
    debugger;
    return false;
  }
  
  //Error Handling - Detect any invalid email addresses
  for(var i=0; i < emailObj.email.length; i++) {
    if(emailObj.email[i].indexOf("@") == -1) {
      if(emailObj.email[i] == "") {
        //debugger;
        emailObj.email.splice(i,1); //Remove any blank entries from the array.
      } else {
        console.log('Error! sendMailGun() - Invalid email address passed: '+emailObj.email[i]); 
        return;
      }
    }
  }
  
  //Sort out the optional input html flag
  var html = false;
  if((emailObj.html != undefined) && (typeof(emailObj.html) == "boolean"))
    html = emailObj.html;
  
  //Send an email for each email address in the array via Mailgun API
  var api_key = 'key-3a4e4494ffe9b328783413ed0da9b332';
  var domain = 'mg.crumbshare.net';
  var from_who = 'chris.troutner@gmail.com';
  var mailgun = new Mailgun({apiKey: api_key, domain: domain});
  
  for( var i=0; i < emailObj.email.length; i++ ) {
  
    //Error handling.
    if(emailObj.email[i] == "")
      continue;
    
      if(html) {
        var data = {
          from: from_who,
          to: emailObj.email[i],
          subject: emailObj.subject,
          html: emailObj.message
        };
      } else {
        var data = {
          from: from_who,
          to: emailObj.email[i],
          subject: emailObj.subject,
          text: emailObj.message
        };
      }
      
      
      mailgun.messages().send(data, function(err, body) {
        if(err) {
          console.log('Got an error trying to send email with sendMailGun(): ', err);
          debugger;
        } else {
          console.log('Sent email successfully with sendMailGun()');
        }
      });
  }
}

