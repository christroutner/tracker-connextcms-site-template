var keystone = require('keystone');
var middleware = require('./middleware');
var importRoutes = keystone.importer(__dirname);

// Import Route Controllers
var routes = {
	views: importRoutes('./views'),
	api: importRoutes('./api') 
};

module.exports = function(app) {

  // Views
  app.get('/userprofile/:userprofile', routes.views.userprofile);
  app.get('/publicProfiles', routes.views.publicProfiles);
  app.get('/createaccount', routes.views.createaccount);
  app.get('/test', routes.views.test);
  
  //GeoData DAILY Route
  app.get('/api/geodatadaily/list', keystone.middleware.api, routes.api.geodatadaily.list);
  app.get('/api/geodatadaily/:id', keystone.middleware.api, routes.api.geodatadaily.get);
  app.all('/api/geodatadaily/:id/update', keystone.middleware.api, routes.api.geodatadaily.update);
  app.all('/api/geodatadaily/create', keystone.middleware.api, routes.api.geodatadaily.create);
  app.get('/api/geodatadaily/:id/remove', keystone.middleware.api, routes.api.geodatadaily.remove);

  //GeoData POINT Route
  app.get('/api/geodataitem/list', keystone.middleware.api, routes.api.geodataitem.list);
  app.get('/api/geodataitem/:id', keystone.middleware.api, routes.api.geodataitem.get);
  app.all('/api/geodataitem/:id/update', keystone.middleware.api, routes.api.geodataitem.update);
  app.all('/api/geodataitem/create', keystone.middleware.api, routes.api.geodataitem.create);
  app.get('/api/geodataitem/:id/remove', keystone.middleware.api, routes.api.geodataitem.remove);
  
  //Tracking Log File Route
  app.get('/api/trackinglogfile/list', keystone.middleware.api, routes.api.trackinglogfile.list);
  app.get('/api/trackinglogfile/get/:id/:filedate', keystone.middleware.api, routes.api.trackinglogfile.get);
  app.all('/api/trackinglogfile/:id/update', keystone.middleware.api, routes.api.trackinglogfile.update);
  app.all('/api/trackinglogfile/create/:id', keystone.middleware.api, routes.api.trackinglogfile.create);
  app.get('/api/trackinglogfile/remove/:id/:filedate', keystone.middleware.api, routes.api.trackinglogfile.remove);
  app.get('/api/trackinglogfile/status/:id/:filedate', keystone.middleware.api, routes.api.trackinglogfile.status);
  
  //Keep-Out Coordinates
  app.get('/api/keepout/add/:id', keystone.middleware.api, routes.api.keepout.add);
  app.get('/api/keepout/remove/:id', keystone.middleware.api, routes.api.keepout.remove);
  
  //Users API - These are edible user settings, imported from ConnextCMS
  app.get('/api/users/list', keystone.middleware.api, routes.api.users.list);
  app.get('/api/users/:id', keystone.middleware.api, routes.api.users.get);
  app.all('/api/users/:id/update', keystone.middleware.api, routes.api.users.update);
  app.all('/api/users/create', keystone.middleware.api, routes.api.users.create);
  //app.get('/api/users/:id/remove', keystone.middleware.api, routes.api.users.remove);
  app.all('/api/users/:id/makeprivate', keystone.middleware.api, routes.api.users.makeprivate);
  app.all('/api/users/:id/makepublic', keystone.middleware.api, routes.api.users.makepublic);
  
  //UserData API - These are unedible user settings, unique to tracker-server
  //app.get('/api/userdata/list', keystone.middleware.api, routes.api.userdata.list);
  app.get('/api/userdata/:id', keystone.middleware.api, routes.api.userdata.get);
  app.all('/api/userdata/:id/update', keystone.middleware.api, routes.api.userdata.update);
  //app.all('/api/userdata/create', keystone.middleware.api, routes.api.userdata.create);
  //app.get('/api/userdata/:id/remove', keystone.middleware.api, routes.api.userdata.remove);
  
  //User Avatar Upload Route
  app.get('/api/useravatar/list', keystone.middleware.api, routes.api.useravatar.list);
  app.get('/api/useravatar/:id', keystone.middleware.api, routes.api.useravatar.get);
  app.all('/api/useravatar/:id/update', keystone.middleware.api, routes.api.useravatar.update);
  app.all('/api/useravatar/create', keystone.middleware.api, routes.api.useravatar.create);
  app.get('/api/useravatar/:id/remove', keystone.middleware.api, routes.api.useravatar.remove);
  
  //User Files Route
  app.get('/api/userfiles/list', keystone.middleware.api, routes.api.userfiles.list);
  app.get('/api/userfiles/:id', keystone.middleware.api, routes.api.userfiles.get);
  app.all('/api/userfiles/:id/update', keystone.middleware.api, routes.api.userfiles.update);
  app.all('/api/userfiles/create', keystone.middleware.api, routes.api.userfiles.create);
  app.get('/api/userfiles/:id/remove', keystone.middleware.api, routes.api.userfiles.remove);
  
  //API for RPi-Tracker diagnostics.
  app.all('/api/diagnostics/:id/update', keystone.middleware.api, routes.api.diagnostics.update);
  
  //Email
  //app.get('/api/email/test', keystone.middleware.api, routes.api.email.test);
  //app.get('/api/email/sendlog', keystone.middleware.api, routes.api.email.sendlog);
  
  // NOTE: To protect a route so that only admins can see it, use the requireUser middleware:
	// app.get('/protected', middleware.requireUser, routes.views.protected);
  app.get('/usersettings', middleware.requireUser, routes.views.usersettings);
}