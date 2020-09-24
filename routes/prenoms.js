const Router = require('express-promise-router')
const db_pg = require('../dbs/db-pg');
const db_couch = require('../dbs/db-couch');
const router = new Router();
module.exports = router;

router.get('/crossfilter', (req, res, next) => {

    let nano = db_couch.nano;
    let db = nano.use("prenoms");
    db.get("all_names").then((body) => {
        console.log(body);
    })

});



