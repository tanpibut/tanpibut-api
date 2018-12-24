const pg = require("../../conf/pg");
const pool = pg();
const Moment = require('moment');

exports.getHealth = function(req, res) {
    let start_date = req.query.start_date
    let end_date = req.query.end_date
    if (start_date && end_date) {
        let area_code = req.query.area_code;

        let in_code = {
            province: "",
            amphur: "",
            tambon: ""
        }
        if (area_code) {
            let code_list = area_code.split(",");
            for (var i in code_list) {
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
        }

        var withDataSource = "s.data_source_id = 1";
        if (req.query.data_source) {
            withDataSource = `s.data_source_id IN (${req.query.data_source})`
        }

        let in_prov = ""
        let in_amphur = ""
        let in_tambon = ""

        if (in_code.province != "")
            in_prov = `AND province_code IN (${in_code.province})`
        if (in_code.amphur != "")
            in_amphur = `AND amphur_code IN (${in_code.amphur})`
        if (in_code.tambon != "")
            in_tambon = `AND tambon_code IN (${in_code.tambon})`

        let query = `select s.station_id, s.station_name, s.tambon_code, s.tambon_namt, s.amphur_code, s.amphur_namt, s.province_code, s.province_namt, s.latitude, s.longitude, d.id as d_id, d.org_name, d.logo, d.website, ct.*
        from
        (select * 
        from public.crosstab( 
           $$select array[date::text, sh.station_id::text] as row_name, date, sh.station_id, name, health_value 
             from tpb_health.station_health sh join tpb_master.health_type ht on sh.health_type_id = ht.id and 
                   date between '${start_date}' and '${end_date}'
                   Join tpb_master.station s on s.station_id = sh.station_id and ${withDataSource}  
             order by 1 $$,  
           $$select name from tpb_master.health_type order by id $$)
        AS final_result(row_name text, date date, station_id character varying, overall double precision, 
                        rain double precision, temperature double precision, 
                         humidity double precision, battery double precision, signal double precision, 
                         completeness double precision, delivery double precision) 
        order by station_id, date) as ct join tpb_master.station s on ct.station_id = s.station_id join tpb_master.data_source d on s.data_source_id = d.id
        WHERE 1 = 1 ${in_prov} ${in_amphur} ${in_tambon}`

        let out = []

        pool.connect().then(client => {
            client.query(query).then(result => {
                client.release()
                if (result) {
                    let stationid = ""
                    let healthData = {}
                    for (i in result.rows) {
                        let data = result.rows[i]
                        let date = Moment(data.date).format("YYYY-MM-DD")
                        if (stationid != data.station_id) {
                            if (stationid != "") {
                                out.push(healthData)
                            }
                            healthData = {
                                id: data.s_id,
                                station_id: data.station_id,
                                station_name: data.station_name,
                                address: {
                                    tambon_code: data.tambon_code,
                                    tambon_namt: data.tambon_namt,
                                    amphur_code: data.amphur_code,
                                    amphur_namt: data.amphur_namt,
                                    province_code: data.province_code,
                                    province_namt: data.province_namt
                                },
                                latitude: data.latitude,
                                longitude: data.longitude,
                                owner: {
                                    id: data.d_id,
                                    organization: data.org_name,
                                    logo: data.logo,
                                    website: data.website
                                },
                                health: [{
                                    date: date,
                                    overall: data.overall,
                                    quality: data.quality,
                                    completeness: data.completeness,
                                    delivery: data.delivery,
                                    detail: {
                                        rain_gauge: data.rain,
                                        temperature: data.temperature,
                                        humidity: data.humidity,
                                        battery: data.battery,
                                        signal: data.signal
                                    }
                                }]
                            }
                            stationid = data.station_id
                        } else {
                            healthData.health.push({
                                date: date,
                                overall: data.overall,
                                quality: data.quality,
                                completeness: data.completeness,
                                delivery: data.delivery,
                                detail: {
                                    rain_gauge: data.rain,
                                    temperature: data.temperature,
                                    humidity: data.humidity,
                                    battery: data.battery,
                                    signal: data.signal
                                }
                            })
                        }

                    }
                    out.push(healthData)
                    res.json(out)
                }
            }).catch(err => {
                client.release()
                console.log(err.stack)
                res.send(err)
            })
        })
    } else res.json({ ERROR: "invalid request!" })
}