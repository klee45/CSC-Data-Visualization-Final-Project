

/* -------- Constants ------------------- */
var SVG_WIDTH  = 1300
var SVG_HEIGHT = 940

var US_YEARLY_GROWTH_RATE = 1.008
var WEEKLY_GROWTH_RATE = Math.exp(Math.log(US_YEARLY_GROWTH_RATE)/52.0)

var TIMELINE_MARGIN = 370

var SLIDER_WIDTH = 800
var SLIDER_LEFT = 50;
var SLIDER_RIGHT = SLIDER_LEFT + SLIDER_WIDTH

var LEGEND_RIGHT_OFFSET = 10;
var LEGEND_HEIGHT_OFFSET = 410;

var SLIDER_AXIS_MARGIN = 10

var BORDER_COLOR = "#000000"
var BORDER_WIDTH = 1

var YEAR_FONT_SIZE = "24px"

var COLOR_SCALE_MIN = "#ffffff"
var COLOR_SCALE_MAX = "#0571c0"

var GRAPH_HEIGHT = 300
var GRAPH_BOTTOM = SVG_HEIGHT - 40

var TEXTBOX_X = SVG_WIDTH - 500
var TEXTBOX_Y = 400

//                      2014    2015    2016    2017
var WEEKS_IN_YEAR    = [ 53,     52,     52,     15 ]

// Yeah it looks pretty bad
var CUMULATIVE_WEEKS = {2014: 0,
                        2015:(WEEKS_IN_YEAR[0]),
                        2016:(WEEKS_IN_YEAR[0] + WEEKS_IN_YEAR[1]),
                        2017:(WEEKS_IN_YEAR[0] + WEEKS_IN_YEAR[1] + WEEKS_IN_YEAR[2]),
                        2018:(WEEKS_IN_YEAR[0] + WEEKS_IN_YEAR[1] + WEEKS_IN_YEAR[2] + WEEKS_IN_YEAR[3])}

var WEEK_LIMIT = WEEKS_IN_YEAR.reduce((a, b) => a + b, 0)
                        
var MONTH_NAMES =   ["January", "February", "March", "April",
                     "May", "June", "July", "August",
                     "September", "October", "November", "December"]
                   
// First element is the drop-down name
// and the second is the file name
var DISEASE_NAMES = [['Chlamydia',          'Chlamydia trachomatis infection'],
                     ['Cryptosporidiosis',  'Cryptosporidiosis'],
                     ['Giardiasis',         'Giardiasis'],
                     ['Gonorrhe',           'Gonorrhe'],
                     ['Lyme disease',       'Lyme disease'],
                     ['Malaria',            'Malaria'],
                     ['Rabies (animal)',    'Rabies animal'],
                     ['Hepatitis A',        'Hepatitis viral acute type A'],
                     ['Hepatitis B',        'Hepatitis viral acute type B'],
                     ['Hepatitis C',        'Hepatitis viral acute type C']]


/* -------- Basic setup ----------------- */

// Geo Projection
var projection = d3.geoAlbersUsa();
var path = d3.geoPath().projection(projection);

// Generate an SVG element on the page
var svg = d3.select("body").append("svg")
    .attr("width", SVG_WIDTH)
    .attr("height", SVG_HEIGHT)
    .attr("transform", "translate(100, 0)");


/* -------- Dynamic Variables ----------- */

var colorScale;

var stateViews;
var currentMap;

var currentWeek;

var timer;

var title;

var sliderHideLeft;
var sliderHideRight;
var sliderHandle;
var sliderScale;

var diseaseYearStart;
var diseaseYearEnd;

var diseaseData;
var statePopulation;

var populationMod = WEEKLY_GROWTH_RATE;

var selectedState;
var selectedStateData;

var graphGroup;
var graphLines;
var graphCircles;

var graphScaleX;
var graphScaleY;
var graphScaleYGroup;

var legendElements;

var playing = false;

var stateInfoMap = d3.map();
var stateInfoElements = d3.map();

var diseaseMinPercent = 0;
var diseaseMaxPercent;


/* -------- Run Functions --------------- */

window.onload = function() {
    loadStatePopulation()
    loadMap()
    setupColors()
    setupTitle()
    setupSliderScale()
    setupStateInfo()
    setupDiseaseDropdown()
    setupTimeline()
    setupButton()
    setupTimer()
    setupGraph()
    setupGraphBackground()
    setupLegend()
    
    loadDataInitial(DISEASE_NAMES[0][1])
        
    // Not sure why it needs to be delayed
    // because the data is loaded earlier
    setTimeout(function() {
        selectState("IOWA")
        updateView(0)
    }, 100);
    
}

/* -------- Loading Functions ----------- */

function loadMap() {
    // Defer our actual code until we have the map data loaded
    d3.queue()
      .defer(d3.csv,  'US Info/state-information.csv')
      .defer(d3.json, 'US Info/us-states.json')
      .await(function(error, stateInfoData, usStates) {
        // This code runs when both data files are loaded        
        svg.append('g')
          .attr('class', 'states')
        
        //generate states and color with week 1 color
        svg.append('g')
            .attr('class', 'states')
                        
        for(var row of stateInfoData) {
            stateInfoMap.set(row.State, {Population: row.Population, GSP: row.GSP,
                                         pctUrb: row.POPPCT_URBAN, Density: row.Density})
        }
        
        stateViews = svg.selectAll('.states')
                        .selectAll('path')
                        .data(usStates.features)
                        .enter()
                        .append('path')
                        .attr("transform", "translate(0," + (50) + ")")
                        .attr('d', path)
                        .style('stroke', BORDER_COLOR)
                        .style('stroke-width', BORDER_WIDTH)
                        .on('click', function(d) {
                            selectState(d.properties.name.toUpperCase())
                        })
                        .on("mouseover", function() {
                            d3.select(this)
                                .style('stroke', "red")
                                .style('stroke-width', BORDER_WIDTH * 3);
                        })
                        .on("mouseout", function() {
                            d3.select(this)
                                .style('stroke', BORDER_COLOR)
                                .style('stroke-width', BORDER_WIDTH);
                        })
                        .on("click", function(d) {
                            name = d.properties.name;
                            stateInfoElements.get("Name")
                                .text("Name: "  + name)
                            stateInfoElements.get("Population")
                                .text("Population: " + stateInfoMap.get(name).Population);
                            stateInfoElements.get("Urban")
                                .text("Percent Urban: " + stateInfoMap.get(name).pctUrb);
                            stateInfoElements.get("Density")
                                .text("Population density (per square mile): " + stateInfoMap.get(name).Density);
                            stateInfoElements.get("GSP")
                                .text("Gross State Product (in millions): " + stateInfoMap.get(name).GSP);
                            selectState(name.toUpperCase())
                        });
    });
}

function loadStatePopulation() {
    d3.csv("US Info/state-population.csv", function(data) {
        statePopulation = d3.map()
        data.forEach(d => statePopulation.set(d.State.toUpperCase(), d.Population))
    });
}

function loadDataInitial(name, afterFunction) {
    function getMax(data) {
        max = 0.0;
        state = "";
        for (row of data) {
            percent = parseInt(row.Counts) / (statePopulation.get(row.Area) * US_YEARLY_GROWTH_RATE)
            if (percent > max) {
                max = percent;
            }
        }
        return max / 100;
    }
    
    d3.csv("Datasets/Output/" + name + ".csv", function(data) {
        diseaseData = data
        // Grab the first year and the last year
        diseaseYearStart = parseInt(data[0].Year)
        diseaseYearEnd   = parseInt(data[data.length - 1].Year)
        sliderLeft  = Math.max(0, CUMULATIVE_WEEKS[diseaseYearStart] - 7)
        sliderRight = Math.min(SLIDER_WIDTH, SLIDER_WIDTH * (CUMULATIVE_WEEKS[diseaseYearEnd + 1]/WEEK_LIMIT) + 7)
        sliderHideLeft.attr( "x2", sliderLeft)
        sliderHideRight.attr("x1", sliderRight)
        setStatePaused()
        
        diseaseMaxPercent = getMax(data)
        resetWeek()

        updateColorScale()
        updateLegend()
        updateTitle(name)
        
        if (afterFunction) {
            afterFunction();
        }
    });
}

function loadData(name) {
    loadDataInitial(name, function() {selectState(selectedState); updateView(0);})
}


/* -------- Helper Functions ------------ */

function toPercent(val, name) {
    return val / (statePopulation.get(name) * populationMod) / 100
}

function switchStates() {
    if (playing) {
        setStatePaused()
    }
    else {
        setStatePlaying()
    }
}

function setStatePlaying() {
    playing = true
    pauseImage.style("opacity", 1);
    playImage.style("opacity", 0);
}

function setStatePaused() {
    playing = false
    pauseImage.style("opacity", 0);
    playImage.style("opacity", 1);
}

function resetWeek() {
    currentWeek = CUMULATIVE_WEEKS[diseaseYearStart]
    updateSlider()
}

function selectState(state) {
    selectedState = state
    selectedStateData = []
    firstInd = 0
    // Find the first index of the state
    for (i = 0; i < 50; i++) {
        if (diseaseData[i].Area == state) {
            firstInd = i;
            break;
        }
    }
    // Get all indices of the state and push the
    // data into set
    for (i = firstInd; i < diseaseData.length; i += 50) {
        row = diseaseData[i];
        selectedStateData.push({Counts:parseInt(row.Counts),
                                Cumulative_Counts:parseInt(row.Cumulative_Counts)})
    }
    updateGraph()
}

/* -------- Updating Visualization ------ */

function updateColorScale() {
    colorScale = d3.scaleLinear()
                        .range([COLOR_SCALE_MIN, COLOR_SCALE_MAX])
                        .domain([diseaseMinPercent, diseaseMaxPercent])
}

//function to update view
function updateView(week){
    currentMap = d3.map();
    // Grab year from the first element in the
    // collected rows
    temp = diseaseData[week * 50]
    currentYear = parseInt(temp.Year)
    yearWeek = parseInt(temp.Week)
    for (i = 0; i < 50; i++) {
        row = diseaseData[i + week * 50];
        currentMap.set(row.Area, {Counts: row.Counts, 
                                  Cumulative_Counts: row.Cumulative_Counts})
    }
    
    // Estimated growth based on US yearly growth
    populationMod = Math.pow(WEEKLY_GROWTH_RATE, week)
    
    // Color states
    // No reason to add anything, all that is necessary
    // is to recolor the given states
    stateViews.attr('fill', function(d) {
            name = d.properties.name.toUpperCase()
            state = currentMap.get(name)
            if (!state) {
                return "#ffffff"
            }
            else {
                return colorScale(toPercent(state.Counts, name));
            }
        })
        
    // Set year
    portion = 52.0 / 12.0
    monthNum = Math.round(yearWeek/portion) % 12
    seasonNum = Math.round((yearWeek - 4) / 13) % 4
    
    d3.select(".year")
        .text(currentYear + " - " + MONTH_NAMES[monthNum] + " (" + yearWeek + ")")

    switch(seasonNum) {
        case 0:
            seasonName = "Winter"
            break;
        case 1:
            seasonName = "Spring"
            break;
        case 2:
            seasonName = "Summer"
            break;
        default:
            seasonName = "Fall"
            break;
    }
    document.getElementById("season_image").src = "Images/" + seasonName + ".png"
       
    updateGraphCircles()
}

function updateGraphCircles() {
    graphCircles
        .attr("r", (d,i) => i == currentWeek ? 5 : 2.5)
        .attr("fill", (d,i) => i == currentWeek ? "#6615e8" : "#000000")
}

function updateGraph() {
    graphScaleY = d3.scaleLinear()
                   .domain([diseaseMinPercent, diseaseMaxPercent])
                   .range([GRAPH_HEIGHT, 0]);
                   
    yaxis = d3.axisLeft(graphScaleY)
        .ticks(5, "s");

    graphScaleYGroup.call(yaxis)
    
    var line = d3.line()
                 .x((d,i) => graphScaleX(i))
                 .y(d => graphScaleY(toPercent(d.Counts, selectedState)))
    
    graphLines.attr("d", line(selectedStateData))
    
    if (!!graphCircles)
        graphCircles.remove();
    graphCircles = graphGroup.selectAll("graph-circle")
                    .data(selectedStateData)
                    .enter()
                    .append("circle")
                    .attr("cx", (d,i) => graphScaleX(i))
                    .attr("cy", d => graphScaleY(toPercent(d.Counts, selectedState)))
    updateGraphCircles()
}

function updateTimer(intervalTime) {
    if (timer) {
        timer.stop()
    }
    timer = d3.interval(function(elapsed) {
        if (playing) {
            updateTimeline()
        }
    }, parseInt(intervalTime));
}

function updateTimeline() {
    if (currentWeek >= CUMULATIVE_WEEKS[diseaseYearEnd + 1] - 1) {
        switchStates()
        resetWeek()
    }
    updateView(++currentWeek)
    updateSlider()
}

function updateSlider() {
    sliderHandle.attr("cx", sliderScale(currentWeek))
}

function updateLegend() {
    var legendScale = d3.scaleLinear().domain([0, 8])
                                      .range([diseaseMinPercent, diseaseMaxPercent]);
    for (i in legendElements) {
        legend = legendElements[i];
        legend[0].attr('fill', colorScale(legendScale(i)));
        legend[1].text(legendScale(i).toExponential(2));
    }
}

function updateTitle(diseaseName) {
    title.text(diseaseName)
}


/* --------------- Setup functions -------------- */

// Should probably just group all of these
// and translate instead of putting x and y
// values
function setupStateInfo() {
    stateInfoElements = d3.map()
    stateInfoElements.set("Name", svg.append('text')
                                .attr('x', TEXTBOX_X)
                                .attr('y', TEXTBOX_Y)
                                .attr('font-family', 'sans-serif')
                                .attr('font-size', '10pt'))
    stateInfoElements.set("Population", svg.append('text')
                                .attr('x', TEXTBOX_X)
                                .attr('y', TEXTBOX_Y + 20)
                                .attr('font-family', 'sans-serif')
                                .attr('font-size', '10pt'))
    stateInfoElements.set("Urban", svg.append('text')
                                .attr('x', TEXTBOX_X)
                                .attr('y', TEXTBOX_Y + 40)
                                .attr('font-family', 'sans-serif')
                                .attr('font-size', '10pt'))
    stateInfoElements.set("Density", svg.append('text')
                                .attr('x', TEXTBOX_X)
                                .attr('y', TEXTBOX_Y + 60)
                                .attr('font-family', 'sans-serif')
                                .attr('font-size', '10pt'))
    stateInfoElements.set("GSP", svg.append('text')
                                .attr('x', TEXTBOX_X)
                                .attr('y', TEXTBOX_Y + 80)
                                .attr('font-family', 'sans-serif')
                                .attr('font-size', '10pt'))
}

function setupColors() {
    numDiseases = DISEASE_NAMES.length;
    portion = 2.0 * Math.PI / numDiseases;
    for (i = 0; i < numDiseases; i++) {
        row = DISEASE_NAMES[i]
        val = (i + 0.5) * portion
        v = Math.sin(val) * 0.615
        u = Math.cos(val) * 0.436
        
        console.log(v + ", " + u)
        y = 0.2

        r = Math.round(255 * (y + (1.140 * v)))
        g = Math.round(255 * (y - (0.395 * u) - (0.581 * v)))
        b = Math.round(255 * (y + (2.033 * u)))

        row.push("rgb(" + r + 
                    "," + g +
                    "," + b + ")")
    }
}

function setupTitle() {
    title = svg.append("text")
        .attr("x", (SVG_WIDTH - 300)/ 2)
        .attr("y", 50)
        .attr("text-anchor", "middle")
        .style("font-size", "28px")
}

function setupLegend() {
    legendElements = []

    //generate a legend
    for(var i = 0; i <= 8; i++) {
          legendRect = svg.append('rect')
            .attr('x', LEGEND_RIGHT_OFFSET)
            .attr('y', LEGEND_HEIGHT_OFFSET - 30 * i)
            .attr('width', 25)
            .attr('height', 25)
            .attr('stroke', '#000')
            .attr('stroke-width', '0.5px')

          legendText = svg.append('text')
            .attr('x', LEGEND_RIGHT_OFFSET - 60)
            .attr('y', LEGEND_HEIGHT_OFFSET + 18 - 30 * i)
            .attr('font-family', 'sans-serif')
            .attr('font-size', '10pt')
            
        legendElements.push([legendRect, legendText])
    }
}

function setupGraphBackground() {
    //             winter     spring     summer     fall
    colorCycle = ["#02b1e8", "#b3d92c", "#ffcf09", "#e86016"]
    graphBackgroundGroup = svg.append('g')
                            .attr('transform', 'translate(' + SLIDER_LEFT +
                                                        ',' + (GRAPH_BOTTOM - GRAPH_HEIGHT) + ')')
    i = -4;
    colorNum = 0;
    while(i < WEEK_LIMIT) {
        graphBackgroundGroup.append("rect")
            .attr("x", graphScaleX(Math.max(i, 0)))
            // Not very nice code, but it works
            .attr("width", graphScaleX(Math.min(Math.min(i + 13, 13), WEEK_LIMIT - i)))
            .attr("y", 0)
            .attr("height", GRAPH_HEIGHT)
            .attr("fill", colorCycle[(colorNum++) % 4])
            .style('opacity', 0.25)
        i += 13;
    }
}

function setupGraph() {
    graphScaleX = d3.scaleLinear()
                   .domain([0, WEEK_LIMIT])
                   .range([0, SLIDER_WIDTH])
                   
    xaxis = d3.axisBottom(graphScaleX);

    svg.append('g')
        .attr('transform', 'translate(' + SLIDER_LEFT +
                                   ', ' + GRAPH_BOTTOM + ')')
        .call(xaxis);
  
    svg.append('text')
        .text('Week')
        .attr('x', SLIDER_WIDTH / 2)
        .attr('y', GRAPH_BOTTOM + 40);

    graphScaleYGroup = svg.append('g')
        .attr('transform', 'translate(' + SLIDER_LEFT + 
                                   ', ' + (GRAPH_BOTTOM - GRAPH_HEIGHT) + ')')

    svg.append('text')
        .text('Percentage of Infected Individuals')
        .style('text-anchor', 'middle')
        .attr('transform', 'translate(' + (SLIDER_LEFT - 70) + 
                                   ', ' + (GRAPH_BOTTOM - (GRAPH_HEIGHT / 2)) + ')rotate(-90)');
    graphGroup = svg.append("g")
                    .attr('transform', 'translate(' + SLIDER_LEFT +
                                                ',' + (GRAPH_BOTTOM - GRAPH_HEIGHT) + ')')                       
    graphLines = graphGroup.append("path")
            .attr("stroke", "steelblue")
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("stroke-width", 1.5)
            .attr("fill", "none")
            .attr("class", "line")
}

function setupDiseaseDropdown() {
    diseaseField = document.getElementById("sortby_field_disease")
    for (i in DISEASE_NAMES) {
        value = DISEASE_NAMES[i][1]
        name  = DISEASE_NAMES[i][0]
        opt = document.createElement("option")
        opt.text  = name
        opt.value = value
        diseaseField.appendChild(opt)
    }
    diseaseField.onchange = function() {
        loadData(diseaseField.options[diseaseField.selectedIndex].value)
    }
}

function setupSliderScale() {
    sliderScale = d3.scaleLinear()
                    .domain([0, WEEK_LIMIT-1])
                    .range([0, SLIDER_WIDTH])
                    .clamp(true);
}

function setupTimeline() {
    var axis = d3.axisBottom(sliderScale)
                 .tickFormat(function (d) {
                     if (d >= CUMULATIVE_WEEKS[2017])
                         return 2017
                     else if (d >= CUMULATIVE_WEEKS[2016])
                         return 2016
                     else if (d >= CUMULATIVE_WEEKS[2015])
                         return 2015
                     return 2014
                 })
                 .tickValues([CUMULATIVE_WEEKS[2014],
                              CUMULATIVE_WEEKS[2015],
                              CUMULATIVE_WEEKS[2016],
                              CUMULATIVE_WEEKS[2017]])

    sliderHeight = (SVG_HEIGHT - TIMELINE_MARGIN)
    sliderTransform = "translate(" + SLIDER_LEFT + "," + sliderHeight + ")"
    sliderLeft  = sliderScale.range()[0]
    sliderRight = sliderScale.range()[1]
                            
    var slider = svg.append("g")
        .attr("class", "slider")
        .attr("transform",sliderTransform );
                                    
    sliderHideLeft = svg.append("g")
        .attr("class", "slider_hide")
        .attr("transform", sliderTransform)
        .append("line")
        .attr("stroke", "#000")
        .attr("stroke-width", 5)
        .attr("class", "track_hide_left")
        .attr("x1", sliderLeft)
        .attr("x2", sliderLeft)
        
    sliderHideRight = svg.append("g")
        .attr("class", "slider_hide")
        .attr("transform", sliderTransform)
        .append("line")
        .attr("stroke", "#000")
        .attr("stroke-width", 5)
        .attr("class", "track_hide_left")
        .attr("x1", sliderRight)
        .attr("x2", sliderRight)
        
    var axisGroup = svg.append("g")
        .attr("transform", "translate(" + SLIDER_LEFT + 
                                    "," + (sliderHeight + SLIDER_AXIS_MARGIN) + ")")
        .call(axis);
                                    
    slider.append("line")
        .attr("class", "track")
        .attr("x1", sliderScale.range()[0])
        .attr("x2", sliderScale.range()[1])
        .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
        .   attr("class", "track-inset")
        .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
            .attr("class", "track-overlay")
            .call(d3.drag()
                .on("start.interrupt", function() { 
                    slider.interrupt(); 
                })
                .on("start drag", function() {
                    setStatePaused()
                    currentWeek = Math.min((CUMULATIVE_WEEKS[diseaseYearEnd + 1] - 1),
                                           parseInt(sliderScale.invert(d3.event.x)))
                    updateSlider()
                    updateView(currentWeek)
                }));
                    
    sliderHandle = slider.insert("circle", ".track-overlay")
        .attr("class", "handle")
        .attr("r", 9);
        
    d3.select(".year")
        .style("font-size", YEAR_FONT_SIZE)
}

function setupButton() {
    translate = "translate(" + (SLIDER_LEFT - 80) +
                         "," + (SVG_HEIGHT - TIMELINE_MARGIN - 20) +")"
    
    var playButton = svg.append("g")
        .attr("transform", translate);

    playButton
        .append("rect")
        .attr("width", 50)
        .attr("height", 50)
        .attr("rx", 4)
        .style("fill", "steelblue");

    playImage = svg.append("g")
        .attr("transform", translate)
        .append("path")
        .style("pointer-events", "none")
        .attr("d", "M15 10 L15 40 L35 25 Z")
        .style("fill", "white")
    
    pauseImage = svg.append("g")
                  .attr("transform", translate)
                  .style("pointer-events", "none");
                 
    pauseImage.append("rect")
            .attr("x", 13)
            .attr("y", 13)
            .attr("width", 7)
            .attr("height", 25)
            .style("fill", "#ffffff");
            
    pauseImage.append("rect")
            .attr("x", 29)
            .attr("y", 13)
            .attr("width", 7)
            .attr("height", 25)
            .style("fill", "#ffffff");
            
    pauseImage.style("opacity", 0);

    playButton
        .on("mousedown", function() {
            d3.select(this).select("rect")
                .style("fill","white")
                .transition()
                .style("fill","steelblue");
            switchStates()
        });
}

function setupTimer() {
    speedField = document.getElementById('sortby_field_speed')
    
    speedField.onchange = function() {
        selectedOption = speedField.options[speedField.selectedIndex]
        intervalTime = selectedOption.value
        updateTimer(intervalTime)
    }
    updateTimer(speedField.options[speedField.selectedIndex].value)
}













