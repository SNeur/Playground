// Reloads page on window resize
window.addEventListener('resize', () => {
    location.reload();
});

let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        location.reload();
    }, 500); // Reloads after resizing has stopped for 500 ms
});



//test1
document.addEventListener("DOMContentLoaded", () => {
    // Select the Bootstrap column by its ID, class, or any other selector
    const column = document.querySelector('.col-md-10'); // Adjust class as needed

    // Get the current width in pixels
    const columnWidth = column.offsetWidth; // Width in pixels
    //console.log('Column width in pixels:', columnWidth);


    let screendim = columnWidth*0.95; //(window.innerWidth>1000) ? 800 : window.innerWidth*0.7;
    const margin = { top: 30, right: 20, bottom: 60, left: 50 },
    width = screendim - margin.left - margin.right, 
    height = 400 - margin.top - margin.bottom;
    
    //800 400
    // ----------------------
    // 1. STOCK LINE GRAPH
    // ----------------------

    const svg = d3.select("#chart")
                .append("svg")
                .attr("width", width*1.1 + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime().range([0, width*1.1]);
    const y = d3.scaleLinear().range([height, 0]);

    // Initially set line to use "Open" price
    let line = d3.line()
            .x(d => x(d.date))
            .y(d => y(d.open));

    d3.csv("nasdaq.csv").then(data => {
    data.forEach(d => {
        d.date = d3.timeParse("%d/%m/%Y")(d.Date);
        d.open = +d.Open;
        d.volume = +d.Volume;
    });

    // Set x-axis domain
    x.domain(d3.extent(data, d => d.date));
    // Set initial y-axis domain based on "Open" values
    y.domain([d3.min(data, d => d.open), d3.max(data, d => d.open)]);

    svg.append("path")
        .datum(data)
        .attr("class", "line")
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1.5);

    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    svg.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(y));

    // Increase font size of x-axis labels
    svg.selectAll(".x-axis text")
        .style("font-size", "14px")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-65)");

    // Increase font size of y-axis labels
    svg.selectAll(".y-axis text").style("font-size", "14px");

    const toggleButton = document.getElementById("toggleButton");
    const subtitle = document.getElementById("priceSubtitle");
    let showOpen = true;

    toggleButton.addEventListener("click", () => {
        showOpen = !showOpen;
        toggleButton.textContent = showOpen ? "Show Volume" : "Show Open Price";
        subtitle.textContent = `Currently Showing: ${showOpen ? "Open Price" : "Volume (mio)"}`;

        // Update line to reflect selected variable (either "Open" or "Volume")
        line = d3.line()
                .x(d => x(d.date))
                .y(d => y(showOpen ? d.open : d.volume));

        // Update y-axis domain based on the selected variable
        y.domain([
            d3.min(data, d => showOpen ? d.open : d.volume),
            d3.max(data, d => showOpen ? d.open : d.volume)
        ]);

        // Transition y-axis and line path
        svg.select(".y-axis")
            .transition()
            .duration(750)
            .style("font-size", "14px")
            .call(d3.axisLeft(y));

        svg.selectAll(".line")
            .datum(data)
            .transition()
            .duration(750)
            .attr("d", line);
    });
    }).catch(error => console.error("Error loading CSV data:", error));


    document.getElementById("currentYear").textContent = new Date().getFullYear();

    // ----------------------
    // 2. BOX PLOTS FOR POSSUM DATA
    // ----------------------
    const boxmargin = {left:30, right:20}
    const plotWidth = screendim/4 - boxmargin.left - boxmargin.right,
          plotHeight = 400 - margin.top - margin.bottom;
    // 200 400
    // Container for boxplots
    const boxPlotContainer = d3.select("#boxPlotChart").append("div").attr("class", "d-flex flex-row justify-content-between");

    // Filter selection storage
    const selectedFilters = { site: new Set(), pop: new Set(), sex: new Set() };

    // Variable mappings and labels
    const variables = [
        { csvName: "age", label: "Age" },
        { csvName: "totlngth", label: "Total length" },
        { csvName: "taill", label: "Tail length" },
        { csvName: "belly", label: "Belly girth" }
    ];

    // Load data and create filter buttons
    d3.csv("possum.csv").then(possumData => {
        ["site", "pop", "sex"].forEach(varName => {
            const uniqueValues = Array.from(new Set(possumData.map(d => d[varName])));
            const container = d3.select(`#${varName}Buttons`);

            uniqueValues.forEach(value => {
                container.append("button")
                         .attr("class", "btn btn-outline-primary btn-sm m-1")
                         .text(value)
                         .on("click", function() {
                             if (selectedFilters[varName].has(value)) {
                                 selectedFilters[varName].delete(value);
                                 d3.select(this).classed("active", false);
                             } else {
                                 selectedFilters[varName].add(value);
                                 d3.select(this).classed("active", true);
                             }
                             updateAllBoxPlots();
                         });
            });
        });

        function filterData() {
            return possumData.filter(d =>
                (!selectedFilters.site.size || selectedFilters.site.has(d.site)) &&
                (!selectedFilters.pop.size || selectedFilters.pop.has(d.pop)) &&
                (!selectedFilters.sex.size || selectedFilters.sex.has(d.sex))
            );
        }

        // Function to update all boxplots
        function updateAllBoxPlots() {
            const filteredData = filterData();
            document.getElementById("boxPlotTitle").textContent = `Possum Data - Showing ${filteredData.length} Cases`;

            variables.forEach((variable, index) => updateBoxPlot(filteredData, variable, index));
        }

        // Function to update each individual boxplot
        function updateBoxPlot(filteredData, variable, index) {
            // Calculate summary statistics for the filtered data
            const varData = filteredData.map(d => +d[variable.csvName]).sort(d3.ascending);
            const summaryStats = {
                q1: d3.quantile(varData, 0.25),
                median: d3.quantile(varData, 0.5),
                q3: d3.quantile(varData, 0.75),
                min: d3.min(varData),
                max: d3.max(varData)
            };
        
            // Set up SVG and define fixed horizontal positions
            let svg = boxPlotContainer.select(`#box-plot-${variable.csvName}`);
            if (svg.empty()) {
                svg = boxPlotContainer.append("svg")
                                      .attr("id", `box-plot-${variable.csvName}`)
                                      .attr("width", plotWidth + boxmargin.left + boxmargin.right)
                                      .attr("height", plotHeight + margin.top + margin.bottom)
                                      .append("g")
                                      .attr("transform", `translate(${boxmargin.left},${margin.top})`);
                
                svg.append("text")
                   .attr("class", "plot-title")
                   .attr("x", plotWidth / 2)
                   .attr("y", -10)
                   .attr("text-anchor", "middle")
                   .style("font-size", "14px")
                   .text(variable.label);
            }
        
            // Update y-scale based on the new filtered data range
            const y = d3.scaleLinear()
                        .domain([summaryStats.min, summaryStats.max])
                        .range([plotHeight, 0]);
        
            // Draw or update y-axis
            let yAxis = svg.select(".y-axis");
            if (yAxis.empty()) {
                yAxis = svg.append("g")
                           .attr("class", "y-axis")
                           .call(d3.axisLeft(y).ticks(5));
            } else {
                yAxis.transition().duration(750).call(d3.axisLeft(y).ticks(5));
            }
            yAxis.selectAll("text").style("font-size", "14px");
        
            // Define a stable container for box plot elements
            let boxGroup = svg.select(".boxGroup");
            if (boxGroup.empty()) {
                boxGroup = svg.append("g")
                              .attr("class", "boxGroup")
                              .attr("transform", `translate(${plotWidth / 2},0)`);
            }
        
            // Draw or update the range line (min to max)
            let rangeLine = boxGroup.select(".range");
            if (rangeLine.empty()) {
                rangeLine = boxGroup.append("line").attr("class", "range").attr("stroke", "black");
            }
            rangeLine.transition().duration(750)
                     .attr("y1", y(summaryStats.min))
                     .attr("y2", y(summaryStats.max));
        
            // Draw or update the box (q1 to q3)
            let box = boxGroup.select(".box");
            if (box.empty()) {
                box = boxGroup.append("rect").attr("class", "box").attr("fill", "steelblue");
            }
            box.transition().duration(750)
               .attr("x", -plotWidth / 8)
               .attr("width", plotWidth / 4)
               .attr("y", y(summaryStats.q3))
               .attr("height", y(summaryStats.q1) - y(summaryStats.q3));
        
            // Draw or update the median line
            let medianLine = boxGroup.select(".median");
            if (medianLine.empty()) {
                medianLine = boxGroup.append("line").attr("class", "median").attr("stroke", "black");
            }
            medianLine.transition().duration(750)
                      .attr("x1", -plotWidth / 8)
                      .attr("x2", plotWidth / 8)
                      .attr("y1", y(summaryStats.median))
                      .attr("y2", y(summaryStats.median));
        }
        

        updateAllBoxPlots();
    }).catch(error => console.error("Error loading CSV data:", error));

    // ----------------------
    // 3. SCATTER PLOT FOR WINE
    // ----------------------

    const wine_svg = d3.select("#scatterplot")
              .append("svg")
              .attr("width", width + margin.left + margin.right)
              .attr("height", height + margin.top + margin.bottom)
              .append("g")
              .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleLinear().range([0, width]);
    const yScale = d3.scaleLinear().range([height, 0]);

    // Axes
    const xAxis = wine_svg.append("g").attr("transform", `translate(0,${height})`);
    const yAxis = wine_svg.append("g");

    // Annotation for R-squared
    const annotation = wine_svg.append("text")
                        .attr("class", "annotation")
                        .attr("x", width - 20)
                        .attr("y", 20)
                        .attr("text-anchor", "end");

    // Plot title
    const plotTitle = d3.select("#plotTitle");

    // Dropdown event listener
    d3.select("#xVariable").on("change", function() {
        updatePlot(this.value);
    });

    // Load data and initialize plot
    d3.csv("winequality.csv").then(data => {
        data.forEach(d => {
            d.quality = +d.quality;
            d.residual_sugar = +d.residual_sugar;
            d.alcohol = +d.alcohol;
            d.sulphates = +d.sulphates;
        });
        
        // Initial plot setup with "residual_sugar"
        updatePlot("alcohol");
    });

    // Function to calculate linear regression
    function calculateRegression(data, xKey, yKey) {
        const xMean = d3.mean(data, d => d[xKey]);
        const yMean = d3.mean(data, d => d[yKey]);
        
        const numerator = d3.sum(data, d => (d[xKey] - xMean) * (d[yKey] - yMean));
        const denominator = d3.sum(data, d => Math.pow(d[xKey] - xMean, 2));
        const slope = numerator / denominator;
        const intercept = yMean - slope * xMean;
        
        const rSquaredNumerator = d3.sum(data, d => Math.pow((d[yKey] - (slope * d[xKey] + intercept)), 2));
        const rSquaredDenominator = d3.sum(data, d => Math.pow(d[yKey] - yMean, 2));
        const rSquared = 1 - (rSquaredNumerator / rSquaredDenominator);
        
        return { slope, intercept, rSquared };
    }

    // Update plot based on selected x variable
    function updatePlot(xVariable) {
        d3.csv("winequality.csv").then(data => {
            data.forEach(d => {
                d.quality = +d.quality;
                d[xVariable] = +d[xVariable];
            });
            
            // Set x and y scales based on data
            xScale.domain(d3.extent(data, d => d[xVariable])).nice();
            yScale.domain(d3.extent(data, d => d.quality)).nice();
            
            // Update axes
            xAxis.transition().duration(500).call(d3.axisBottom(xScale));
            yAxis.transition().duration(500).call(d3.axisLeft(yScale));

            xAxis.selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-65)")
            .style("font-size", "14px");
            yAxis.selectAll("text").style("font-size", "14px");
            
            // Bind data to circles
            const circles = wine_svg.selectAll("circle").data(data);
            
            // Enter selection
            circles.enter()
                .append("circle")
                .attr("r", 4)
                .attr("fill", "steelblue")
                .merge(circles)
                .transition()
                .duration(500)
                .attr("cx", d => xScale(d[xVariable]))
                .attr("cy", d => yScale(d.quality));
            
            // Remove any excess circles
            circles.exit().remove();
            
            // Update plot title
            plotTitle.text(`X: ${xVariable[0].toUpperCase() + xVariable.replace("_", " ").slice(1)} vs Y: Quality`);
            
            // Calculate and plot regression line
            const { slope, intercept, rSquared } = calculateRegression(data, xVariable, "quality");
            
            const regressionLine = [
                { x: xScale.domain()[0], y: slope * xScale.domain()[0] + intercept },
                { x: xScale.domain()[1], y: slope * xScale.domain()[1] + intercept }
            ];
            
            const line = wine_svg.selectAll(".regression-line").data([regressionLine]);
            
            // Draw or update regression line
            line.enter()
                .append("line")
                .attr("class", "regression-line")
                .attr("stroke", "red")
                .attr("stroke-width", 2)
                .merge(line)
                .transition()
                .duration(500)
                .attr("x1", xScale(regressionLine[0].x))
                .attr("y1", yScale(regressionLine[0].y))
                .attr("x2", xScale(regressionLine[1].x))
                .attr("y2", yScale(regressionLine[1].y));
            
            line.exit().remove();
            
            // Update R-squared annotation
            annotation.text(`R²: ${rSquared.toFixed(2)}`);
        });
    }



});
