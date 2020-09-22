const express = require('express');
const path = require('path');
global.argv = require('yargs').argv;
const dotenv = require('dotenv');
const ENV_FILE = path.join(__dirname, '.env');
dotenv.config({path: ENV_FILE});

const mountRoutes = require("./routes");
const bodyParser = require('body-parser');
// const favicon = require('serve-favicon');

const app = express();
app.use(express.static(path.resolve('./')));
app.use(express.static(path.resolve('./node_modules')));
app.use(bodyParser.json({
    limit: "5mb"
}));
// noinspection JSCheckFunctionSignatures
app.use(favicon(path.join(__dirname, "public",'images','favicon.ico')));
app.use(bodyParser.urlencoded({
    extended: true,
    limit: "5mb",
    parameterLimit: 1000000
}));
mountRoutes(app);

app.get('/', (req, res) => {
    res.sendFile('index.html', {root: path.join(__dirname, "./public")});
});

app.listen(3000, () => console.log('Server running on port 3000'));



