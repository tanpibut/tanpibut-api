var pg = require("../../conf/pg");
var conf = require("../../conf/conf.json");
var pool = pg();
var async = require('async');
const Moment = require('moment');
const MomentRange = require('moment-range');

const moment = MomentRange.extendMoment(Moment);

exports.getObservation = function(req, res) {
    if (req.query.data_type_id) {
        var mapping = conf[req.query.data_type_id]
        if (mapping) {
            getLatestObservation(req, mapping.base.id, true).then(result => {
                if (result) {
                    getLatestObservation(req, mapping.target.id, false).then(data => {
                        if (data) {
                            for (j in result) {
                                //data[i].station
                                for (i in data) {
                                    if (data[i].station.station_id == result[j].station.station_id) {
                                        console.log("special_value=", data[i].value)
                                        result[j]["special_value"] = data[i].value
                                    }
                                }
                            }
                            res.send(result)
                        } else res.send(result)
                    }).catch((err) => {
                        if (err) res.status(400).send(err.message);
                    });
                } else res.send([])
            }).catch((err) => {
                if (err) res.status(400).send(err.message);
            });
        } else {

            getLatestObservation(req, req.query.data_type_id, true).then(result => {
                res.send(result)
            }).catch((err) => {
                if (err) res.status(400).send(err.message);
            });
        }


    } else res.status(400).send({ ERROR: 'invalid request!' });
}

function getLatestObservation(req, datatype_id, sort) {
    // console.log(datatype_id)
    return new Promise((resolve, reject) => {
        let active = "";
        let datatype_condition = "";
        let order_by = "DESC";
        let out = [];

        let queryString = "";

        let castVal = "o.value"
        if (sort) {
            castVal = "cast(o.value as double precision)"
        }

        var withDataSource = "";
        if (req.query.data_source) {
            withDataSource = `AND data_source_id IN (${req.query.data_source})`
        }

        datatype_condition = `AND o.data_type_id = ${datatype_id}`;
        if (req.query.active === 'true') active = `AND o.observed_timestamp >= '${moment().add(-1, "day").format()}'`;
        if (req.query.order_by) order_by = req.query.order_by;
        queryString = `SELECT s.id as s_id, s.station_id, s.station_name, s.tambon_code, s.tambon_namt, s.amphur_code, s.amphur_namt,
	s.province_code, s.province_namt, s.latitude, s.longitude, d.id as d_id, d.org_name, d.logo, d.website, o.data_type_id,
	o.observed_timestamp, o.processing_timestamp, ${castVal} as val 
	FROM tpb_watch.latest_observation o JOIN tpb_master.station s ON o.station_id = s.station_id 
    JOIN tpb_master.data_source d ON s.data_source_id = d.id WHERE 1=1 ${active} ${datatype_condition} ${withDataSource} ORDER BY val ${order_by}`;
        if (req.query.area_code) {
            let in_code = {
                province: "",
                amphur: "",
                tambon: ""
            }
            let code_list = req.query.area_code.split(",");
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
                province: `SELECT s.id as s_id, s.station_id, s.station_name, s.tambon_code, s.tambon_namt, s.amphur_code, s.amphur_namt,
		s.province_code, s.province_namt, s.latitude, s.longitude, d.id as d_id, d.org_name, d.logo, d.website, o.data_type_id,
		o.observed_timestamp, o.processing_timestamp, ${castVal} as val 
		FROM tpb_watch.latest_observation o JOIN tpb_master.station s ON o.station_id = s.station_id 
		JOIN tpb_master.data_source d ON s.data_source_id = d.id WHERE 1=1 ${active} ${datatype_condition} ${withDataSource} AND s.province_code IN (${in_code.province})`,
                amphur: `SELECT s.id as s_id, s.station_id, s.station_name, s.tambon_code, s.tambon_namt, s.amphur_code, s.amphur_namt,
		s.province_code, s.province_namt, s.latitude, s.longitude, d.id as d_id, d.org_name, d.logo, d.website, o.data_type_id,
		o.observed_timestamp, o.processing_timestamp, ${castVal} as val 
		FROM tpb_watch.latest_observation o JOIN tpb_master.station s ON o.station_id = s.station_id 
		JOIN tpb_master.data_source d ON s.data_source_id = d.id WHERE 1=1 ${active} ${datatype_condition} ${withDataSource} AND s.amphur_code IN (${in_code.amphur})`,
                tambon: `SELECT s.id as s_id, s.station_id, s.station_name, s.tambon_code, s.tambon_namt, s.amphur_code, s.amphur_namt,
		s.province_code, s.province_namt, s.latitude, s.longitude, d.id as d_id, d.org_name, d.logo, d.website, o.data_type_id,
		o.observed_timestamp, o.processing_timestamp, ${castVal} as val 
		FROM tpb_watch.latest_observation o JOIN tpb_master.station s ON o.station_id = s.station_id 
		JOIN tpb_master.data_source d ON s.data_source_id = d.id WHERE 1=1 ${active} ${datatype_condition} ${withDataSource} AND s.tambon_code IN (${in_code.tambon})`,
                str: ""
            }

            if (in_code.province !== "") {
                query.str = query.province;
            }
            if (in_code.amphur !== "") {
                if (query.str !== "") query.str += " UNION ";
                query.str += query.amphur;
            }
            if (in_code.tambon !== "") {
                if (query.str !== "") query.str += " UNION ";
                query.str += query.tambon;
            }
            if (query.str !== "") {
                query.str += ` ORDER BY val ${order_by}`;
                queryString = query.str;
                // console.log(query.str);
            }

        }

        execute(queryString).then((data) => {
            for (var i = 0; i < data.rows.length; i++) {
                out.push({
                    station: {
                        id: data.rows[i].s_id,
                        station_id: data.rows[i].station_id,
                        station_name: data.rows[i].station_name,
                        address: {
                            tambon_code: data.rows[i].tambon_code,
                            tambon_namt: data.rows[i].tambon_namt,
                            amphur_code: data.rows[i].amphur_code,
                            amphur_namt: data.rows[i].amphur_namt,
                            province_code: data.rows[i].province_code,
                            province_namt: data.rows[i].province_namt
                        },
                        latitude: data.rows[i].latitude,
                        longitude: data.rows[i].longitude,
                        owner: {
                            id: data.rows[i].d_id,
                            organization: data.rows[i].org_name,
                            logo: data.rows[i].logo,
                            website: data.rows[i].website
                        }
                    },
                    processing_timestamp: moment(data.rows[i].processing_timestamp).format("YYYY-MM-DD HH:mm:ss"),
                    observed_timestamp: moment(data.rows[i].observed_timestamp).format("YYYY-MM-DD HH:mm:ss"),
                    value: data.rows[i].val
                });
            }
            resolve(out);
        }).catch((err) => {
            if (err) reject(err.message);
        });

    })
}

exports.getObservationHistory = function(req, res) {
    let start_ts = "";
    let end_ts = "";
    let data_type_id = "";
    let out = [];

    if (req.query.data_type_id) {
        if (req.query.start_ts && req.query.end_ts) {
            let start = moment(new Date(req.query.start_ts));
            let end = moment(new Date(req.query.end_ts));
            let now_ts = moment(new Date());

            //console.log(end.format("YYYY-MM-DD HH:mm:ss"));
            if (!req.query.by_interval) {
                if (now_ts.isBefore(end))
                    end = now_ts;
            }
            //console.log(end.format("YYYY-MM-DD HH:mm:ss"));

            start_ts = `AND o.observed_timestamp >= '${req.query.start_ts}'`;
            end_ts = `AND o.observed_timestamp <= '${req.query.end_ts}'`;

            data_type_id = `AND o.data_type_id = ${req.query.data_type_id}`;

            if (req.query.station_id) {

                let station_list = req.query.station_id.split(",");

                let idx = 0;
                async.whilst(function() { return idx < station_list.length; }, function(callback) {
                        //get interval
                        let queryInterval = `SELECT interval, start_measuring_time from tpb_master.station WHERE station_id = '${station_list[idx]}'`
                        execute(queryInterval).then(intv => {
                            if (intv.rows.length > 0) {
                                let interval = intv.rows[0].interval;
                                let query = `SELECT s.id as s_id, s.station_id, s.station_name, o.observed_timestamp, o.processing_timestamp, cast(o.value as double precision) as val, o.delay 
                    FROM tpb_watch.observation o JOIN tpb_master.station s ON o.station_id = s.station_id 
                    WHERE 1=1 ${start_ts} ${end_ts} ${data_type_id} AND o.fillgap = 0 AND s.station_id = '${station_list[idx]}' ORDER BY o.observed_timestamp`;
                                execute(query).then((data) => {
                                    idx++;
                                    if (data.rows.length > 0) {
                                        // console.log(data.rows[0].station_id, "-", data.rows[0].observed_timestamp, "val:", data.rows[0].val, "end:", end)
                                        let value = {
                                            id: data.rows[0].s_id,
                                            station_id: data.rows[0].station_id,
                                            data: []
                                        }
                                        let obs_ts = moment(start.format('YYYY-MM-DD') + ' ' + intv.rows[0].start_measuring_time).second(0).valueOf();

                                        let r = 0;
                                        while (obs_ts <= end.valueOf()) {
                                            if (obs_ts >= start.valueOf()) {
                                                let obs_val = null;
                                                let obs_delay = null;
                                                let obs_pts = moment(obs_ts).second(0).format("YYYY-MM-DD HH:mm:ss");
                                                if (r < data.rows.length) {
                                                    // console.log(moment(obs_ts), "==", moment(moment(data.rows[r].observed_timestamp).second(0).valueOf()))
                                                    if (obs_ts == moment(data.rows[r].observed_timestamp).second(0).valueOf()) {
                                                        obs_val = data.rows[r].val;
                                                        obs_delay = data.rows[r].delay;
                                                        obs_pts = moment(data.rows[r].processing_timestamp).format("YYYY-MM-DD HH:mm:ss");
                                                        r++;
                                                    }
                                                }
                                                value.data.push({
                                                    processing_timestamp: moment(obs_pts).format("YYYY-MM-DD HH:mm:ss"),
                                                    observed_timestamp: moment(obs_ts).format("YYYY-MM-DD HH:mm:ss"),
                                                    value: obs_val,
                                                    delay: obs_delay
                                                });
                                            }

                                            //console.log(moment(obs_ts).format("YYYY-MM-DD HH:mm:ss"),":", obs_val);
                                            obs_ts += interval;
                                        }

                                        out.push(value);
                                        callback();
                                    } else {
                                        let value = {
                                            id: "",
                                            station_id: req.query.data_type_id,
                                            data: []
                                        }
                                        if (req.query.by_interval) {

                                            let obs_ts = moment(start.format('YYYY/MM/DD') + ' ' + intv.rows[0].start_measuring_time);
                                            while (obs_ts <= end.valueOf()) {
                                                if (obs_ts >= start.valueOf()) {
                                                    let obs_val = null;
                                                    let obs_delay = null;
                                                    let obs_pts = moment(obs_ts).format("YYYY-MM-DD HH:mm:ss");

                                                    value.data.push({
                                                        processing_timestamp: moment(obs_pts).format("YYYY-MM-DD HH:mm:ss"),
                                                        observed_timestamp: moment(obs_ts).format("YYYY-MM-DD HH:mm:ss"),
                                                        value: obs_val,
                                                        delay: obs_delay
                                                    });
                                                }

                                                //console.log(moment(obs_ts).format("YYYY-MM-DD HH:mm:ss"),":", obs_val);
                                                obs_ts += interval;
                                            }
                                        }
                                        out.push(value);
                                        callback();
                                    }
                                }).catch((err) => {
                                    callback(err)
                                });
                            } else {
                                callback(err)
                            }
                        }).catch((err) => {
                            callback(err)
                        });




                    },
                    function(err) {
                        if (err) {
                            res.send(err.stack);
                        } else {
                            res.send(out);
                        }
                    });
            } else {
                res.status(400);
                res.send('Invalid parameter "station_id"');
            }
        } else {
            res.status(400);
            res.send('Invalid datetime parameters');
        }
    } else {
        res.status(400);
        res.send('invalid request!');
    }


    // let query =  `SELECT s.id as s_id, s.station_id, s.station_name, s.tambon_code, s.tambon_namt, s.amphur_code, s.amphur_namt,
    // s.province_code, s.province_namt, s.latitude, s.longitude, d.id as d_id, d.org_name, d.logo, d.website, o.data_type_id,
    // o.observed_timestamp, o.processing_timestamp, cast(o.value as double precision) as val 
    // FROM tpb_watch.observation o JOIN tpb_master.station s ON o.station_id = s.station_id 
    // JOIN tpb_master.data_source d ON s.data_source_id = d.id WHERE 1=1 ${start_ts} ${end_ts} ${data_type_id} AND s.station_id = (${station_list[idx]}) ORDER BY o.observed_timestamp`;

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