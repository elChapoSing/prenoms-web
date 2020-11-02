const Router = require('express-promise-router')
const db_pg = require('../dbs/db-pg');
const db_couch = require('../dbs/db-couch');
const CSVStream = require('../dbs/db-pg/CSVStream');
const router = new Router();
const fs = require('fs');
const path = require('path')
const Promise = require("bluebird");
const axios = require('axios');
const _ = require('underscore');
module.exports = router;

router.get('/crossfilter/data', (req, res) => {
    let stream = fs.createReadStream(path.resolve("./public/data/data.csv"), "utf-8");
    stream.pipe(res);
});

router.get('/crossfilter/data_pg', (req, res) => {
    db_pg.pool.connect((err, client, done) => {
        if (err) {
            throw err;
        }
        res.set('Content-Type', 'text/csv');
        const query = new db_pg.QueryStream('select * from public.prenoms_dep order by annee, prenom, departement, sexe;');
        const stream = client.query(query);
        stream.on('end', done);
        stream.pipe(CSVStream.stringify()).pipe(res);
    });
});

router.get('/crossfilter/names', (req, res) => {
    let nano = db_couch.nano;
    let db = nano.use("prenoms");
    db.get("all_names").then((body) => {
        res.send(body.names);
    }).catch((err) => {
        res.status(500).send(err);
    })
});

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
    let nano = db_couch.nano;
    let db = nano.use("prenoms");
    if (req.params.type === "gender") {
        let mapping = {male:1,female:2,both:3};
        req.params.value = mapping[req.params.value];
    }
    let queryParams = {
        "key": parseInt(req.params.value),
        "reduce": false,
    };
    db.view("filters",  req.params.type, queryParams).then((body) => {
        res.send(body.rows.map(x => x.value));
    }).catch((err) => {
        res.status(500).send(err);
    })
});


router.post('/filters', (req, res) => {
    let isCount = req.body.isCount;
    if (req.body.hasOwnProperty("filters")) {
        let dataPromise = req.body.filters;
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
                } else if (["syllabe", "gender","decade"].includes(x.type)) {
                    return axios.get("/" + ['prenoms', 'filters', 'single', x.type, x.value].join("/"), {
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
                // we send the intersect of all values
                let resValues =  values.flat(1).sort().filter((v, i, a) => a.indexOf(v) === i);
                // let resValues =[];
                // //we add all the names from trends/percentiles
                // let addValues = values.filter((result) => ["percentiles","trends"].includes(result.req.type)).map((x) => x.data);
                // addValues = addValues.flat(1).sort().filter((v, i, a) => a.indexOf(v) === i);
                //
                // //then intersect with the actual filters
                // let genderValues = values.filter((result) => ["gender"].includes(result.req.type)).map((x) => x.data);
                // let syllabeValues = values.filter((result) => ["syllabe"].includes(result.req.type)).map((x) => x.data);
                // let decadeValues = values.filter((result) => ["decade"].includes(result.req.type)).map((x) => x.data);
                // if (addValues.length>0) { // need to interesect with addition of gender and syllabe
                //     let intersectValues = values.filter((result) => ["gender","syllabe","decade"].includes(result.req.type)).map((x) => x.data);
                //     if (intersectValues.length>0) {
                //         intersectValues = intersectValues.flat(1).sort().filter((v, i, a) => a.indexOf(v) === i);
                //         resValues = addValues.filter((name) => intersectValues.includes(name));
                //     } else {
                //         resValues = addValues;
                //     }
                // } else { //no addValues so need to add independently gender and syllabe then intersect both
                //     genderValues = genderValues.flat(1).sort().filter((v, i, a) => a.indexOf(v) === i);
                //     syllabeValues = syllabeValues.flat(1).sort().filter((v, i, a) => a.indexOf(v) === i);
                //     decadeValues = decadeValues.flat(1).sort().filter((v, i, a) => a.indexOf(v) === i);
                //     if (genderValues.length*syllabeValues.length ===0) { //one of the 2 is empty -> addition of the other
                //         resValues = [genderValues,syllabeValues].flat(1).sort().filter((v, i, a) => a.indexOf(v) === i);
                //     } else {
                //         resValues = genderValues.filter((name) => syllabeValues.includes(name));
                //     }
                // }
                if (isCount) {
                    res.send({count: resValues.length});
                } else {
                    res.send(resValues);
                }
            })
            .catch((err) => {
                res.status(500).send(err);
            });
    } else {
        let nano = db_couch.nano;
        let db = nano.use("prenoms");
        db.view("summaries", "all_names", {
            "group_level": isCount ? 0 : 1,
        }).then((body) => {
            if (isCount) {
                res.send({count: body.rows[0].value});
            } else {
                res.send(body.rows.map(x => x.key));
            }
        }).catch((err) => {
            res.status(500).send(err);
        })
    }

});
