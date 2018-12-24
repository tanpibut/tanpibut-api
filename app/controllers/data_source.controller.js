const pg = require("../../conf/pg");
const pool = pg();

exports.getDataSource = function(req, res) {

    let out = []

    pool.connect().then(client => {
        client.query('SELECT * FROM tpb_master.data_source').then(result => {
            client.release()
            if (result) {
                for (i in result.rows) {
                    let data = result.rows[i]
                    out.push({
                        id: data.id,
                        org_name: data.org_name,
                        logo: data.logo,
                        website: data.website,
                    })
                }
                res.json(out)
            }
        }).catch(err => {
            client.release()
            console.log(err.stack)
            res.send(err)
        })
    })
}