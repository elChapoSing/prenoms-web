let xNames = null;
let xData = null;
let dimNames = {};
let groupNames = {};
let dimData = {};
let groupData = {};
let seriesChart;
let mapChart;

JaroWrinker  = function (s1, s2) {
    var m = 0;

    // Exit early if either are empty.
    if ( s1.length === 0 || s2.length === 0 ) {
        return 0;
    }

    // Exit early if they're an exact match.
    if ( s1 === s2 ) {
        return 1;
    }

    var range     = (Math.floor(Math.max(s1.length, s2.length) / 2)) - 1,
        s1Matches = new Array(s1.length),
        s2Matches = new Array(s2.length);

    for ( i = 0; i < s1.length; i++ ) {
        var low  = (i >= range) ? i - range : 0,
            high = (i + range <= s2.length) ? (i + range) : (s2.length - 1);

        for ( j = low; j <= high; j++ ) {
            if ( s1Matches[i] !== true && s2Matches[j] !== true && s1[i] === s2[j] ) {
                ++m;
                s1Matches[i] = s2Matches[j] = true;
                break;
            }
        }
    }

    // Exit early if no matches were found.
    if ( m === 0 ) {
        return 0;
    }

    // Count the transpositions.
    var k = n_trans = 0;

    for ( i = 0; i < s1.length; i++ ) {
        if ( s1Matches[i] === true ) {
            for ( j = k; j < s2.length; j++ ) {
                if ( s2Matches[j] === true ) {
                    k = j + 1;
                    break;
                }
            }

            if ( s1[i] !== s2[j] ) {
                ++n_trans;
            }
        }
    }

    var weight = (m / s1.length + m / s2.length + (m - (n_trans / 2)) / m) / 3,
        l      = 0,
        p      = 0.1;

    if ( weight > 0.7 ) {
        while ( s1[l] === s2[l] && l < 4 ) {
            ++l;
        }

        weight = weight + l * p * (1 - weight);
    }

    return weight;
}

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
        .title((d) => {
            return d.key[0] + " " + d.key[1] + " : " + d.value.sum;
        })
        .margins({left: 70, top: 10, bottom: 30, right: 50})
        .on("preRedraw", function (chart) {
            chart.rescale();
        })
        .on("preRender", function (chart) {
            chart.rescale();
        })
        .on("filtered",function(chart,filter) {
            showCloud();
        });
    showCloud();
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
            .projection(d3.geoMercator().center(d3.geoCentroid(departementsJson)).scale(2000))
            .valueAccessor(function (d) {
                return d.value.sum;
            })
            .title(function (d) {
                return "Departement: " + d.key + "\nTotal Prenoms: " + d.value;
            })
            .on("filtered",function(chart,filter) {
                showCloud();
            });
        return mapChart;
    });

}

let showCloud = () => {

    console.log("show cloud");
    let names = groupData["prenom"]["sum"].top(Infinity).map(x => x.key);
    let data = {nodes:[],links:[]};
    names.forEach((x) => {
        data.nodes.push({"id":x,group:1});
    })

    let test = (x,arr) => {
        return arr.map((y) => [x,y]);
    }
    let combo = names.reduce((acc,currVal,currIdx,src) => {
       return acc.concat(test(currVal,src.slice(currIdx+1)));
    },[]).forEach((x) => {
        console.log(x[0]+" to "+ x[1]);
        console.log(10*JaroWrinker(x[0],x[1]));
        data.links.push({
            source: x[0],
            target: x[1],
            value: 10-10*JaroWrinker(x[0],x[1]),
        })
    })

    function dragstarted(d) {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    };

    function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    };

    function dragended(d) {
        if (!d3.event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    };

    var svg = d3.select("#cloud-svg"),
        // width = +svg.attr("width"),
        // height = +svg.attr("height");
        width = document.getElementById("cloud").offsetWidth,
        height = document.getElementById("cloud").offsetHeight;

    var color = d3.scaleOrdinal(d3.schemeCategory10);

    var simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(function (d) {
            return d.id;
        }))
        .force("charge", d3.forceManyBody())
        .force("center", d3.forceCenter(width / 2, height / 2));


    var link = svg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(data.links)
        .enter().append("line")
        .attr("stroke-width", function (d) {
            return Math.sqrt(d.value);
        });

    var node = svg.append("g")
        .attr("class", "nodes")
        .selectAll("g")
        .data(data.nodes)
        .enter().append("g")

    var circles = node.append("circle")
        .attr("r", 5)
        .attr("fill", function (d) {
            return color(d.group);
        })
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    // var labels = node.append("text")
    //     .text(function (d) {
    //         return d.id;
    //     })
    //     .attr('x', 6)
    //     .attr('y', 3);

    node.append("title")
        .text(function (d) {
            return d.id;
        });

    simulation
        .nodes(data.nodes)
        .on("tick", ticked);

    simulation.force("link")
        .links(data.links);

    function ticked() {
        link
            .attr("x1", function (d) {
                return d.source.x;
            })
            .attr("y1", function (d) {
                return d.source.y;
            })
            .attr("x2", function (d) {
                return d.target.x;
            })
            .attr("y2", function (d) {
                return d.target.y;
            });

        node
            .attr("transform", function (d) {
                return "translate(" + d.x + "," + d.y + ")";
            })
    }

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
    // showCloud();
});