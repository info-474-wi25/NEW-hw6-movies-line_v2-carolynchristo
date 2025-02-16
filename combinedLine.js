// Define dimensions and margins
const margin = { top: 50, right: 30, bottom: 60, left: 70 },
    width = 800 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

// Create SVG container for both charts
const svg = d3.select("#chartContainer")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", (height * 2) + margin.top + margin.bottom + 100) // Make room for two charts
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Create groups for each chart
const svgLine = svg.append("g");
const svgMultiLine = svg.append("g").attr("transform", `translate(0, ${height + margin.bottom + 70})`); // Position below the first chart

// Load data
d3.csv("movies.csv").then(data => {
    // Format data
    data.forEach(d => {
        d.score = +d.imdb_score;
        d.year = +d.title_year;
        d.gross = +d.gross;
        d.country = d.country;
    });

    /* ===================== SINGLE LINE CHART (Total Gross by Year) ===================== */
    
    const cleanLineData = data.filter(d => d.gross != null && d.year >= 2010);
    const lineMapData = d3.rollup(cleanLineData, v => d3.sum(v, d => d.gross), d => d.year);
    const lineData = Array.from(lineMapData, ([year, gross]) => ({ year, gross }))
        .sort((a, b) => a.year - b.year);

    const xYear = d3.scaleLinear()
        .domain([2010, d3.max(lineData, d => d.year)])
        .range([0, width]);

    const yGross = d3.scaleLinear()
        .domain([0, d3.max(lineData, d => d.gross)])
        .range([height, 0]);

    const line = d3.line()
        .x(d => xYear(d.year))
        .y(d => yGross(d.gross));

    svgLine.append("path")
        .datum(lineData)
        .attr("d", line)
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2)
        .attr("fill", "none");

    // X-axis
    svgLine.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xYear).tickFormat(d3.format("d")));

    // Y-axis
    svgLine.append("g")
        .call(d3.axisLeft(yGross).tickFormat(d => d / 1000000000 + "B"));

    // Title & Labels
    svgLine.append("text")
        .attr("class", "title")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2)
        .text("Trends in Gross Movie Revenue over Time");

    svgLine.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + (margin.bottom / 2))
        .text("Year");

    svgLine.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left / 2)
        .attr("x", -height / 2)
        .text("Total Gross (Billion $)");

    /* ===================== MULTI-LINE CHART (Top 5 Countries' Gross Revenue) ===================== */

    // Aggregate data by country and year
    const grossByCountryYear = d3.rollup(data, 
        v => d3.mean(v, d => d.gross), 
        d => d.country, 
        d => d.year 
    );

    // Calculate average gross revenue per country
    const averageGrossByCountry = Array.from(grossByCountryYear, ([country, years]) => {
        const totalGross = Array.from(years.values()).reduce((sum, gross) => sum + gross, 0);
        return { country, averageGross: totalGross / years.size };
    });

    // Get the top 5 countries
    const topCountries = averageGrossByCountry
        .sort((a, b) => b.averageGross - a.averageGross)
        .slice(0, 5)
        .map(d => d.country);

    // Prepare data for line chart
    const lineDataMulti = topCountries.map(country => {
        const countryData = grossByCountryYear.get(country);
        return {
            country,
            values: Array.from(countryData, ([year, gross]) => ({ year: +year, gross }))
                .filter(d => d.year >= 2010)
                .sort((a, b) => a.year - b.year)
        };
    });

    // X and Y Scales
    const xLine = d3.scaleLinear()
        .domain([2010, d3.max(lineDataMulti, d => d3.max(d.values, v => v.year))])
        .range([0, width]);

    const yLine = d3.scaleLinear()
        .domain([0, d3.max(lineDataMulti, d => d3.max(d.values, v => v.gross))])
        .range([height, 0]);

    const color = d3.scaleOrdinal(d3.schemeCategory10).domain(topCountries);

    const lineMulti = d3.line()
        .x(d => xLine(d.year))
        .y(d => yLine(d.gross));

    // Plot each country's line
    svgMultiLine.selectAll(".line")
        .data(lineDataMulti)
        .enter()
        .append("path")
        .attr("d", d => lineMulti(d.values))
        .attr("stroke", d => color(d.country))
        .attr("fill", "none")
        .attr("stroke-width", 2);

    // X-axis
    svgMultiLine.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xLine).tickFormat(d3.format("d")));

    // Y-axis
    svgMultiLine.append("g")
        .call(d3.axisLeft(yLine).tickFormat(d => d / 1000000 + "M"));

    // Title & Labels
    svgMultiLine.append("text")
        .attr("class", "title")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2)
        .text("Trends in Average Gross Movie Revenue by Country");

    svgMultiLine.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + (margin.bottom / 2))
        .text("Year");

    svgMultiLine.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left / 2)
        .attr("x", -height / 2)
        .text("Average Gross Revenue ($)");

    // Legend
    const legend = svgMultiLine.selectAll(".legend")
        .data(topCountries)
        .enter()
        .append("g")
        .attr("transform", (d, i) => `translate(${width - margin.right * 2},${i * 20})`);

    legend.append("rect").attr("width", 10).attr("height", 10).style("fill", d => color(d));
    legend.append("text").attr("x", 15).attr("y", 10).style("font-size", "12px").text(d => d);
});
