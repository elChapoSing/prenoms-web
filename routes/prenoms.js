const Router = require('express-promise-router')
const db_pg = require('../dbs/db-pg');
const db_couch = require('../dbs/db-couch');
const JSONStream = require('JSONStream');
const stringify = require('csv-stringify');
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
            stream.pipe(stringify({delimiter:","}).write()).pipe(res);
        });

        // let cursor = db_pg.pool.query(new db_pg.Cursor('select * from public.prenoms_dep limit $1', [maxLineNumber]));
        // let ret = [];
        // cursor.read(1000, (err, rows) => {
        //     if (err) {
        //         throw err;
        //     }
        //     ret.push(rows);
        // });
        // res.send(ret);
    }).catch((err) => {
        res.status(500).send(err);
    })
});



