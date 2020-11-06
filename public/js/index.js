let xNames = null;
let xData = null;
let dimNames = {};
let groupNames = {};
let dimData = {};
let groupData = {};
let seriesChart;
let mapChart;
// ################################################
// ############# INITIALIZATION ###################
// ################################################
let formatDashboard = () => {

};

let showDashboard = () => {

    dc.config.defaultColors(d3.schemeSet2);

    seriesChart = new dc.SeriesChart("#nombre", "data");
    seriesChart
        .height(null)
        .width(null)
        .renderTitle(false)
        .dimension(dimData["annee"])
        .group(groupData["annee"]["sum"])
        .x(d3.scaleLinear())
        .elasticX(true)
        .elasticY(true)
        .brushOn(false)
        // .legend(new dc.HtmlLegend().container("#nombre-legend").horizontal(true).highlightSelected(true))
        .seriesAccessor((d) => {
            return d.key[0];
        })
        .keyAccessor((d) => {
            return d.key[1];
        })
        .valueAccessor((d) => {
            return d.value.sum;
        })
        .renderTitle(true)
        .title ((d) => {
            return d.key[0] + " " + d.key[1] + " : " + d.value.sum;
        })
        .margins({left: 70, top: 10, bottom: 30, right: 50})
        .on("preRedraw", function (chart) {
            chart.rescale();
        })
        .on("preRender", function (chart) {
            chart.rescale();
        });

    showMap().then((mapChart) => {
        dc.renderAll("data");
    }).catch((err) => {
        console.log("Something wrong with the mapchart : ");
        console.log(err);
        dc.renderAll("data");
    });
};

let initializeCrossfilter = (data) => {
    xData = null;
    console.time("input xfilter");
    xData = crossfilter(data);
    console.timeEnd("input xfilter");

    let reducerGenerator = () => {
        return reductio()
            .sum((d) => +d["nombre"]);
    }
    console.time("Dimensions");
    let fields_dim = ["prenom", "annee2", "departement", "sexe"];
    // let fields_dim = ["departement"];
    for (let field of fields_dim) {
        console.time("Dimension : " + field);
        dimData[field] = xData.dimension(field);
        console.timeEnd("Dimension : " + field);
    }
    console.time("Dimension : annee");
    dimData["annee"] = xData.dimension((d) => [d.prenom, d.annee]);
    console.timeEnd("Dimension : annee");
    console.timeEnd("Dimensions");
    console.time("Groups");
    let fields_group = ["prenom", "annee", "annee2", "departement", "sexe"];
    // let fields_group = ["departement"];
    for (let field of fields_group) {
        console.time("Group : " + field);
        groupData[field] = {};
        groupData[field]["sum"] = dimData[field].group();
        reducerGenerator()(groupData[field]["sum"]);
        console.timeEnd("Group : " + field);
    }
    console.timeEnd("Groups");

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
    return $.ajax(url, {}).then((departementsJson) => {
        mapChart = new dc.GeoChoroplethChart("#carte", "data");
        mapChart.dimension(dimData["departement"])
            .height(null)
            .width(null)
            .group(groupData["departement"]["sum"])
            .colors(d3.scaleQuantize().range(["#E2F2FF", "#C4E4FF", "#9ED2FF", "#81C5FF", "#6BBAFF", "#51AEFF", "#36A2FF", "#1E96FF", "#0089FF", "#0061B5"]))
            .colorDomain([0, 10000])
            .colorCalculator(function (d) {
                return d ? mapChart.colors()(d) : '#ccc';
            })
            .overlayGeoJson(departementsJson.features, "departement", function (d) {
                return d.properties.code;
            })
            .projection(d3.geoMercator().center([2, 47]).scale(3))
            .valueAccessor(function (d) {
                console.log(d)
                return d.value.sum;
            })
            .title(function (d) {
                return "Departement: " + d.key + "\nTotal Prenoms: " + d.value;
            });
        return mapChart;
    });

}

let go = () => {
    console.log("go");
    let spinner = new Spinner({}).spin(document.getElementById("spinner"));
    reset()
    getNamePopulation(false)
        .then((names) => {
            console.time("load data");
            $.ajax("/prenoms/crossfilter/data_pg", {
                data: JSON.stringify(names.data),
                headers: {"Content-Type": "application/json"},
                method: "POST",
            }).then((results) => {
                console.timeEnd("load data");
                console.time("parse data");
                let parsedData = Papa.parse(results, {header: true, dynamicTyping: true});
                console.timeEnd("parse data");
                console.time("initialize data");
                initializeCrossfilter(parsedData.data);
                console.timeEnd("initialize data");
                console.time("show Dashboard");
                showDashboard();
                console.timeEnd("show Dashboard");
                console.time("format Dashboard");
                formatDashboard();
                console.timeEnd("format Dashboard");
                spinner.stop();
            }).catch((err) => {
                console.log("blabla");
                console.log(err);
            });
        })
        .catch((err) => {
            console.log(err);
        });
};

let resetFilters = () => {
    $("div[class$='-selected']").each((i, elmt) => {
        let theClass = elmt.className
        let newClass = theClass.replace("-selected", "");
        let checkboxId = "";
        $(elmt).removeClass(theClass).addClass(newClass);
        $("#toggle-" + elmt.id).prop("checked", false);
    })
    getNamePopulation(true);
}
let reset = () => {
    if (seriesChart !== undefined) {
        seriesChart.resetSvg();
    }
    if (mapChart !== undefined) {
        mapChart.resetSvg();
    }
    // $("#cloud").html("");
    // $("#tableau").html("");
}

let getNamePopulation = (isCount) => {
    $("#count-number").html("");
    let spinner = new Spinner({}).spin(document.getElementById("count-number"));
    let filters = [];
    for (let filtername of ["percentile", "trend", "syllabe", "gender", "decade", "sound"]) {
        $("#" + filtername + " > div." + filtername + "-container-selected").each(function () {
            filters.push({type: filtername, value: this.id.split("-")[1]});
        });
    }
    //get the count
    let url = "/prenoms/filters"
    let filtersData = {
        isCount: isCount,
    };
    if (filters.length > 0) {
        filtersData.filters = filters;
    }
    return $.ajax(url, {
        data: JSON.stringify(filtersData),
        headers: {"Content-Type": "application/json"},
        method: "POST",
    }).then((body) => {
        spinner.stop();
        $("#count-number").html(body.count)
        return (body);
    }).catch((err) => {
        console.log(err);
        spinner.stop();
        $("#count-number").html("Blah!");
        return (err);
    })
}

let transfoGenerator = (isChecked, className, selectedClassName) => {
    if (isChecked) {
        return (x) => x.removeClass(className).addClass(selectedClassName);
    } else {
        return (x) => x.removeClass(selectedClassName).addClass(className);
    }
}

let toggleGeneric = (checkbox) => {
    let theSplit = checkbox.id.split("-");
    let theName = theSplit[1];
    let theThing = "";
    for (let i = 2; i < theSplit.length; i++) {
        theThing += theSplit[i] + "-";
    }
    theThing = theThing.slice(0, -1);
    transfoGenerator(checkbox.checked, theName + "-container", theName + "-container-selected")($("#" + theName + "-" + $.escapeSelector(theThing)));
    getNamePopulation(true);
}

let generateSounds = () => {
    $("#sound").html("");
    $.ajax("/prenoms/sons").then((arrSons) => {
        console.log(arrSons);
        for (let son of arrSons) {
            $("#sound").append('<div id="sound-|' + son + '|" class="sound-container"><label for="toggle-sound-|' + son + '|">' + son + '</label></div>')
            $("#checkboxes").append('<input type="checkbox" id="toggle-sound-|' + son + '|" onclick="toggleGeneric(this)">');
        }
    }).catch((err) => {
        console.log(err);
    })
}

$(function () {
    $("#btn-go").button()
        .click(go);
    $("#btn-reset").button()
        .click(resetFilters);

    generateSounds();
    getNamePopulation(true);
});