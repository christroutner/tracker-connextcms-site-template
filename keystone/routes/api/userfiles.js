var async = require('async'),
keystone = require('keystone');
var exec = require('child_process').exec;

var security = keystone.security;

var UserFiles = keystone.list('UserFiles');

/**
 * List UserFiles
 */
exports.list = function(req, res) {
        UserFiles.model.find(function(err, items) {

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

        UserFiles.model.findById(req.params.id).exec(function(err, item) {

                if (err) return res.apiError('database error', err);
                if (!item) return res.apiError('not found');

                res.apiResponse({
                        collection: item
                });

        });
}


/**
 * Update Image by ID
 */
exports.update = function(req, res) {
  debugger;
  
  //Ensure the user has a valid CSRF token
	//if (!security.csrf.validate(req)) {
	//	return res.apiError(403, 'invalid csrf');
	//}
  
  //Ensure the user making the request is a Keystone Admin
  //var isAdmin = req.user.get('isAdmin');
  //if(!isAdmin) {
  //  return res.apiError(403, 'Not allowed to access this API. Not Keystone Admin.');
  //}
  
  //Since it's possible to spoof the Keystone Admin setting in the current version of the User model,
  //This is a check to make sure the user is a ConnexstCMS Admin
  //var admins = keystone.get('admins');
  //var userId = req.user.get('id');
  //if(admins.indexOf(userId) == -1) {
  //  return res.apiError(403, 'Not allowed to access this API. Not ConnextCMS Admin')
  //}
  
  //Ensure the user making the request is either the user being changed or a superuser. 
  //Reject normal admins or users maliciously trying to change other users settings.
  /*
  try {
    var userId = req.user.get('id');
    if(userId != req.params.id) {
      if(superusers.indexOf(userId) == -1) {
        return res.apiError(403, 'Not allowed to change this user settings.');
      }
    }
  } catch(err) {
    debugger;
    console.error('Error in /api/userfiles/update: Could not authenticate user!',err);
    return res.apiError(403, 'Not allowed to change this user settings.');
  }
  */
  
  UserFiles.model.findById(req.params.id).exec(function(err, item) {

    if (err) return res.apiError('database error', err);
    if (!item) return res.apiError('not found');

    var data = (req.method == 'POST') ? req.body : req.query;

    item.getUpdateHandler(req).process(data, function(err) {

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

  /*
  //Ensure the user has a valid CSRF token
	if (!security.csrf.validate(req)) {
		return res.apiError(403, 'invalid csrf');
	}
  
  //Ensure the user making the request is a Keystone Admin
  var isAdmin = req.user.get('isAdmin');
  if(!isAdmin) {
    return res.apiError(403, 'Not allowed to access this API. Not Keystone Admin.');
  }
  
  //Since it's possible to spoof the Keystone Admin setting in the current version of the User model,
  //This is a check to make sure the user is a ConnexstCMS Admin
  var admins = keystone.get('admins');
  var userId = req.user.get('id');
  if(admins.indexOf(userId) == -1) {
    return res.apiError(403, 'Not allowed to access this API. Not ConnextCMS Admin')
  }
  */
  
  var item = new UserFiles.model(),
		data = (req.method == 'POST') ? req.body : req.query;
	
	item.getUpdateHandler(req).process(data, function(err) {
		
		if (err) return res.apiError('error', err);
		
		res.apiResponse({
			collection: item
		});
		
	});
}

/**
 * Delete Image by ID
 */
exports.remove = function(req, res) {
  /*
  //Ensure the user has a valid CSRF token
	if (!security.csrf.validate(req)) {
		return res.apiError(403, 'invalid csrf');
	}
  
  //Ensure the user making the request is a Keystone Admin
  var isAdmin = req.user.get('isAdmin');
  if(!isAdmin) {
    return res.apiError(403, 'Not allowed to access this API. Not Keystone Admin.');
  }
  
  //Since it's possible to spoof the Keystone Admin setting in the current version of the User model,
  //This is a check to make sure the user is a ConnexstCMS Admin
  var admins = keystone.get('admins');
  var userId = req.user.get('id');
  if(admins.indexOf(userId) == -1) {
    return res.apiError(403, 'Not allowed to access this API. Not ConnextCMS Admin')
  }
  */
  
	var imageId = req.params.id;
	UserFiles.model.findById(req.params.id).exec(function (err, item) {

		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');
		
		item.remove(function (err) {

			if (err) return res.apiError('database error', err);
			
      //Delete the file
      //exec('rm public/uploads/images/'+imageId+'.*', function(err, stdout, stderr) { 
      //  if (err) { 
      //      console.log('child process exited with error code ' + err.code); 
      //      return; 
      //  } 
      //  console.log(stdout); 
      //});

			return res.apiResponse({
				success: true
			});
		});
		
	});
}

