const prenoms = require('./prenoms');
const clusters = require('./clusters');

module.exports = (app) => {
    app.use('/prenoms', prenoms);
    app.use('/clusters', clusters);
};
