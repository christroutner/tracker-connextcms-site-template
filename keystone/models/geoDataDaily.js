var keystone = require('keystone');
var Types = keystone.Field.Types;

/**
 * NRP User Model - Used to create an NRP user
 * ==================
 */

var GeoDataDaily = new keystone.List('GeoDataDaily');

GeoDataDaily.add({
  nameDate: {type: String},
  date: {type: Date, default: Date.now},
  dataPoints: {type: Types.Relationship, ref: 'GeoDataItem', many: true}
});

GeoDataDaily.defaultColumns = 'name';

GeoDataDaily.register();
