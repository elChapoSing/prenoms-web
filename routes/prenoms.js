const Router = require('express-promise-router')
const db_pg = require('../dbs/db-pg');
const db_couch = require('../dbs/db-couch');
const JSONStream = require('../dbs/db-pg/JSONStream');
const router = new Router();
module.exports = router;

router.get('/crossfilter', (req, res, next) => {
    let maxLineNumber = req.query.maxLineNumber;
    let nano = db_couch.nano;
    let db = nano.use("prenoms");
    db.get("all_names").then((body) => {
        let all_names = body.names;
        console.log(body["_id"]);
        db_pg.pool.connect((err, client, done) => {
            if (err) {
                throw err;
            }
            const query = new db_pg.QueryStream('select * from public.prenoms_dep limit $1', [maxLineNumber]);
            const stream = client.query(query);
            stream.on('end', done);
            stream.pipe(JSONStream.stringify( '[\n', '\n,\n', '\n]\n', 0, all_names)).pipe(res);
        });
    }).catch((err) => {
        res.status(500).send(err);
    })
});



