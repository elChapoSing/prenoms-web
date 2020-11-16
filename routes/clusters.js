const Router = require('express-promise-router');
const PythonShell = require('python-shell');

let python_process;
if (process.platform === "win32") {
    python_process = "python";
} else if (process.platform === "linux") {
    python_process = "python3.6";
}
const router = new Router();
module.exports = router;

let runClusters = (req, res, next) => {
    runCluster(req)
        .then((result) => {
            res.send(result);
        })
        .catch((err) => {
            res.status(500).send(err);
        });
};

let runCluster = (req) => {
    return new Promise((resolve, reject) => {
        let result = "";
        let script_path = "./python/prenoms/";
        let args = ["--names", req.body.join("|")];
        let python_options = {
            mode: "text",
            pythonPath: python_process,
            scriptPath: script_path,
            args: args,
        };
        let pyshell = new PythonShell.PythonShell("clustering.py", python_options);
        pyshell.on("message", function (message) {
            result += message;
        });
        pyshell.end(function (err, code, signal) {
            if (err) {
                console.log("Error %j", err);
                reject(err.message);
                return;
            }
            resolve(result)
        });
    });
};

router.post('/', (req, res, next) => {

    runClusters(req, res, next);
});

