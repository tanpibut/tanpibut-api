var async = require('async');
var pg = require("../../conf/pg");
var pool = pg();
exports.getDataType = function(req, res) {
    var results = [];

    execute("SELECT dc.id, dc.name, dc.namt FROM tpb_master.data_category dc ORDER BY dc.id").then((result) => {
        let index = 0;
        async.whilst(function() { return index < result.rows.length; }, function(cb) {
            let category = {
                id: result.rows[index].id,
                name: result.rows[index].name,
                namt: result.rows[index].namt,
                data_types: []
            };
            execute(`SELECT dt.id, dt.name, dt.namt, dt.unit, dt.desc_order FROM tpb_master.data_type dt WHERE dt.id != 0 AND dt.data_category_id = ${result.rows[index].id} AND dt.ranking IS NOT NULL ORDER BY dt.ranking`).then((dt_result) => {
                index++;
                let idx = 0;
                async.whilst(function() { return idx < dt_result.rows.length; }, function(callback) {
                    let dataType = {
                        id: dt_result.rows[idx].id,
                        name: dt_result.rows[idx].name,
                        namt: dt_result.rows[idx].namt,
                        unit: dt_result.rows[idx].unit,
                        desc_order: dt_result.rows[idx].desc_order
                    }
                    execute(`SELECT vt.id, vt.theme_name, vt.value_unit, vt.v_category_id, vt.to_all_stations, vt.data_type_id, vt.parent_theme_id,
						v.id as c_id, v.category_name, v.category_number, v.category_label1, v.category_color1, 
						v.category_label2, v.category_color2, v.category_label3, v.category_color3,
						v.category_label4, v.category_color4, v.category_label5, v.category_color5,
                        vc.value1, vc.value2, vc.value3, vc.value4, vc.value5
						  FROM tpb_master.v_theme vt JOIN tpb_master.v_category v ON vt.v_category_id = v.id 
						  JOIN tpb_master.v_criteria vc ON vt.parent_theme_id = vc.v_theme_id
						  WHERE vt.data_type_id = ${dt_result.rows[idx].id} ORDER BY vt.id; `).then((vc_result) => {
                        idx++;
                        if (vc_result.rows.length > 0) {
                            dataType.v_theme = [];
                            for (var b = 0; b < vc_result.rows.length; b++) {
                                let theme = {
                                    id: vc_result.rows[b].id,
                                    name: vc_result.rows[b].theme_name,
                                    value_unit: vc_result.rows[b].value_unit,
                                    apply_all: vc_result.rows[b].to_all_stations,
                                    v_category: [],
                                    v_criteria_basic: {}
                                };
                                let cat_num = parseInt(vc_result.rows[b].category_number);
                                for (var c = 1; c <= cat_num; c++) {
                                    theme.v_category.push({
                                        no: c,
                                        color: vc_result.rows[b]["category_color" + c],
                                        label: vc_result.rows[b]["category_label" + c],
                                    });
                                    theme.v_criteria_basic[c] = vc_result.rows[b]["value" + c]
                                }
                                dataType.v_theme.push(theme);
                            }
                        }

                        //v_chart
                        execute(`select * from tpb_master.v_chart where data_type_id = ${dataType.id}`).then(v_chart => {
                            if (v_chart.rows.length > 0) {
                                dataType.v_chart = [];
                                for (i in v_chart.rows) {
                                    let chart = v_chart.rows[i]
                                    let chart_item = {
                                        data_source_id: chart.data_source_id,
                                        y_axis: {
                                            left: {
                                                data_type_id: chart.y_axis_left_dt_id,
                                                chart_type: chart.y_axis_left_chart_type,
                                                label: chart.y_axis_left_label,
                                                legend: chart.y_axis_left_legend
                                            }
                                        },
                                        x_axis: {
                                            duration: chart.x_axis_duration,
                                            end_time: chart.x_axis_end_time
                                        }
                                    }

                                    if (chart.y_axis_right_dt_id) {
                                        chart_item.y_axis["right"] = {
                                            data_type_id: chart.data_type_id,
                                            chart_type: chart.y_axis_right_chart_type,
                                            label: chart.y_axis_right_label,
                                            legend: chart.y_axis_right_legend,
                                            cumulative_dist: chart.y_axis_right_cumulative_dist,
                                            legend_cumulative_dist: chart.y_axis_right_legend_cumulative_dist
                                        }
                                    }
                                    dataType.v_chart.push(chart_item)
                                }
                            }
                            category.data_types.push(dataType);
                            callback();
                        }).catch((err) => {
                            callback(err);
                            //res.send(err.message);
                        });

                    }).catch((err) => {
                        callback(err);
                        //res.send(err.message);
                    });
                }, function(err) {
                    if (err) {
                        res.send(err.stack);
                    } else {
                        results.push(category);
                    }
                    cb();
                });


            }).catch((err) => {
                cb(err);
                //res.send(err.stack);
            });

        }, function(err) {
            if (err) {
                res.send(err.message);
            } else {
                res.send(results);
            }
        });

    }).catch((err) => {
        res.send(err.message);
    });
}

exports.getLocalCriteria = function(req, res) {
    let out = [];
    if (req.query.theme_id) {
        let theme_id = req.query.theme_id;
        if (req.query.area_code && req.query.area_code) {
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
            let query = {
                province: `SELECT s.station_id, c.category_number,vc.value1, vc.value2, vc.value3, vc.value4, vc.value5
                    FROM tpb_master.v_theme t JOIN tpb_master.v_criteria vc ON t.id = vc.v_theme_id JOIN tpb_master.v_category c ON t.v_category_id = c.id JOIN tpb_master.station s ON s.station_id = vc.station_id 
                    WHERE vc.v_theme_id = ${theme_id} AND province_code IN (${in_code.province})`,
                amphur: `SELECT s.station_id, c.category_number,vc.value1, vc.value2, vc.value3, vc.value4, vc.value5
                    FROM tpb_master.v_theme t JOIN tpb_master.v_criteria vc ON t.id = vc.v_theme_id JOIN tpb_master.v_category c ON t.v_category_id = c.id JOIN tpb_master.station s ON s.station_id = vc.station_id 
                    WHERE vc.v_theme_id = ${theme_id} AND amphur_code IN (${in_code.amphur})`,
                tambon: `SELECT s.station_id, c.category_number,vc.value1, vc.value2, vc.value3, vc.value4, vc.value5
                    FROM tpb_master.v_theme t JOIN tpb_master.v_criteria vc ON t.id = vc.v_theme_id JOIN tpb_master.v_category c ON t.v_category_id = c.id JOIN tpb_master.station s ON s.station_id = vc.station_id 
                    WHERE vc.v_theme_id = ${theme_id} AND tambon_code = (${in_code.tambon})`,
                str: ""
            }

            if (in_code.province !== "") {
                query.str = query.province;
            }
            if (in_code.amphur !== "") {
                if (query.str !== "") query.str += "UNION ";
                query.str += query.amphur;
            }
            if (in_code.tambon !== "") {
                if (query.str !== "") query.str += "UNION ";
                query.str += query.tambon;
            }

            if (query.str != "") {
                execute(query.str).then((data) => {
                    for (var i = 0; i < data.rows.length; i++) {
                        let local_cri = {
                            station_id: data.rows[i].station_id,
                            v_criteria: {}
                        };
                        let cat_num = parseInt(data.rows[i].category_number);
                        for (var c = 1; c <= cat_num; c++) {
                            local_cri.v_criteria[c] = data.rows[i]["value" + c];
                        }
                        out.push(local_cri);
                    }
                    res.send(out);
                }).catch((err) => {
                    res.send(err);
                });
            } else res.send(out);
        } else {
            res.status(400);
            res.send('invalid request!');
        }
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