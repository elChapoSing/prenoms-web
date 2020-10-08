const Router = require('express-promise-router')
const db_pg = require('../dbs/db-pg');
const db_couch = require('../dbs/db-couch');
const CSVStream = require('../dbs/db-pg/CSVStream');
const parse = require('csv-parse');
const router = new Router();
const fs = require('fs');
const path = require('path')
const Promise = require("bluebird");
const axios = require('axios');
module.exports = router;

router.get('/crossfilter/data', (req, res, next) => {
    let stream = fs.createReadStream(path.resolve("./public/data/data.csv"), "utf-8");
    stream.pipe(res);
});

router.get('/crossfilter/data_pg', (req, res, next) => {
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

router.get('/crossfilter/names', (req, res, next) => {
    let nano = db_couch.nano;
    let db = nano.use("prenoms");
    db.get("all_names").then((body) => {
        res.send(body.names);
    }).catch((err) => {
        res.status(500).send(err);
    })
});

router.get('/filters/:type/:decade/:number', (req, res, next) => {
    let nano = db_couch.nano;
    let db = nano.use("prenoms");
    db.view("decades", "decades_" + req.params.type, {
        "start_key": [req.params.decade, parseInt(req.params.number)],
        "end_key": [req.params.decade, parseInt(req.params.number) + 1],
        "reduce": false,
    }).then((body) => {
        res.send(body.rows.map(x => x.value));
    }).catch((err) => {
        res.status(500).send(err);
    })
});


router.post('/filters', (req, res, next) => {
    let isCount = req.body.isCount;
    if (req.body.hasOwnProperty("filters")) {
        let dataPromise = req.body.filters;
        Promise
            .map(dataPromise, (x) => {
                return axios.get("/" + ['prenoms', 'filters', x.type, x.decade, x.number].join("/"), {
                    proxy: {
                        host: '127.0.0.1',
                        port: 4000,
                    },
                }).then(body => body.data).catch(err => err);
            }, {concurrency: 20})
            .then((values) => {
                let arr = values.flat(1).sort().filter((v, i, a) => a.indexOf(v) === i);
                if (isCount) {
                    res.send({count: arr.length});
                } else {
                    res.send(arr);
                }
            })
            .catch((err) => {
                res.status(500).send(err);
            });
    } else {
        let nano = db_couch.nano;
        let db = nano.use("prenoms");
        db.view("summaries", "all_names", {
            "group_level": isCount ? 0:1,
        }).then((body) => {
            if (isCount) {
                res.send({count:body.rows[0].value});
            } else {
                res.send(body.rows.map(x => x.key));
            }
        }).catch((err) => {
            res.status(500).send(err);
        })
    }

});
