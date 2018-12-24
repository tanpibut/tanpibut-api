var pg = require("../../conf/pg");
var pool = pg();
var async = require('async');

exports.station = function(req, res) {
    var area_code = req.query.area_code;
    var condition = "";
    var query = {
        all_station: `SELECT st.id, st.station_id, st.station_name, st.tambon_code, st.tambon_namt, st.amphur_code, st.amphur_namt, st.province_code, st.province_namt, st.latitude, st.longitude, ds.id as s_id, ds.org_name, ds.logo, ds.website 
	 	FROM tpb_master.station st JOIN tpb_master.data_source ds ON st.data_source_id = ds.id WHERE st.active = true ORDER BY st.id`
    }

    let results = [];
    if (area_code) {
        let code_list = area_code.split(",");
        let in_code = {
            province: "",
            amphur: "",
            tambon: ""
        }

        for (var i = 0; i < code_list.length; i++) {
            if (code_list[i].length === 2 && !isNaN(parseInt(code_list[i]))) {
                if (in_code.province === "") in_code.province += `'${code_list[i]}'`;
                else in_code.province += `,'${code_list[i]}'`;
            } else if (code_list[i].length === 4 && !isNaN(parseInt(code_list[i]))) {
                if (in_code.amphur === "") in_code.amphur += `'${code_list[i]}'`;
                else in_code.amphur += `,'${code_list[i]}'`;
            } else if (code_list[i].length === 6 && !isNaN(parseInt(code_list[i]))) {
                if (in_code.tambon === "") in_code.tambon += `'${code_list[i]}'`;
                else in_code.tambon += `,'${code_list[i]}'`;
            }
        }

        var query = {
            province: `SELECT st.id, st.station_id, st.station_name, st.tambon_code, st.tambon_namt, st.amphur_code, st.amphur_namt, st.province_code, st.province_namt, st.latitude, st.longitude, ds.id as s_id, ds.org_name, ds.logo, ds.website
	 	FROM tpb_master.station st JOIN tpb_master.data_source ds ON st.data_source_id = ds.id WHERE st.province_code IN (${in_code.province}) AND st.active = true ORDER BY st.id`,
            amphur: `SELECT st.id, st.station_id, st.station_name, st.tambon_code, st.tambon_namt, st.amphur_code, st.amphur_namt, st.province_code, st.province_namt, st.latitude, st.longitude, ds.id as s_id, ds.org_name, ds.logo, ds.website
	 	FROM tpb_master.station st JOIN tpb_master.data_source ds ON st.data_source_id = ds.id WHERE st.amphur_code IN (${in_code.amphur}) AND st.active = true ORDER BY st.id`,
            tambon: `SELECT st.id, st.station_id, st.station_name, st.tambon_code, st.tambon_namt, st.amphur_code, st.amphur_namt, st.province_code, st.province_namt, st.latitude, st.longitude, ds.id as s_id, ds.org_name, ds.logo, ds.website
	 	FROM tpb_master.station st JOIN tpb_master.data_source ds ON st.data_source_id = ds.id WHERE st.tambon_code IN (${in_code.tambon}) AND st.active = true ORDER BY st.id`,
        }

        let arr = Object.keys(in_code);

        let idx = 0;
        async.whilst(function() { return idx < arr.length; }, function(callback) {
            //console.log(in_code[arr[idx]]);
            if (in_code[arr[idx]] !== "") {
                //console.log(query[arr[idx]]);
                execute(query[arr[idx]]).then((result) => {
                    idx++;
                    for (var i = 0; i < result.rows.length; i++) {
                        results.push({
                            id: result.rows[i].id,
                            station_id: result.rows[i].station_id,
                            station_name: result.rows[i].station_name,
                            address: {
                                tambon_code: result.rows[i].tambon_code,
                                tambon_namt: result.rows[i].tambon_namt,
                                amphur_code: result.rows[i].amphur_code,
                                amphur_namt: result.rows[i].amphur_namt,
                                province_code: result.rows[i].province_code,
                                province_namt: result.rows[i].province_namt
                            },
                            latitude: result.rows[i].latitude,
                            longitude: result.rows[i].longitude,
                            owner: {
                                id: result.rows[i].s_id,
                                organization: result.rows[i].org_name,
                                logo: result.rows[i].logo,
                                website: result.rows[i].website
                            }
                        });
                    }
                    callback();
                }).catch((err) => {
                    callback(err)
                });
            } else {
                idx++;
                callback();
            }
        }, function(err) {
            if (err) {
                res.send(err.stack);
            } else {
                res.send(results);
            }
        });

    } else {
        execute(query.all_station).then((result) => {
            for (var i = 0; i < result.rows.length; i++) {
                let data = {
                    id: result.rows[i].id,
                    station_id: result.rows[i].station_id,
                    station_name: result.rows[i].station_name,
                    address: {
                        tambon_code: result.rows[i].tambon_code,
                        tambon_namt: result.rows[i].tambon_namt,
                        amphur_code: result.rows[i].amphur_code,
                        amphur_namt: result.rows[i].amphur_namt,
                        province_code: result.rows[i].province_code,
                        province_namt: result.rows[i].province_namt
                    },
                    latitude: result.rows[i].latitude,
                    longitude: result.rows[i].longitude,
                    owner: {
                        id: result.rows[i].s_id,
                        organization: result.rows[i].org_name,
                        logo: result.rows[i].logo,
                        website: result.rows[i].website
                    }
                };
                results.push(data);
            }
            res.send(results);
        }).catch((err) => {
            res.send(err.message);
        });
    }


}

function execute(querySrc) {
    return new Promise((resolve, reject) => {
        // pool.connect(function(err, client, done) {
        //     if (err) {
        //         return reject('error fetching client from pool', err);
        //     }
        //     client.query(querySrc, function(error, result) {
        //         done(error);
        //         if (error) {
        //             return reject('error running query', error);
        //         } else {
        //             resolve(result);
        //         }
        //     })
        // })
        // pool.on('error', function(err, client) {
        //     return reject('idle client error', err.message, err.stack)
        // })
        pool.connect().then(client => {
            client.query(querySrc).then(result => {
                client.release()
                if (result) {
                    resolve(result);
                } else reject('error running query', error);
            }).catch(err => {
                client.release()
                console.log(err.stack)
                reject(err)
            })
        })
    })
}