const fs = require("fs");

const {Pool} = require('pg');
const pool = new Pool({
    host: "localhost",
    port: 5432,
    user: "tristan",
    password: "Di^YfVrou!ih8dClkP1$G9!di!mWOvOuC%WX%q!gz9mwxaY#Q$F*Uq2Udy6s9gvLTj!MpxCtlg^O#e",
    database: "prenoms",
});

let list_functions = require('../../dbs/list_functions');
let sort_functions = require('../../dbs/sort_functions');

let getListFunction = function (list_name) {
    let list_function;
    switch (list_name) {
        case "pnl_by_type_ts_dygraphs" :
            list_function = list_functions.pg.pnl_by_type_ts_dygraphs;
            break;
        case "prices_by_security_name_ts_dygraphs" :
            list_function = list_functions.pg.prices_by_security_name_ts_dygraphs;
            break;
        case "slack_table_pnl" :
            list_function = list_functions.pg.slack_table_pnl;
            break;
        default:
            list_function = (x) => {
                return x
            };
    }
    return list_function;
};
let getSortFunction = function (sort_name) {
    let sort_function;
    switch (sort_name) {
        case "num" :
            sort_function = sort_functions.pg.sort_num;
            break;
    }
    return sort_function;
};

module.exports = {
    query: (req) => {
        console.log(JSON.stringify(req.query));
        return new Promise((resolve, reject) => {
            pool.query(req.query.pg_params)
                .then((body) => {
                    let list_function = getListFunction("");
                    let list_function_params = {};
                    if (req.query.params_list) {
                        list_function = getListFunction(req.query.params_list.list_name);
                        if (req.query.params_list.list_params) {
                            list_function_params = req.query.params_list.list_params;
                        }
                    }
                    resolve(list_function(body, list_function_params));
                })
                .catch((err) => {
                    reject(err);
                });
        });
    },
    pool: pool,
};