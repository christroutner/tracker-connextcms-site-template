var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
 * User Model
 * ==========
 */
var User = new keystone.List('User');

//var myStorage = new keystone.Storage({
//    adapter: keystone.Storage.Adapters.FS,
//    fs: {
//        path: keystone.expandPath('./public/uploads/avatars'), // required; path where the files should be stored
//        publicPath: '/public/uploads/avatars', // path where files will be served
//    }
//});

User.add({
  name: { type: Types.Name, required: true, index: true },
  email: { type: Types.Email, initial: true, required: true, index: true },
  password: { type: Types.Password, initial: true, required: true },
  userData: { type: Types.Relationship, ref: 'UserData', index: true},
  privateMapData: { type: Types.Boolean },
  publicProfile: { type: Types.Boolean },
  //avatar: {
  //  type: Types.File,
  //  storage: myStorage
  //},
  avatar: { type: Types.Relationship, ref: 'UserAvatar'},
  avatarUrl: { type: String },
  about: { type: Types.Html, wysiwyg: true, height: 400 },
  userFiles: { type: Types.Relationship, ref: 'UserFiles', index: true }
  
  
}, 'Permissions', {
        isAdmin: { type: Boolean, label: 'Can access Keystone', index: true },
});

// Provide access to Keystone
User.schema.virtual('canAccessKeystone').get(function () {
        return this.isAdmin;
});


/**
 * Relationships
 */
User.relationship({ ref: 'Post', path: 'posts', refPath: 'author' });


/**
 * Registration
 */
User.defaultColumns = 'name, email, isAdmin';
User.register();
