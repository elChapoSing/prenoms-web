let xNames = null;
let xData = null;
// ################################################
// ############# INITIALIZATION ###################
// ################################################
let initializeCrossfilter = () => {

}
let loadData = (mode) => {
    let thePromise
    console.time("the promise "+mode);
    if (mode === "names") {
        let url = "/prenoms/crossfilter/names";
        thePromise = $.ajax(url, {});
    } else if (mode === "data") {
        thePromise = new Promise((resolve, reject) => {
            console.time("load data file")
            let res = []
            Papa.parse("/public/data/data.csv", {
                download: true,
                header: true,
                fastMode: true,
                step: (row) => {
                    res.push(row.data);
                },
                complete: () => {
                    console.timeEnd("load data file")
                    resolve(res);
                },
            });
        });
    }
    return thePromise
        .then((res) => {
            console.timeEnd("the promise "+mode);
            return res;
        })
        .catch((err) => {
            return err;
        });
};

let go = () => {
    console.log("go");
    let spinner = new Spinner({}).spin(document.getElementById("spinner"));
    Promise.all([loadData("names"), loadData("data")]).then((values) => {
        console.log(values);
        spinner.stop();
    }).catch((err) => {
        console.log(err);
    })
};

$(function () {
    $("#btn-go").button()
        .click(go);
});