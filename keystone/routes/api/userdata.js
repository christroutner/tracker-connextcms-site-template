var async = require('async'),
	keystone = require('keystone');

var UserData = keystone.list('UserData');

/**
 * List UserData
 */
exports.list = function(req, res) {
	UserData.model.find(function(err, items) {
		
		if (err) return res.apiError('database error', err);
		
		res.apiResponse({
			geodata: items
		});
		
	});
}

/**
 * Get UserData by ID
 */
exports.get = function(req, res) {
	UserData.model.findById(req.params.id).exec(function(err, item) {
		
		if (err) return res.apiError('database error', err);
		if (!item) return res.apiError('not found');
		
		res.apiResponse({
			geodata: item
		});
		
	});
}


/**
 * Create a UserData
 */
exports.create = function(req, res) {
	
	var item = new UserData.model(),
		data = (req.method == 'POST') ? req.body : req.query;
	
	item.getUpdateHandler(req).process(data, function(err) {
		
		if (err) return res.apiError('error', err);
		
		res.apiResponse({
			geodata: item
		});
		
	});
}

/**
 * Update UserData by ID
 */
exports.update = function(req, res) {
	UserData.model.findById(req.params.id).exec(function(err, item) {
		
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
 * Delete UserData by ID
 */
exports.remove = function(req, res) {
	UserData.model.findById(req.params.id).exec(function (err, item) {
		
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