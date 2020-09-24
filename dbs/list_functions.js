const stringify = require('csv-stringify');

module.exports = {
    couch: {
        csv: function (body, params) {
            // console.log(body);
            let csv = "";

            for (let i = 0; i < params.headers.length; i++) {
                csv += params.headers[i] + ",";
            }
            csv = csv.slice(0, -1) + "\n";

            // the assumption is that headers cover key+value
            body.rows.forEach((doc) => {

                if (doc.key.constructor === Array) {
                    for (let i = 0; i < doc.key.length; i++) {
                        csv += doc.key[i] + ","
                    }
                } else {
                    csv += doc.key + ",";
                }
                if (doc.value.constructor === Array) {
                    for (let i = 0; i < doc.value.length; i++) {
                        csv += doc.value[i] + ","
                    }
                } else {
                    csv += doc.value + ",";
                }
                csv = csv.slice(0, -1) + "\n";
            });
            return (csv);
        },
        aggrid: function (body, params) {
            // console.log(body);
            let res = [];
            let headers = params.headers;
            // the assumption is that headers cover key+value
            body.rows.forEach((doc) => {
                let i_headers = 0;
                let obj = {};
                if (doc.key.constructor === Array) {
                    for (let i = 0; i < doc.key.length; i++) {
                        obj[headers[i_headers]] = doc.key[i];
                        i_headers++;
                    }
                } else {
                    obj[headers[i_headers]] = doc.key;
                    i_headers++;
                }
                if (doc.value.constructor === Array) {
                    for (let i = 0; i < doc.value.length; i++) {
                        obj[headers[i_headers]] = doc.value[i];
                        i_headers++;
                    }
                } else {
                    obj[headers[i_headers]] = doc.value;
                }
                res.push(obj);
            });
            return (res);
        },
    },
    pg: {
        csv: function (body, params) {
            if (!params.hasOwnProperty("headers")) {
                params.headers = true;
            }
            let result = [];
            let stringifier = stringify(params);
            stringifier.on('readable', function () {
                let row;
                while (row = stringifier.read()) {
                    result.push(row)
                }
            });
            stringifier.on('error', function (err) {
                console.error(err.message)
            });
            stringifier.on('finish', function () {
                return result.join('');
            });

            body.rows.forEach((row) => {
                stringifier.write(row);
            });
            stringifier.end();
        },
    }
};
