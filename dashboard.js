// Load the CSV file and process data
d3.csv("Titanic-Dataset.csv").then(data => {
    processAndCreateCharts(data);
});

function processAndCreateCharts(data) {
    // Data preprocessing
    data.forEach(d => {
        d.Age = d.Age;
        d.Fare = +d.Fare;
        d.Survived = +d.Survived;
        d.Pclass = +d.Pclass;
        d.SibSp = +d.SibSp;
        d.Parch = +d.Parch;
        d.NoRelatives = d.SibSp + d.Parch;
    });

    createSankeyDiagram(data);
    createHistogram(data);
    createStackableBarChart(data);
    createTreemap(data);
}

function createSankeyDiagram(data) {
    // Process data for Sankey diagram
    const categories = ['Embarked', 'Sex', 'Pclass', 'Survived'];
    const nodes = [];
    const links = [];

    // Add unique nodes and create links
    categories.forEach(category => {
        const uniqueValues = [...new Set(data.map(d => d[category]))];
        uniqueValues.forEach(value => {
            nodes.push({ name: `${category}:${value}` });
        });
    });

    data.forEach(d => {
        categories.reduce((prev, curr) => {
            const source = nodes.findIndex(n => n.name === `${prev}:${d[prev]}`);
            const target = nodes.findIndex(n => n.name === `${curr}:${d[curr]}`);
            const link = links.find(l => l.source === source && l.target === target);
            if (link) {
                link.value += 1;
            } else {
                links.push({ source, target, value: 1 });
            }
            return curr;
        });
    });

    const sankeyData = {
        type: "sankey",
        orientation: "h",
        node: { pad: 15, thickness: 20, line: { color: "black", width: 0.5 }, label: nodes.map(n => n.name) },
        link: { source: links.map(l => l.source), target: links.map(l => l.target), value: links.map(l => l.value) }
    };

    Plotly.newPlot("sankey", [sankeyData]);
}

function createHistogram(data) {
    // Filter data for deaths (Survived = 0)
    const deaths = data.filter(d => d.Survived === 0 && !(d.Age===null));
    console.log(deaths);
    console.log(deaths.Age);

    const trace = {
        x: deaths.map(d => d.Age),
        type: 'histogram',
        xbins: { start: 0
                ,size: 5 },
        opacity: 0.6,
        marker: { color: 'red' },
        name: "Deaths"
    };

    const layout = {
        barmode: 'overlay',
        xaxis: { title: "Age" },
        yaxis: { title: "Number of Deaths" },
        showlegend: false
    };

    Plotly.newPlot("histogram", [trace], layout);
}

function createStackableBarChart(data) {
    // Group data by Pclass and Sex
    const pclasses = [1, 2, 3];
    const sexes = ["male", "female"];
    const traces = pclasses.map(pclass => {
        return {
            x: sexes,
            y: sexes.map(sex => data.filter(d => d.Survived === 0 && d.Sex === sex && d.Pclass === pclass).length),
            name: pclass,
            type: 'bar'
        };
    });

    const layout = { barmode: 'stack', xaxis: { title: "Sex" }, yaxis: { title: "Number of Deaths" } };
    Plotly.newPlot("bar", traces, layout);
}

document.getElementById("currentYear").textContent = new Date().getFullYear();


