var express = require('express');
var morgan = require('morgan');//winston
var compression = require('compression');

module.exports = function() {
	var app = express();

	if(process.env.TANPIBUT_MODE === 'dev') {
		app.use(morgan('dev'));
	}
	var v1 = require('../app/routes/tanpibut.route')(express.Router());
	app.use(function(req, res, next) {
	  res.header("Access-Control-Allow-Origin", "*");
	  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	  next();
	});
	app.use('/v1', v1);
	if(process.env.TANPIBUT_MODE !== 'dev') {
		app.use(compression);
	} 


	return app;
}