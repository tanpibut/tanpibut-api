var pg = require("../../conf/pg");
var pool = pg();
var async = require('async');

exports.area = function(req, res) {
    var area_code = req.query.area_code;
    var data_source = req.query.data_source;
    var geojsonField = "";
    var withStationFilter = {
        prov: "",
        amphur: "",
        tambon: ""
    };

    var codeField = {
        prov: "prov_code",
        amphur: "amp_code",
        tambon: "t.tambon_code"
    }
    var has_boundary = false;
    var has_station = false;

    if (req.query.has_boundary === 'true') {
        geojsonField = ", geojson_4326";
        has_boundary = true;
    }


    var withDataSource = "";
    if (req.query.has_station === 'true') {
        if (data_source) {
            withDataSource = `AND data_source_id IN (${data_source})`
        }

        withStationFilter.prov = "JOIN tpb_master.station ON prov_code = province_code";
        codeField.prov = "distinct(prov_code)";
        withStationFilter.amphur = "JOIN tpb_master.station ON amp_code = amphur_code";
        codeField.amphur = "distinct(amp_code)";
        withStationFilter.tambon = "JOIN tpb_master.station s ON t.tambon_code = s.tambon_code";
        codeField.tambon = "distinct(t.tambon_code)";
        has_station = true;
    }


    var query = {
        province: `SELECT ${codeField.prov}, prov_namt ${geojsonField} FROM tpb_master.province ${withStationFilter.prov} WHERE prov_code != '00' ${withDataSource} ORDER BY prov_code`,
        amphur: `SELECT ${codeField.amphur}, amp_namt ${geojsonField} FROM tpb_master.amphur ${withStationFilter.amphur} WHERE prov_code = '${area_code}' ${withDataSource} ORDER BY amp_code`,
        tambon: `SELECT ${codeField.tambon}, t.tambon_namt ${geojsonField} FROM tpb_master.tambon t ${withStationFilter.tambon} WHERE t.amp_code = '${area_code}' ${withDataSource} ORDER BY t.tambon_code`,
    }


    if (area_code) {
        let results = [];
        if (area_code.length === 2 && !isNaN(parseInt(area_code))) {
            if (area_code === "00") {
                //console.log(query.province);
                execute(query.province).then((result) => {
                    for (var i = 0; i < result.rows.length; i++) {
                        let data = {
                            area_code: result.rows[i].prov_code,
                            area_name: result.rows[i].prov_namt
                        };
                        if (has_boundary) data.boundary = JSON.parse(result.rows[i].geojson_4326);
                        results.push(data);
                    }
                    res.send(results);
                }).catch((err) => {
                    res.send(err.message);
                });
            } else {
                //console.log(query.amphur);
                execute(query.amphur).then((result) => {
                    for (var i = 0; i < result.rows.length; i++) {
                        let data = {
                            area_code: result.rows[i].amp_code,
                            area_name: result.rows[i].amp_namt
                        };
                        if (has_boundary) data.boundary = JSON.parse(result.rows[i].geojson_4326);
                        results.push(data);
                    }
                    res.send(results);
                }).catch((err) => {
                    res.send(err.message);
                });
            }
        } else if (area_code.length === 4 && !isNaN(parseInt(area_code)) && !area_code.startsWith("00")) {
            //console.log(query.tambon);
            execute(query.tambon).then((result) => {
                for (var i = 0; i < result.rows.length; i++) {
                    let data = {
                        area_code: result.rows[i].tambon_code,
                        area_name: result.rows[i].tambon_namt
                    };
                    if (has_boundary) data.boundary = JSON.parse(result.rows[i].geojson_4326);
                    results.push(data);
                }
                res.send(results);
            }).catch((err) => {
                res.send(err.message);
            });
        } else {
            res.status(400);
            res.send({
                status_code: 400,
                error: `Incorrect query = ${area_code}`,
            });
        }
    } else {
        res.send({
            area_code: "00",
            area_name: "ประเทศไทย"
        })
    }

}

exports.boundary = function(req, res) {
    var area_code = req.query.area_code;
    let out = [];
    let box = [];

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
            province: `SELECT prov_code as area_code, geojson_4326, bbox_4326 FROM tpb_master.province WHERE prov_code IN (${in_code.province}) ORDER BY prov_namt`,
            amphur: `SELECT amp_code as area_code, geojson_4326, bbox_4326 FROM tpb_master.amphur WHERE amp_code IN (${in_code.amphur}) ORDER BY amp_namt`,
            tambon: `SELECT tambon_code as area_code, geojson_4326, bbox_4326 FROM tpb_master.tambon WHERE tambon_code IN (${in_code.tambon}) ORDER BY tambon_namt`,
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
                        out.push({
                            area_code: result.rows[i].area_code,
                            boundary: result.rows[i].geojson_4326,
                        });
                        let bx = result.rows[i].bbox_4326.split(",");
                        if (box.length === 0) {
                            for (var x = 0; x < bx.length; x++) {
                                box.push(parseFloat(bx[x]));
                            }
                        } else {
                            for (var x = 0; x < bx.length; x++) {
                                if (x <= 1) {
                                    if (box[x] > parseFloat(bx[x])) box[x] = parseFloat(bx[x]);
                                } else {
                                    if (box[x] < parseFloat(bx[x])) box[x] = parseFloat(bx[x]);
                                }
                            }
                        }
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
                let result = {
                    bbox: box,
                    boundaries: out
                }
                res.send(result);
            }
        });
    } else {
        res.status(400);
        res.send({
            status_code: 400,
            error: 'Please define query (area_code)',
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