let nanoOpts = {
    url:'http://website_user:website_user_password@localhost:5984'
}
const nano = require('nano')(nanoOpts);
const Promise = require("bluebird");

let list_functions = require('../../dbs/list_functions');
let sort_functions = require('../../dbs/sort_functions');

let getListFunction = function (list_name) {
    let list_function;
    switch (list_name) {
        case "ag-grid" :
            list_function = list_functions.couch.aggrid;
            break;
        case "csv" :
            list_function = list_functions.couch.csv;
            break;
        case "ts_json" :
            list_function = JSON.stringify;
            break;
        case "ts_json_obj" :
            list_function = (x) => x;
            break;
        case "ts_dygraphs" :
            list_function = list_functions.couch.dygraphs_ts;
            break;
        case "ts_dygraphs_bars" :
            list_function = list_functions.couch.dygraphs_bars_ts;
            break;
        case "ts_csv" :
            list_function = list_functions.couch.csv_ts;
            break;
        case "ts_array_csv" :
            list_function = list_functions.couch.array_csv_ts;
            break;
        case "ts_backtest_csv" :
            list_function = list_functions.couch.backtest_csv_ts;
            break;
        case "ddl" :
            list_function = list_functions.couch.ddl;
            break;
        case "ddl_blotter_strategy" :
            list_function = list_functions.couch.ddl_blotter_strategy;
            break;
        case "menu" :
            list_function = list_functions.couch.menu;
            break;
        case "accordion" :
            list_function = list_functions.couch.accordion;
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
            sort_function = sort_functions.couch.sort_num;
            break;
        case "key" :
            sort_function = sort_functions.couch.sort_key;
            break;
        case "key_num" :
            sort_function = sort_functions.couch.sort_key_num;
            break;
        case "strategy_num" :
            sort_function = sort_functions.couch.sort_strategy_num;
            break;
        case "strategy_key" :
            sort_function = sort_functions.couch.sort_strategy_num_level2;
            break;
        default:
            sort_function = "";
    }
    return sort_function;
};

module.exports = {
    list: () => nano.db.list(),
    query: (req) => {
        return new Promise((resolve, reject) => {
            // if (req.hasOwnProperty("params")) {
            //     console.log(req.params);
            // }
            // console.log(JSON.stringify(req.query));
            if (!('type' in req.query)) {
                reject("no type");
            } else if (req.query.type === 'doc_query' || req.query.type === 'view_query') {
                let db_name = req.params.db;
                let db = nano.use(db_name);
                if (req.query.type === 'doc_query') { // simple doc query, only need the doc name
                    db.get(req.query.doc_name).then((body) => {
                        resolve(body);
                    }).catch((err) => {
                        reject(err);
                    });
                } else if (req.query.type === 'view_query') {
                    db.view(req.query.design_name, req.query.view_name, req.query.params_view).then((body) => {
                        let list_function = getListFunction(req.query.params_list.hasOwnProperty("list_name") ? req.query.params_list.list_name : "");
                        let sort_function = getSortFunction(req.query.params_list.hasOwnProperty('sortFunction') ? req.query.params_list.sortFunction : "");
                        if (sort_function !== "") {
                            req.query.params_list.sortFunction = sort_function;
                        }
                        resolve(list_function(body, req.query.params_list));
                    }).catch((err) => {
                        reject(err);
                    });
                }
            } else if (req.query.type === 'attachment_query') {
                let db_name = req.params.db;
                let db = nano.use(db_name);
                db.get(req.query.doc_name)
                    .then((body) => {
                        return (body);
                    })
                    .then((doc) => {
                        db.attachment.get(req.query.doc_name, req.query.att_name)
                            .then((response) => {
                                // resolve(Buffer.from(response, "base64"));
                                resolve({string:response,type:doc._attachments[req.query.att_name].content_type});
                            })
                            .catch((err) => {
                                reject(err);
                            });
                    })
                    .catch((err) => reject(err));
            } else if (req.query.type === 'generic_query') {
                nano.request({
                    db: req.query.db,
                    path: req.query.path,
                    qs: req.query.qs,
                })
                    .then((body) => resolve(body))
                    .catch((err) => reject(err));
            } else {
                reject("No known query type.");
            }

        });
    },
    find: (req) => {
        return new Promise((resolve, reject) => {
            let db_name = req.params.db;
            let db = nano.use(db_name);
            db.find(req.body)
                .then((body) => resolve(body))
                .catch((err) => reject(err));
        });
    },
    getAttachment: (db_name, doc_name, attachment_name) => {
        let db = nano.use(db_name);
        return db.attachment.get(doc_name, attachment_name);
    },
    nano: nano,
    getListFunction: getListFunction,
    getSortFunction: getSortFunction
};
