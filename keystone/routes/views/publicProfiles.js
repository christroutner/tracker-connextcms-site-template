var keystone = require('keystone');

exports = module.exports = function(req, res) {

  var view = new keystone.View(req, res);
  var locals = res.locals;

  // Set locals
  locals.section = 'publicProfiles';
  locals.filters = {
    userprofile: req.params.userprofile
  };
  locals.data = {
    userprofile: []
  };

  // Load the current post
  /*
  view.on('init', function(next) {
    debugger;
    
    var User = keystone.list('User');
    
    User.model.findById(locals.filters.userprofile).exec(function(err, item) {

      //Error handling
      if (err) return res.apiError('database error', err);
      if (!item) return res.apiError('not found');

      debugger;
      locals.data.userprofile = item;
      locals.data.userprofile.password = ""; //Clear the password hash.
      locals.data.userprofile.email = "";
      next(err);
    });

  });
  */

  // Render the view
  debugger;
  view.render('publicProfiles');

};
