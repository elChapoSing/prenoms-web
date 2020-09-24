const prenoms = require('./prenoms');

module.exports = (app) => {
    app.use('/prenoms', prenoms);
};
