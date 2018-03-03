var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
 * GeoData Item Model - Used to create individual geo-data points
 * ==================
 */

var GeoDataItem = new keystone.List('GeoDataItem');

GeoDataItem.add({
	parent: { type: Types.Relationship, ref: 'GeoDataDaily'},
  parentName: {type: String},
  lat: {type: Number},
  long: {type: Number},
  timestamp: {type: Types.Datetime}
});

GeoDataItem.defaultColumns = 'parentName, timestamp';

GeoDataItem.register();
