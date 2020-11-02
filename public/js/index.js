let xNames = null;
let xData = null;
let dimNames = {};
let groupNames = {};
let dimData = {};
let groupData = {};
// ################################################
// ############# INITIALIZATION ###################
// ################################################
let formatDashboard = () => {

};

let showDashboard = () => {
    let seriesChart = (params) => {
        let group = groupData["annee"]["sum"]
        let theChart = new dc.SeriesChart("#nombre", "data")
            .height(null)
            .width(null)
            .renderTitle(false)
            .dimension(dimData["annee"])
            .group(group)
            .x(d3.scaleBand())
            .elasticX(true)
            .elasticY(true)
            .brushOn(false)
            .legend(new dc.HtmlLegend().container("#nombre-legend").horizontal(true).highlightSelected(true))
            .seriesAccessor((d) => d.key[0])
            .keyAccessor((d) => d.key[1])
            .margins({left: 70, top: 10, bottom: 30, right: 50})
            .on("preRedraw", function (chart) {
                chart.rescale();
            })
            .on("preRender", function (chart) {
                chart.rescale();
            });
        return theChart;
    };
    seriesChart();
    dc.renderAll("data");
};

let initializeCrossfilter = (mode, data) => {
    if (mode === "names") {
        xNames = null;
        xNames = crossfilter(data);
    } else if (mode === "data") {
        xData = null;
        console.time("input xfilter");
        xData = crossfilter(data);
        console.timeEnd("input xfilter");

        let reducerGenerator = () => {
            return reductio()
                .sum((d) => +d["nombre"]);
        }

        // let fields_dim = ["prenom", "annee2", "departement", "sexe"];
        let fields_dim = ["departement"];
        for (let field of fields_dim) {
            console.time("Dimension : " + field);
            dimData[field] = xData.dimension(field);
            console.timeEnd("Dimension : " + field);
        }
        // console.time("Dimension : annee");
        // dimData["annee"] = xData.dimension((d) => [d.prenom, d.annee]);
        // console.timeEnd("Dimension : annee");

        // let fields_group = ["prenom", "annee", "annee2", "departement", "sexe"];
        let fields_group = ["departement"];
        for (let field of fields_group) {
            console.time("Group : " + field);
            groupData[field] = {};
            groupData[field]["sum"] = dimData[field].group();
            reducerGenerator()(groupData[field]["sum"]);
            console.timeEnd("Group : " + field);
        }
    }
}

let loadData = (mode) => {
    let thePromise
    console.time("the promise " + mode);
    if (mode === "names") {
        let url = "/prenoms/crossfilter/names";
        thePromise = $.ajax(url, {});
    } else if (mode === "data") {
        thePromise = new Promise((resolve, reject) => {
            console.time("load data file")
            let res = []
            Papa.parse("/prenoms/crossfilter/data", {
                download: true,
                header: true,
                fastMode: true,
                dynamicTyping: true,
                step: (row) => {
                    // row.data["annee"] = parseInt(row.data["annee"]);
                    // row.data["nombre"] = parseInt(row.data["nombre"]);
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
            console.timeEnd("the promise " + mode);
            return res;
        })
        .catch((err) => {
            return err;
        });
};

let showMap = () => {
    let url = "/public/geojson/departements.json";
    $.ajax(url, {}).then((departementsJson) => {
        let mapChart = new dc.GeoChoroplethChart("#carte");
        mapChart.dimension(dimData["departement"])
            .group(groupData["departement"]["sum"])
            .colors(d3.scaleQuantize().range(["#E2F2FF", "#C4E4FF", "#9ED2FF", "#81C5FF", "#6BBAFF", "#51AEFF", "#36A2FF", "#1E96FF", "#0089FF", "#0061B5"]))
            .colorDomain([0, 10000])
            .colorCalculator(function (d) {
                return d ? usChart.colors()(d) : '#ccc';
            })
            .overlayGeoJson(departementsJson.features, "departement", function (d) {
                return d.properties.code;
            })
            .projection(d3.geoMercator().center([2, 47]))
            .valueAccessor(function (kv) {
                console.log(kv);
                return kv;
            })
            .title(function (d) {
                return "Departement: " + d.key + "\nTotal Prenoms: " + d.value;
            });
    });

}

let go = () => {
    console.log("go");
    let spinner = new Spinner({}).spin(document.getElementById("spinner"));
    // Promise.all([loadData("names"), loadData("data")]).then((values) => {
    //     console.log("data loaded");
    //     console.time("initialize names");
    //     initializeCrossfilter("names", values[0]);
    //     console.timeEnd("initialize names");
    //     console.time("initialize data");
    //     initializeCrossfilter("data", values[1]);
    //     console.timeEnd("initialize data");
    //     console.time("show Dashboard");
    //     showDashboard();
    //     console.timeEnd("show Dashboard");
    //     console.time("format Dashboard");
    //     formatDashboard();
    //     console.timeEnd("format Dashboard");
    //     spinner.stop();
    // }).catch((err) => {
    //     console.log(err);
    // })
    spinner.stop();
};

let getNamePopulation = (isCount) => {
    $("#count-number").html("");
    let spinner = new Spinner({}).spin(document.getElementById("count-number"));
    let percentileFilters = []
    let trendFilters = []
    let syllableFilters = []
    let genderFilters = []
    let decadeFilters = []
    // $("#percentile > div.grid-selected").each(function () {
    //     let theSplit = this.id.split("!");
    //     if (!["percentile", "decade"].includes(theSplit[1])) {
    //         percentileFilters.push({type: "percentiles", decade: theSplit[2], number: theSplit[1]});
    //     }
    // });
    $("#percentile > div.grid-selected").each(function () {
        percentileFilters.push({type: "percentiles", value: this.id.split("-")[1]});
    });
    $("#trend > div.grid-selected").each(function () {
        trendFilters.push({type: "trends", value: this.id.split("-")[1]});
    });
    $("#syllabe > div.syllabe-container-selected").each(function () {
        syllableFilters.push({type: "syllabe", value: this.id.split("-")[1]});
    });
    $("#gender > div.gender-container-selected").each(function () {
        genderFilters.push({type: "gender", value: this.id.split("-")[1]});
    });
    $("#decade > div.decade-container-selected").each(function () {
        decadeFilters.push({type: "decade", value: this.id.split("-")[1]});
    });
    //get the count
    let url = "/prenoms/filters"
    let filtersData = {
        isCount: isCount,
    };
    let filters = [...percentileFilters, ...trendFilters, ...syllableFilters, ...genderFilters, ...decadeFilters];
    if (filters.length > 0) {
        filtersData.filters = filters;
    }
    $.ajax(url, {
        data: JSON.stringify(filtersData),
        headers: {"Content-Type": "application/json"},
        method: "POST",
    }).then((body) => {
        spinner.stop();
        $("#count-number").html(body.count);
    }).catch((err) => {
        console.log(err);
        spinner.stop();
        $("#count-number").html("Blah!");
    })
}

let transfoGenerator = (isChecked, className, selectedClassName) => {
    if (isChecked) {
        return (x) => x.removeClass(className).addClass(selectedClassName);
    } else {
        return (x) => x.removeClass(selectedClassName).addClass(className);
    }
}

let toggleSelect = (checkbox, perimName, isRow, isCol) => {

    let transfo = transfoGenerator(checkbox.checked, "grid-unselected", "grid-selected");
    let source_div = checkbox.id.split("!").slice(1).join("!");
    transfo($("#" + $.escapeSelector(source_div)));

    if (isRow) {
        // percentile!decade!1900 !> percentile!x!1900
        let decade = checkbox.id.split("!")[3];
        let re = new RegExp(perimName + "!-?[0-9]+!" + decade, "g");
        $("#" + perimName + " > div").map(function () {
            if (this.id.match(re)) {
                transfo($(this));
                $("#" + $.escapeSelector("toggle!" + this.id)).prop("checked", checkbox.checked);
            }
        });
    } else if (isCol) {
        //percentile!percentile!0 !> percentile!0!x
        let percentile = checkbox.id.split("!")[3];
        let re = new RegExp(perimName + "!" + percentile + "![0-9]{4}", "g");
        $("#" + perimName + " > div").map(function () {
            if (this.id.match(re)) {
                transfo($(this));
                $("#" + $.escapeSelector("toggle!" + this.id)).prop("checked", checkbox.checked);
            }
        })
    } else {
        let percentile = checkbox.id.split("!")[2];
        let decade = checkbox.id.split("!")[3];
        if (checkbox.checked) {
            // verify if it completes a rwo/column to activate header
            let reDecade = new RegExp(perimName + "!-?[0-9]+!" + decade, "g");
            let rePercentile = new RegExp(perimName + "!" + percentile + "![0-9]{4}", "g");
            let testRow = [];
            $("#" + perimName + " > div").filter(function () {
                return this.id.match(reDecade);
            }).each(function () {
                testRow.push($("#" + $.escapeSelector("toggle!" + this.id)).prop("checked"));
            })
            if (testRow.every(x => x)) {
                $("#" + $.escapeSelector("toggle!" + perimName + "!decade!" + decade)).prop("checked", true);
                transfo($("#" + $.escapeSelector(perimName + "!decade!" + decade)));
            }
            let testCol = [];
            $("#" + perimName + " > div").filter(function () {
                return this.id.match(rePercentile);
            }).each(function () {
                testCol.push($("#" + $.escapeSelector("toggle!" + this.id)).prop("checked"));
            })
            if (testCol.every(x => x)) {
                $("#" + $.escapeSelector("toggle!" + perimName + "!percentile!" + percentile)).prop("checked", false);
                transfo($("#" + $.escapeSelector(perimName + "!percentile!" + percentile)));
            }
        } else {
            // header
            // percentile!x!1900 !> percentile!percentile!x
            $("#" + $.escapeSelector("toggle!" + perimName + "!percentile!" + percentile)).prop("checked", false);
            transfo($("#" + $.escapeSelector(perimName + "!percentile!" + percentile)));
            //row title
            // percentile!0!x !> percentile!decade!x
            $("#" + $.escapeSelector("toggle!" + perimName + "!decade!" + decade)).prop("checked", false);
            transfo($("#" + $.escapeSelector(perimName + "!decade!" + decade)));
        }
    }
    getNamePopulation(true);
};

let toggleGeneric = (checkbox) => {
    let theName = checkbox.id.split("-")[1];
    let theThing = checkbox.id.split("-")[2];
    transfoGenerator(checkbox.checked, theName + "-container", theName + "-container-selected")($("#" + theName + "-" + $.escapeSelector(theThing)));
    getNamePopulation(true);
}

let generateGrid = (perimName) => {
    let decades = Array.from(Array(12), (_, x) => 1900 + 10 * x);
    let variables = [];
    let step = 0;
    if (perimName === "percentile") {
        step = 25;
        variables = Array.from(Array(4), (_, x) => step * x);
    } else if (perimName === "trend") {
        step = 50;
        variables = Array.from(Array(5), (_, x) => -100 + step * x);
    }
    $("#" + perimName).append('<div id="' + perimName + '!decade!empty"></div>');
    for (let decade of decades) {
        $("#" + perimName).append(
            '<div id="' + perimName + '!decade!' + decade + '" class="grid-unselected">\n' +
            '<label for="toggle!' + perimName + '!decade!' + decade + '">' + decade + '</label>\n' +
            '</div>');
        $("#checkboxes").append(
            '<input type="checkbox" id="toggle!' + perimName + '!decade!' + decade + '" onclick="toggleSelect(this,\'' + perimName + '\',true,false)">'
        );
    }
    for (let variable of variables) {
        $("#" + perimName).append(
            '<div id="' + perimName + '!percentile!' + variable + '"  class="grid-unselected">\n' +
            '<label for="toggle!' + perimName + '!percentile!' + variable + '">' + variable + '!' + (variable + step) + '</label>\n' +
            '</div>');
        $("#checkboxes").append(
            '<input type="checkbox" id="toggle!' + perimName + '!percentile!' + variable + '" onclick="toggleSelect(this,\'' + perimName + '\',false,true)">'
        );
        for (let decade of decades) {
            $("#" + perimName).append(
                '<div id="' + perimName + '!' + variable + '!' + decade + '" class="grid-unselected">\n' +
                '<label for="toggle!' + perimName + '!' + variable + '!' + decade + '">' + variable + '!' + decade + '</label>\n' +
                '</div>'
            );
            $("#checkboxes").append(
                '<input type="checkbox" id="toggle!' + perimName + '!' + variable + '!' + decade + '" onclick="toggleSelect(this,\'' + perimName + '\',false,false)">'
            );
        }
    }

}

$(function () {
    $("#btn-go").button()
        .click(go);

    // $("input[id^='toggle-syllabe-']").on("click", _.debounce(function () {
    //     toggleSyllabes(this);
    // }, 0));

    // generate the grids for trends and percentiles
    // generateGrid("percentile");
    // generateGrid("trend");
    showMap();
    getNamePopulation(true);
});