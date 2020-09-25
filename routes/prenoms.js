const Router = require('express-promise-router')
const db_pg = require('../dbs/db-pg');
const db_couch = require('../dbs/db-couch');
const CSVStream = require('../dbs/db-pg/CSVStream');
const parse = require('csv-parse');
const router = new Router();
const fs = require('fs');
const path = require('path')
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


