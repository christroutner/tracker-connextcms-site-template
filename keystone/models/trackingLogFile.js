var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
 * Tracking Log File Model
 * ===========
 * A database model for uploading tracking log files to the local file system
 */

var TrackingLogFile = new keystone.List('TrackingLogFile');

var myStorage = new keystone.Storage({
    adapter: keystone.Storage.Adapters.FS,
    fs: {
        path: keystone.expandPath('./private/tmplogs'), // required; path where the files should be stored
        publicPath: '/private/tmplogs', // path where files will be served
    }
});

TrackingLogFile.add({
  //name: { type: Types.Key, required: true, index: true }, //requiring name breaks image upload.
  //name: { type: Types.Key, index: true},
  name: { type: Types.Datetime, default: Date.now },
  file: {
    type: Types.File,
    storage: myStorage
  },
  createdTimeStamp: { type: String },
  alt1: { type: String },
  attributes1: { type: String },
  category: { type: String },      //Used to categorize widgets.
  priorityId: { type: String },    //Used to prioritize display order.
  parent: { type: String },
  children: { type: String },
  url: {type: String},
  fileType: {type: String}

});


TrackingLogFile.defaultColumns = 'name';
TrackingLogFile.register();
