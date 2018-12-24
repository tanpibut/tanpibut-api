var pg = require("../../conf/pg");

exports.render = function(req, res) {
	res.send('Hello API');
}

exports.user = function(req, res) {
	var results = [];
	var pool = pg();
	pool.connect(function(err, client, done){
		if(err) {
			res.send('error fetching client from pool', err);
		}
		client.query("SELECT * FROM trb_user.user_profile WHERE firstname != ''", function(error, result){
			done(error);
			if(error){
				res.send('error running query', err);
			}
			else{
				for (var i = 0; i < result.rows.length; i++) {
					results.push({
						firstname: result.rows[i].firstname,
						lastname: result.rows[i].lastname
					});
				}
			}
			
			res.send(results);
		})
	})
	pool.on('error', function (err, client) {
	  res.send('idle client error', err.message, err.stack)
	})
}
