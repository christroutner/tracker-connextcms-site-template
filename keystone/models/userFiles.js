var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
 * User Files Model - an array of JSON strings listing the available files for each user.
 * ==========
 */

var UserFiles = new keystone.List('UserFiles', {});

UserFiles.add({
  author: { type: Types.Relationship, ref: 'User', index: true },
  userData: { type: Types.Relationship, ref: 'UserData', index: true},
  textArray: { type: Types.TextArray }
});


UserFiles.defaultColumns = 'author';
UserFiles.register();