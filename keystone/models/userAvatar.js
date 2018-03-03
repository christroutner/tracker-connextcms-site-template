var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
 * User Avatar Model
 * ===========
 * A database model for uploading images to the local file system
 */


var UserAvatar = new keystone.List('UserAvatar');

var myStorage = new keystone.Storage({
    adapter: keystone.Storage.Adapters.FS,
    fs: {
        path: keystone.expandPath('./public/uploads/avatars'), // required; path where the files should be stored
        publicPath: '/public/uploads/avatars', // path where files will be served
    }
});

UserAvatar.add({
  //name: { type: Types.Key, required: true, index: true }, //requiring name breaks image upload.
	name: { type: Types.Key, index: true},
  image: { 
		//type: Types.LocalFile, 
    type: Types.File,
    storage: myStorage
		//dest: 'public/uploads/images', 
		//label: 'Image',
		//allowedTypes: [ 'image/jpeg', 'image/png', 'image/gif'],
		//filename: function(item, file) {
		//	return item.id + '.' + file.extension;
		//} 
	},
	alt1: { type: String },
  attributes1: { type: String },
  category: { type: String },      //Used to categorize widgets.
  priorityId: { type: String },    //Used to prioritize display order.
	imageName: { type: String },
	parent: { type: String },
	children: { type: String },
  width: { type: Number },
  height: { type: Number },
  url: { type: String },
  userId: { type: String }
        
});


UserAvatar.defaultColumns = 'userName';
UserAvatar.register();

