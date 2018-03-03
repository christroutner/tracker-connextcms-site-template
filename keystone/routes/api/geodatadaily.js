var async = require('async'),
	keystone = require('keystone');

var GeoDataDaily = keystone.list('GeoDataDaily');

/**
 * List GeoDataDaily
 */
exports.list = function(req, res) {
	GeoDataDaily.model.find(function(err, items) {
		
		if (err) return res.apiError('database error', err);
		
		res.apiResponse({
			geodata: items
		});
		
	});
}

/**
 * Get GeoDataDaily by ID
 */
exports.get = function(req, res) {
	GeoDataDaily.model.findById(req.params.id).exec(function(err, item) {
		
		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');
		
		res.apiResponse({
			geodata: item
		});
		
	});
}


/**
 * Create a GeoDataDaily
 */
exports.create = function(req, res) {
	
	var item = new GeoDataDaily.model(),
		data = (req.method == 'POST') ? req.body : req.query;
	
	item.getUpdateHandler(req).process(data, function(err) {
		
		if (err) return res.apiError('error', err);
		
		res.apiResponse({
			geodata: item
		});
		
	});
}

/**
 * Get GeoDataDaily by ID
 */
exports.update = function(req, res) {
	GeoDataDaily.model.findById(req.params.id).exec(function(err, item) {
		
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
 * Delete GeoDataDaily by ID
 */
exports.remove = function(req, res) {
	GeoDataDaily.model.findById(req.params.id).exec(function (err, item) {
		
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