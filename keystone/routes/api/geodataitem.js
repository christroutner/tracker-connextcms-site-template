var async = require('async'),
	keystone = require('keystone');

var GeoDataItem = keystone.list('GeoDataItem');

/**
 * List GeoDataItem
 */
exports.list = function(req, res) {
	GeoDataItem.model.find(function(err, items) {
		
		if (err) return res.apiError('database error', err);
		
		res.apiResponse({
			geodata: items
		});
		
	});
}

/**
 * Get GeoDataItem by ID
 */
exports.get = function(req, res) {
	GeoDataItem.model.findById(req.params.id).exec(function(err, item) {
		
		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');
		
		res.apiResponse({
			geodata: item
		});
		
	});
}


/**
 * Create a GeoDataItem
 */
exports.create = function(req, res) {
	
	var item = new GeoDataItem.model(),
		data = (req.method == 'POST') ? req.body : req.query;
	
	item.getUpdateHandler(req).process(data, function(err) {
		
		if (err) return res.apiError('error', err);
		
		res.apiResponse({
			geodata: item
		});
		
	});
}

/**
 * Get GeoDataItem by ID
 */
exports.update = function(req, res) {
	GeoDataItem.model.findById(req.params.id).exec(function(err, item) {
		
		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');
		
		var data = (req.method == 'POST') ? req.body : req.query;
		
		item.getUpdateHandler(req).process(data, function(err) {
			
			if (err) return res.apiError('create error', err);
			
			res.apiResponse({
				geodata: item
			});
			
		});
		
	});
}

/**
 * Delete GeoDataItem by ID
 */
exports.remove = function(req, res) {
	GeoDataItem.model.findById(req.params.id).exec(function (err, item) {
		
		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');
		
		item.remove(function (err) {
			if (err) return res.apiError('database error', err);
			
			return res.apiResponse({
				success: true
			});
		});
		
	});
}