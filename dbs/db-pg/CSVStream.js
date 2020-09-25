'use strict'
var through = require('through');
exports.stringify = function (op, sep, cl) {
    op = ''
    sep = '\n'
    cl = ''

    var stream
        , first = true
        , anyData = false
    stream = through(function (data) {
            anyData = true
            try {
                var strTemp = "";
                for (let val of Object.values(data)) {
                    strTemp = strTemp + val.toString() + ",";
                }
                strTemp = strTemp.slice(0, -1);
            } catch (err) {
                return stream.emit('error', err)
            }
            if (first) {
                first = false;
                var headers = "";
                for (let val of Object.keys(data)) {
                    headers = headers + val.toString() + ",";
                }
                headers = headers.slice(0,-1);
                stream.queue(op + headers + sep + strTemp)
            } else stream.queue(sep + strTemp)
        },
        function (data) {
            if (!anyData)
                stream.queue(op)
            stream.queue(cl)
            stream.queue(null)
        })
    return stream
}
