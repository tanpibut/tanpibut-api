var pg = require("../../conf/pg");
var pool = pg();

exports.area = function(req, res) {
    var area_code = req.query.area_code;
    var data_source = req.query.data_source;
    var callback = req.query.callback;
    var fnCallback = false;
    var geojsonField = "";
    var has_boundary = false;
    var has_station = false;

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

    if (req.query.has_boundary) {
        geojsonField = ", geojson_4326";
        has_boundary = true;
    }

    if (typeof callback !== 'undefined') {
        fnCallback = true;
    }

    var withDataSource = "";
    if (req.query.has_station) {
        if (data_source) {
            withDataSource = `AND data_source_id IN (${data_source})`
        }

        withStationFilter.prov = "JOIN tpb_master.station ON prov_code = province_code";
        codeField.prov = "distinct prov_code";
        withStationFilter.amphur = "JOIN tpb_master.station ON amp_code = amphur_code";
        codeField.amphur = "distinct amp_code";
        withStationFilter.tambon = "JOIN tpb_master.station s ON s.tambon_code = t.tambon_code";
        codeField.tambon = "distinct t.tambon_code";
        has_station = true;
    }

    var query = {
        province: `SELECT * FROM (SELECT ${codeField.prov}, prov_namt ${geojsonField} FROM tpb_master.province ${withStationFilter.prov} WHERE prov_code != '00' ${withDataSource}) as prov ORDER BY prov_namt COLLATE "thai"`,
        amphur: `SELECT * FROM (SELECT ${codeField.amphur}, amp_namt ${geojsonField} FROM tpb_master.amphur ${withStationFilter.amphur} WHERE prov_code = '${area_code}' ${withDataSource}) as amph ORDER BY amp_namt COLLATE "thai"`,
        tambon: `SELECT * FROM (SELECT ${codeField.tambon}, t.tambon_namt ${geojsonField} FROM tpb_master.tambon t ${withStationFilter.tambon} WHERE t.amp_code = '${area_code}' ${withDataSource}) as tamb ORDER BY tambon_namt COLLATE "thai"`,
    }


    if (typeof area_code !== 'undefined') {
        let results = [];
        if (area_code.length === 2 && !isNaN(parseInt(area_code))) {
            if (area_code === "00") {
                //console.log(query.province)
                execute(query.province).then((result) => {
                    for (var i = 0; i < result.rows.length; i++) {
                        let data = {
                            area_code: result.rows[i].prov_code,
                            area_name: result.rows[i].prov_namt,
                            hasChildren: true
                        };
                        if (has_boundary) data.boundary = JSON.parse(result.rows[i].geojson_4326);
                        results.push(data);
                    }
                    if (fnCallback) {
                        res.status(200);
                        res.setHeader('Content-Type', 'application/x-javascript')
                        res.setHeader('Cache-Control', 'no-cache')
                        results = `${callback}(${JSON.stringify(results)})`;
                    }
                    res.send(results);
                }).catch((err) => {
                    res.send(err.message);
                });
            } else {
                execute(query.amphur).then((result) => {
                    for (var i = 0; i < result.rows.length; i++) {
                        let data = {
                            area_code: result.rows[i].amp_code,
                            area_name: result.rows[i].amp_namt,
                            hasChildren: true
                        };
                        if (has_boundary) data.boundary = JSON.parse(result.rows[i].geojson_4326);
                        results.push(data);
                    }
                    if (fnCallback) {
                        res.status(200);
                        res.setHeader('Content-Type', 'application/x-javascript')
                        res.setHeader('Cache-Control', 'no-cache')
                        results = `${callback}(${JSON.stringify(results)})`;
                    }
                    res.send(results);
                }).catch((err) => {
                    res.send(err.message);
                });
            }
        } else if (area_code.length === 4 && !isNaN(parseInt(area_code)) && !area_code.startsWith("00")) {
            execute(query.tambon).then((result) => {
                for (var i = 0; i < result.rows.length; i++) {
                    let data = {
                        area_code: result.rows[i].tambon_code,
                        area_name: result.rows[i].tambon_namt,
                        hasChildren: false
                    };
                    if (has_boundary) data.boundary = JSON.parse(result.rows[i].geojson_4326);
                    results.push(data);
                }
                if (fnCallback) {
                    res.status(200);
                    res.setHeader('Content-Type', 'application/x-javascript')
                    res.setHeader('Cache-Control', 'no-cache')
                    results = `${callback}(${JSON.stringify(results)})`;
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
            })
        }
    } else {
        let out = [];
        out.push({
            area_code: "00",
            area_name: "ประเทศไทย",
            hasChildren: true
        })
        if (fnCallback) {
            res.status(200);
            res.setHeader('Content-Type', 'application/x-javascript')
            res.setHeader('Cache-Control', 'no-cache')
            out = `${callback}(${JSON.stringify(out)})`;
        }
        res.send(out);
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