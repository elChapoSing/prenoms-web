const Router = require('express-promise-router')
const db_pg = require('../dbs/db-pg');
const db_couch = require('../dbs/db-couch');
const JSONStream = require('../dbs/db-pg/JSONStream');
const router = new Router();
module.exports = router;

router.get('/crossfilter/data', (req, res, next) => {
    db_pg.pool.connect((err, client, done) => {
        if (err) {
            throw err;
        }
        const query = new db_pg.QueryStream('select * from public.prenoms_dep');
        const stream = client.query(query);
        stream.on('end', done);
        stream.pipe(JSONStream.stringify()).pipe(res);
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


