const Router = require('express-promise-router')
const db_pg = require('../dbs/db-pg');
const db_couch = require('../dbs/db-couch');
let nano = db_couch.nano;
let db = nano.use("prenoms");
const CSVStream = require('../dbs/db-pg/CSVStream');
const router = new Router();
const fs = require('fs');
const path = require('path')
const Promise = require("bluebird");
const axios = require('axios');
const _ = require('underscore');
module.exports = router;

router.get("/sons", (req, res) => {
    db.view("filters", "sound", {group_level: 1}).then((body) => {
        res.send(body.rows.sort((x,y) => y.value - x.value).map(x => x.key));
    }).catch((err) => {
        res.status(500).send(err);
    })
})

router.get('/filters/double/:type/:decade/:number', (req, res) => {
    let nano = db_couch.nano;
    let db = nano.use("prenoms");
    let queryParams = {
        "key": [req.params.decade, parseInt(req.params.number)],
        "reduce": false,
    }
    db.view("decades", "decades_" + req.params.type, queryParams).then((body) => {
        res.send(body.rows.map(x => x.value));
    }).catch((err) => {
        res.status(500).send(err);
    })
});

router.get('/filters/single/:type/:value', (req, res) => {

    let type = req.params.type;
    let value = req.params.value;
    let queryParams = {};
    ["percentile", "", "", "", "", "sound"]
    if (type === "gender") {
        let mapping = {male: 1, female: 2, both: 3};
        value = mapping[req.params.value];
        queryParams = {
            key: value,
            reduce: false,
        };
    } else if (type === "trend") {
        let growth_mapping = {fastdegrowth: [-50], degrowth: [-50, 0], growth: [0, 100], fastgrowth: [100]};
        value = growth_mapping[value];
        if (value.length > 1) {
            queryParams = {
                start_key: value[0],
                end_key: value[1] + 0.1,
                reduce: false,
            }
        } else {
            value = value[0];
            if (value > 0) {
                queryParams = {
                    start_key: value,
                    reduce: false,
                }
            } else {
                queryParams = {
                    start_key: value,
                    descending: true,
                    reduce: false,
                }
            }
        }
    } else if (type === "syllabe") {
        queryParams = {
            key: parseInt(value),
            reduce: false,
        };
    } else if (type === "decade") {
        queryParams = {
            start_key: "" + parseInt(value),
            end_key: "" + (parseInt(value) + 10),
            reduce: false,
        }
    } else if (type === "sound") {
        queryParams = {
            key: value.replace(/\|/g,""),
            reduce: false,
        };
    } else if (type === "percentile") {
        queryParams = {
            start_key: parseInt(value),
            end_key: parseInt(value) + 20,
            reduce: false,
        }
    } else {
        throw Error("Unknown type for filters : " + type);
    }
    db.view("filters", type, queryParams).then((body) => {
        res.send(body.rows.map(x => x.value));
    }).catch((err) => {
        res.status(500).send(err);
    })
});

router.post('/filters', (req, res) => {
    let isCount = req.body.isCount;
    if (req.body.hasOwnProperty("filters")) {
        let dataPromise = req.body.filters;
        console.time("promises")
        Promise
            .map(dataPromise, (x) => {
                if (["percentiles", "trends"].includes(x.type)) {
                    return axios.get("/" + ['prenoms', 'filters', 'double', x.type, x.decade, x.number].join("/"), {
                        proxy: {
                            host: '127.0.0.1',
                            port: 4000,
                        },
                    }).then(body => {
                        return {req: x, data: body.data};
                    }).catch(err => err);
                } else if (["percentile", "trend", "syllabe", "gender", "sound", "decade"].includes(x.type)) {
                    let type = x.type;
                    let value = x.value;
                    return axios.get("/" + ['prenoms', 'filters', 'single', type, encodeURI(value)].join("/"), {
                        proxy: {
                            host: '127.0.0.1',
                            port: 4000,
                        },
                    }).then(body => {
                        return {req: x, data: body.data};
                    }).catch(err => err);
                } else {
                    throw Error("Unknown type for filter : " + x.type);
                }
            }, {concurrency: 20})
            .then((values) => {
                console.timeEnd("promises")
                console.log(values);
                // we send the intersect of all (union by type)
                let errors = values.filter((x) => x.stack);
                if (errors.length > 0) {
                    res.status(500).send(errors);
                } else {
                    values = values.filter((x) => !x.stack);
                    let decades = values.filter((x) => x.req.type === "decade").map((x) => x.req.value);
                    console.time("filter decade values")
                    values.filter((x) => ["percentile", "trend"].includes(x.req.type)).forEach((x) => {
                        if (decades.length > 0) {
                            x.data = x.data.filter((x) => decades.includes(x[0])).map((x) => x[1]);
                        } else {
                            x.data = x.data.map((x) => x[1]);
                        }
                    });
                    console.timeEnd("filter decade values")
                    console.time("inter+union")
                    let resValues = _.intersection(
                        ..._.unique(values.map((x)=> x.req.type))
                            .map((queryType) => {
                                return _.union(...values.filter((x) => x.req.type === queryType).map((x) => x.data));
                            })
                            .filter((x) => x.length > 0)
                    );
                    console.timeEnd("inter+union")
                    if (isCount) {
                        res.send({count: resValues.length});
                    } else {
                        res.send({count:resValues.length,data:resValues});
                    }
                }
            })
            .catch((err) => {
                res.status(500).send(err);
            });
    } else {
        let nano = db_couch.nano;
        let db = nano.use("prenoms");
        db.view("filters", "all_names", {
            "group_level": isCount ? 0 : 1,
        }).then((body) => {
            if (isCount) {
                res.send({count: body.rows[0].value});
            } else {
                res.send({count:body.rows.length, data:body.rows.map(x => x.key)});
            }
        }).catch((err) => {
            res.status(500).send(err);
        })
    }

});

router.post('/crossfilter/data_pg', (req, res) => {
    db_pg.pool.connect((err, client, done) => {
        if (err) {
            throw err;
        }
        res.set('Content-Type', 'text/csv');
        const query = new db_pg.QueryStream('select * from public.prenoms_dep where prenom = ANY($1) and annee>1899;',[req.body]);
        const stream = client.query(query);
        stream.on('end', done);
        stream.pipe(CSVStream.stringify()).pipe(res);
    });
});




