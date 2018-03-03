// Simulate config options from your production environment by
// customising the .env file in your project's root folder.
require('dotenv').load();

// Require keystone
var keystone = require('keystone');
var handlebars = require('express-handlebars');

// Initialise Keystone with your project's configuration.
// See http://keystonejs.com/guide/config for available options
// and documentation.

keystone.init({

	'name': 'map-tracks',
	'brand': 'Map Tracks',
	
	'less': 'public',
	'static': 'public',
	'favicon': 'public/images/cropped-Favicon-32x32.png',
	'views': 'templates/views',
	'view engine': 'hbs',
	
	'custom engine': handlebars.create({
		layoutsDir: 'templates/views/layouts',
		partialsDir: 'templates/views/partials',
		defaultLayout: 'default',
		helpers: new require('./templates/views/helpers')(),
		extname: '.hbs'
	}).engine,
	
	'auto update': true,
	'session': true,
	'auth': true,
	'user model': 'User',
	'port': 80,
  'signin redirect': '/usersettings',
  'signout redirect': '/'

});

// Load your project's Models

keystone.import('models');

// Setup common locals for your templates. The following are required for the
// bundled templates and layouts. Any runtime locals (that should be set uniquely
// for each request) should be added to ./routes/middleware.js

keystone.set('locals', {
	_: require('underscore'),
	env: keystone.get('env'),
	utils: keystone.utils,
	editable: keystone.content.editable
});

// Load your project's Routes

keystone.set('routes', require('./routes'));

// Configure the navigation bar in Keystone's Admin UI

keystone.set('nav', {
	'posts': ['posts', 'post-categories'],
	'galleries': 'galleries',
	'enquiries': 'enquiries',
	'users': 'users'
});

//Add User GUIDs to the arrays below to make that user an Admin or Superuser.
//Only superusers can change other users passwords. They can also access the Keystone Admin UI.
//Admins can access the API and only the ConnextCMS Dashboard.
keystone.set('superusers', ['581e1daf8ca4d407257833b8']);
keystone.set('admins', ['581e1daf8ca4d407257833b8', '581f3a8c73f0411014b0f8ff']);


// Start Keystone to connect to your database and initialise the web server

keystone.start();
