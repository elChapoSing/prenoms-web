let xNames = null;
let xData = null;
// ################################################
// ############# INITIALIZATION ###################
// ################################################
let initializeCrossfilter = () => {

}
let loadData = (mode) => {
    let url = "/prenoms/crossfilter/"+mode;
    return $.ajax(url, {})
};

let go = () => {
    console.log("go");
    let spinner = new Spinner({
        top: "50%",
        left: "50%",
        position: "floating"
    }).spin(document.getElementById("spinner"));
    Promise.all([loadData("names"),loadData("data")]).then((values) => {
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