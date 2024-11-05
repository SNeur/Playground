//test1
document.addEventListener("DOMContentLoaded", () => {
    const margin = { top: 20, right: 30, bottom: 50, left: 60 },
          width = 800 - margin.left - margin.right,
          height = 400 - margin.top - margin.bottom;

    // ----------------------
    // 1. STOCK LINE GRAPH
    // ----------------------

    const svg = d3.select("#chart")
                  .append("svg")
                  .attr("width", width + margin.left + margin.right)
                  .attr("height", height + margin.top + margin.bottom)
                  .append("g")
                  .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime().range([0, width]);
    const y = d3.scaleLinear().range([height, 0]);

    let line = d3.line()
                 .x(d => x(d.date))
                 .y(d => y(d.close));

    d3.csv("nasdq.csv").then(data => {
        data.forEach(d => {
            d.date = d3.timeParse("%Y-%m-%d")(d.Date);
            d.close = +d.Close;
            d.open = +d.Open;
        });

        x.domain(d3.extent(data, d => d.date));
        y.domain([d3.min(data, d => Math.min(d.close, d.open)), d3.max(data, d => Math.max(d.close, d.open))]);

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
        .style("font-size", "14px");

        // Increase font size of y-axis labels
        svg.selectAll(".y-axis text")
        .style("font-size", "14px");

        const toggleButton = document.getElementById("toggleButton");
        const subtitle = document.getElementById("priceSubtitle");
        let showClose = true;

        toggleButton.addEventListener("click", () => {
            showClose = !showClose;
            toggleButton.textContent = showClose ? "Show Open Price" : "Show Close Price";
            subtitle.textContent = `Currently Showing: ${showClose ? "Close Price" : "Open Price"}`;

            line = d3.line()
                     .x(d => x(d.date))
                     .y(d => y(showClose ? d.close : d.open));

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

    const plotWidth = 200 - margin.left - margin.right,
          plotHeight = 400 - margin.top - margin.bottom;

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
                                      .attr("width", plotWidth + margin.left + margin.right)
                                      .attr("height", plotHeight + margin.top + margin.bottom)
                                      .append("g")
                                      .attr("transform", `translate(${margin.left},${margin.top})`);
                
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
            yAxis.selectAll("text").style("font-size", "12px");
        
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
});
