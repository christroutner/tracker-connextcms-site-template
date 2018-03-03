var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
 * User Data Model
 * ==========
 */

var UserData = new keystone.List('UserData', {
        //map: { name: 'title' },
        //autokey: { path: 'slug', from: 'title', unique: true }
});

UserData.add({
  //title: { type: String, required: true },
  //state: { type: Types.Select, options: 'draft, published, archived', default: 'draft', index: true },
  author: { type: Types.Relationship, ref: 'User', index: true },
  firstDate: { type: Types.Date, index: true },
  lastDate: { type: Types.Date, index: true },
  //image: { type: Types.CloudinaryImage },
  content: {
          brief: { type: Types.Html, wysiwyg: true, height: 150 },
          extended: { type: Types.Html, wysiwyg: true, height: 400 }
  },
  //fileList: { type: Types.TextArray },    //Stores list of log file dates associated with this user.
  //statusList: { type: Types.TextArray },  //Stores the processing status of each log file uploaded.
  keepOut: { type: Types.TextArray },
  paypalEmail: { type: String },
  accountActive: {type: Types.Boolean },
  userFiles: { type: Types.Relationship, ref: 'UserFiles', index: true },
  
  localIp: { type: String },        //The local IP of the RPi-Tracker
  globalIp: { type: String },       //The global IP of the RPI-Tracker
  timestampIp: { type: Types.Datetime } //The timestamp of when the IP was updated last.
});

UserData.schema.virtual('content.full').get(function() {
  return this.content.extended || this.content.brief;
});

UserData.defaultColumns = 'author';
UserData.register();
