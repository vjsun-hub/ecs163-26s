/*
ECS 163 Homework 3 - Animated Pokemon Type Dashboard
Explores Pokemon through strength versus catch difficulty, average battle stat profiles,
and Legendary typing patterns.
*/

// Pokemon type colors used consistently across all dashboard views.
const typeColors = {
  Water: "#6390F0",
  Normal: "#A8A77A",
  Grass: "#7AC74C",
  Bug: "#A6B91A",
  Fire: "#EE8130",
  Psychic: "#F95587",
  Rock: "#B6A136",
  Electric: "#FFD700",
  Ground: "#E2BF65",
  Poison: "#A33EA1",
  Dark: "#705746",
  Fighting: "#C22E28",
  Dragon: "#6F35FC",
  Ghost: "#735797",
  Ice: "#96D9D6",
  Steel: "#B7B7CE",
  Fairy: "#D685AD",
  Flying: "#8497F0",
  None: "#CCCCCC"
};

// Legendary Pokemon use a dark-gold-silver palette so they stand apart from Electric yellow.
const legendaryColors = {
  dark: "#1A1D20",
  gold: "#D4AF37",
  silver: "#E5E8F0",
  outline: "#D4AF37"
};

// Shared tooltip used by all visualizations.
const tooltip = d3.select("#tooltip");

let dashboardData = [];
let brushedRowIds = null;
let selectedType = null;
let updateScatterSelection = function() {};
let updateHeatmapView = function() {};
let updateSankeyView = function() {};

function pokemonHasType(pokemon, type) {
  return pokemon.Type_1 === type || pokemon.Type_2 === type;
}

function currentFocusData() {
  if (!brushedRowIds) {
    return dashboardData;
  }

  return dashboardData.filter(d => brushedRowIds.has(d.RowIndex));
}

function updateDashboardHighlights() {
  updateScatterSelection();
  updateHeatmapView(currentFocusData());
  updateSankeyView(currentFocusData());
}

// Load and normalize the Pokemon data before drawing the dashboard views.
d3.csv("data/pokemon.csv").then(function(data) {
  data.forEach((d, i) => {
    d.RowIndex = i;
    d.Total = +d.Total;
    d.HP = +d.HP;
    d.Attack = +d.Attack;
    d.Defense = +d.Defense;
    d.Sp_Atk = +d.Sp_Atk;
    d.Sp_Def = +d.Sp_Def;
    d.Speed = +d.Speed;
    d.Catch_Rate = +d.Catch_Rate;
    d.isLegendary = d.isLegendary === "true" || d.isLegendary === "True" || d.isLegendary === "1";
    d.Type_2 = d.Type_2 && d.Type_2.trim() !== "" ? d.Type_2 : "None";
  });

  dashboardData = data;
  drawStrengthCatchScatterplot(data);
  drawTypeStatHeatmap(data);
  drawLegendarySankey(data);
});

// View 1: Context view showing every Pokemon by strength and catch difficulty.
function drawStrengthCatchScatterplot(data) {
  const container = d3.select("#chart1");
  container.selectAll("*").remove();

  const margin = { top: 58, right: 30, bottom: 68, left: 70 };
  const outerWidth = 800;
  const outerHeight = 330;
  const width = outerWidth - margin.left - margin.right;
  const height = outerHeight - margin.top - margin.bottom;

  // SVG canvas for the strength/catch overview scatterplot.
  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${outerWidth} ${outerHeight}`);

  const defs = svg.append("defs");
  const legendaryPointGradient = defs.append("radialGradient")
    .attr("id", "legendary-point-gradient")
    .attr("cx", "36%")
    .attr("cy", "30%")
    .attr("r", "76%");

  [
    { offset: "0%", color: legendaryColors.silver },
    { offset: "50%", color: legendaryColors.gold },
    { offset: "100%", color: legendaryColors.dark }
  ].forEach(stop => {
    legendaryPointGradient.append("stop")
      .attr("offset", stop.offset)
      .attr("stop-color", stop.color);
  });

  // Plot group translated inside the scatterplot margins.
  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.Catch_Rate))
    .nice()
    .range([0, width])
    .clamp(true);

  const [minCatchRate, maxCatchRate] = x.domain();
  const jitteredCatchRate = d => {
    const jitter = (((d.RowIndex * 37) % 100) / 100 - 0.5) * 9;
    return Math.max(minCatchRate, Math.min(maxCatchRate, d.Catch_Rate + jitter));
  };

  const y = d3.scaleLinear()
    .domain(d3.extent(data, d => d.Total))
    .nice()
    .range([height, 0]);

  // Chart title identifying the overview view.
  svg.append("text")
    .attr("x", margin.left)
    .attr("y", 24)
    .attr("font-size", "24px")
    .attr("font-weight", "bold")
    .text("Strength vs. Catch Difficulty");

  svg.append("text")
    .attr("x", margin.left)
    .attr("y", 43)
    .attr("font-size", "16px")
    .attr("fill", "#555")
    .text("Legendary Pokemon tend to be stronger and harder to catch.");

  // Light gridlines help compare each Pokemon's total stats and catch rate.
  g.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(5).tickSize(-height).tickFormat(""))
    .call(grid => grid.select(".domain").remove())
    .call(grid => grid.selectAll("line").attr("stroke", "rgba(0,0,0,0.11)"));

  g.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(""))
    .call(grid => grid.select(".domain").remove())
    .call(grid => grid.selectAll("line").attr("stroke", "rgba(0,0,0,0.11)"));

  const brush = d3.brush()
    .extent([[0, 0], [width, height]])
    .on("brush", function(event) {
      if (!event.selection) {
        brushedRowIds = null;
      } else {
        const [[x0, y0], [x1, y1]] = event.selection;
        brushedRowIds = new Set(data
          .filter(d => {
            const px = x(jitteredCatchRate(d));
            const py = y(d.Total);
            return x0 <= px && px <= x1 && y0 <= py && py <= y1;
          })
          .map(d => d.RowIndex));
      }
      updateScatterSelection();
    })
    .on("end", function(event) {
      if (!event.selection) {
        brushedRowIds = null;
      }
      updateDashboardHighlights();
    });

  const brushLayer = g.append("g")
    .attr("class", "scatter-brush")
    .call(brush);

  brushLayer.selectAll(".overlay")
    .attr("cursor", "crosshair");

  brushLayer.selectAll(".selection")
    .attr("fill", legendaryColors.gold)
    .attr("fill-opacity", 0.14)
    .attr("stroke", legendaryColors.dark)
    .attr("stroke-width", 1.1);

  // Legend container for Legendary highlighting.
  const legend = svg.append("g")
    .attr("transform", `translate(${margin.left + width - 164}, 58)`);

  // Legend background box for readability over the plotted points.
  legend.append("rect")
    .attr("width", 164)
    .attr("height", 58)
    .attr("rx", 6)
    .attr("fill", "rgba(255,255,255,0.86)")
    .attr("stroke", "#ccc");

  // Legend title.
  legend.append("text")
    .attr("x", 8)
    .attr("y", 16)
    .attr("font-size", "14px")
    .attr("font-weight", "bold")
    .text("Legend");

  legend.append("circle")
    .attr("cx", 14)
    .attr("cy", 28)
    .attr("r", 4.2)
    .attr("fill", "#56616D")
    .attr("opacity", 0.58)
    .attr("stroke", "#4B535C")
    .attr("stroke-width", 0.5);

  legend.append("text")
    .attr("x", 26)
    .attr("y", 32)
    .attr("font-size", "12px")
    .text("Non-Legendary");

  legend.append("circle")
    .attr("cx", 14)
    .attr("cy", 46)
    .attr("r", 5.5)
    .attr("fill", "url(#legendary-point-gradient)")
    .attr("stroke", legendaryColors.outline)
    .attr("stroke-width", 2);

  legend.append("text")
    .attr("x", 26)
    .attr("y", 50)
    .attr("font-size", "12px")
    .text("Legendary");

  // Points show individual Pokemon, with Legendary Pokemon highlighted in the Legendary palette.
  const points = g.selectAll(".pokemon-point")
    .data([...data].sort((a, b) => d3.ascending(Number(a.isLegendary), Number(b.isLegendary))))
    .enter()
    .append("circle")
    .attr("class", "pokemon-point")
    .attr("cx", d => x(jitteredCatchRate(d)))
    .attr("cy", d => y(d.Total))
    .attr("r", 0)
    .attr("fill", d => d.isLegendary ? "url(#legendary-point-gradient)" : "#56616D")
    .attr("stroke", d => d.isLegendary ? legendaryColors.outline : "#4B535C")
    .attr("stroke-width", d => d.isLegendary ? 2.1 : 0.5)
    .attr("opacity", d => d.isLegendary ? 0.98 : 0.56)
    .on("mousemove", function(event, d) {
      tooltip
        .style("opacity", 1)
        .style("left", event.pageX + 12 + "px")
        .style("top", event.pageY - 28 + "px")
        .html(
          `<strong>${d.Name}</strong><br>
          Type: ${d.Type_1}${d.Type_2 !== "None" ? " / " + d.Type_2 : ""}<br>
          Total stats: ${d.Total}<br>
          Catch rate: ${d.Catch_Rate}<br>
          ${d.isLegendary ? "Legendary Pokemon" : "Non-Legendary Pokemon"}`
        );
    })
    .on("mouseleave", function() {
      tooltip.style("opacity", 0);
    });

  points
    .transition()
    .duration(700)
    .delay(d => d.isLegendary ? 180 : 0)
    .attr("r", d => d.isLegendary ? 5.8 : 3.35);

  updateScatterSelection = function() {
    points.interrupt("highlight")
      .transition("highlight")
      .duration(600)
      .ease(d3.easeCubicOut)
      .attr("opacity", d => {
        const inBrush = !brushedRowIds || brushedRowIds.has(d.RowIndex);
        const inType = !selectedType || pokemonHasType(d, selectedType);
        if (inBrush && inType) {
          return d.isLegendary ? 0.98 : 0.62;
        }
        if (inBrush || inType) {
          return 0.25;
        }
        return 0.08;
      })
      .attr("stroke-width", d => {
        if (selectedType && pokemonHasType(d, selectedType)) {
          return d.isLegendary ? 2.6 : 1.35;
        }
        return d.isLegendary ? 2.1 : 0.5;
      })
      .attr("r", d => {
        const inBrush = !brushedRowIds || brushedRowIds.has(d.RowIndex);
        const inType = !selectedType || pokemonHasType(d, selectedType);
        if (inBrush && inType) {
          return d.isLegendary ? 6.4 : 4.15;
        }
        return d.isLegendary ? 4.8 : 2.55;
      });
  };

  // X-axis showing catch rate values; lower values are harder to catch.
  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("font-size", "14px");

  // Y-axis showing each Pokemon's total battle stats.
  g.append("g")
    .call(d3.axisLeft(y).ticks(5));

  // Y-axis label for total stat values.
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -margin.top - height / 2)
    .attr("y", 28)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("font-weight", "bold")
    .text("Total Battle Stats");

  // X-axis label for catch rate values.
  svg.append("text")
    .attr("x", margin.left + width / 2)
    .attr("y", margin.top + height + 48)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("font-weight", "bold")
    .text("Catch Rate (lower = harder to catch)");
}

// View 2: Focus view comparing average battle stats for each primary type.
function drawTypeStatHeatmap(data) {
  const container = d3.select("#chart2");
  container.selectAll("*").remove();

  const margin = { top: 76, right: 78, bottom: 60, left: 108 };
  const width = 680 - margin.left - margin.right;
  const height = 690 - margin.top - margin.bottom;
  const stats = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];
  const statLabels = {
    HP: "HP",
    Attack: "Attack",
    Defense: "Defense",
    Sp_Atk: "Sp. Atk",
    Sp_Def: "Sp. Def",
    Speed: "Speed"
  };

  const typeStats = d3.rollups(
    data,
    values => {
      const summary = { type: values[0].Type_1, count: values.length };
      stats.forEach(stat => {
        summary[stat] = d3.mean(values, d => d[stat]);
      });
      return summary;
    },
    d => d.Type_1
  )
    .map(d => d[1])
    .sort((a, b) => d3.descending(d3.mean(stats, stat => a[stat]), d3.mean(stats, stat => b[stat])));

  function buildHeatmapCells(focusData) {
    const valuesByType = d3.group(focusData, d => d.Type_1);

    return typeStats.flatMap(typeRow => {
      const values = valuesByType.get(typeRow.type) || [];
      return stats.map(stat => ({
        type: typeRow.type,
        stat,
        value: values.length ? d3.mean(values, d => d[stat]) : null,
        count: values.length
      }));
    });
  }

  const heatmapCells = buildHeatmapCells(data);

  // SVG canvas for the type-by-stat heatmap.
  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`);

  // Plot group translated inside the heatmap margins.
  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand()
    .domain(stats)
    .range([0, width])
    .padding(0.05);

  const y = d3.scaleBand()
    .domain(typeStats.map(d => d.type))
    .range([0, height])
    .padding(0.05);

  const color = d3.scaleSequential()
    .domain(d3.extent(heatmapCells, d => d.value))
    .interpolator(d3.interpolateYlGnBu);

  // Chart title identifying the heatmap focus view.
  svg.append("text")
    .attr("x", margin.left)
    .attr("y", 28)
    .attr("font-size", "24px")
    .attr("font-weight", "bold")
    .text("Average Battle Stats by Primary Type");

  // Subtitle explaining the heatmap color encoding.
  svg.append("text")
    .attr("x", margin.left)
    .attr("y", 49)
    .attr("font-size", "16px")
    .attr("fill", "#555")
    .text("Darker cells indicate higher average stat values for that primary type.");

  // Heatmap cells showing average stat value for each primary-type/stat pair.
  const cells = g.selectAll(".heatmap-cell")
    .data(heatmapCells)
    .enter()
    .append("rect")
    .attr("class", "heatmap-cell")
    .attr("x", d => x(d.stat))
    .attr("y", d => y(d.type))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("fill", d => d.value === null ? "#F1F1F1" : color(d.value))
    .attr("opacity", 0)
    .attr("stroke", d => selectedType === d.type ? legendaryColors.dark : "rgba(255,255,255,0.8)")
    .attr("stroke-width", 1)
    .on("click", function(event, d) {
      event.stopPropagation();
      selectedType = selectedType === d.type ? null : d.type;
      updateDashboardHighlights();
    })
    .on("mousemove", function(event, d) {
      const valueText = d.value === null
        ? "No Pokemon in current selection"
        : `${statLabels[d.stat]} average: ${d.value.toFixed(1)}`;
      tooltip
        .style("opacity", 1)
        .style("left", event.pageX + 12 + "px")
        .style("top", event.pageY - 28 + "px")
        .html(
          `<strong>${d.type}</strong><br>
          ${valueText}<br>
          Pokemon count: ${d.count}`
        );
    })
    .on("mouseleave", function() {
      tooltip.style("opacity", 0);
    });

  cells.transition()
    .duration(650)
    .delay((d, i) => i * 7)
    .attr("opacity", d => d.value === null ? 0.28 : 1);

  // X-axis showing battle stat names.
  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d => statLabels[d]))
    .selectAll("text")
    .attr("font-size", "13px")
    .attr("transform", "rotate(-22)")
    .style("text-anchor", "end");

  // Y-axis showing primary types.
  const yAxis = g.append("g")
    .attr("class", "heatmap-y-axis")
    .call(d3.axisLeft(y))
    .selectAll("text")
    .attr("font-size", "13px")
    .style("cursor", "pointer")
    .on("click", function(event, type) {
      event.stopPropagation();
      selectedType = selectedType === type ? null : type;
      updateDashboardHighlights();
    });

  // X-axis label for battle stat columns.
  svg.append("text")
    .attr("x", margin.left + width / 2)
    .attr("y", margin.top + height + 50)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("font-weight", "bold")
    .text("Battle Stat");

  // Y-axis label for primary type rows.
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -margin.top - height / 2)
    .attr("y", 38)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("font-weight", "bold")
    .text("Primary Type");

  const legendWidth = 14;
  const legendHeight = 180;
  const legendX = margin.left + width + 28;
  const legendY = margin.top + 38;
  const legendScale = d3.scaleLinear()
    .domain(color.domain())
    .range([legendHeight, 0]);
  const legendTicks = Array.from(new Set([
    color.domain()[0],
    ...legendScale.ticks(4),
    color.domain()[1]
  ])).sort((a, b) => a - b);

  // SVG defs holding the heatmap legend gradient.
  const defs = svg.append("defs");

  // Linear gradient used by the average-stat legend.
  const gradient = defs.append("linearGradient")
    .attr("id", "stat-heatmap-gradient")
    .attr("x1", "0%")
    .attr("x2", "0%")
    .attr("y1", "100%")
    .attr("y2", "0%");

  d3.range(0, 1.01, 0.1).forEach(t => {
    const value = color.domain()[0] + t * (color.domain()[1] - color.domain()[0]);

    // Gradient stop matching the heatmap color scale.
    gradient.append("stop")
      .attr("offset", `${t * 100}%`)
      .attr("stop-color", color(value));
  });

  // Legend group for average stat color values.
  const legend = svg.append("g")
    .attr("transform", `translate(${legendX},${legendY})`);

  // Legend title.
  legend.append("text")
    .attr("x", 0)
    .attr("y", -24)
    .attr("font-size", "14px")
    .attr("font-weight", "bold")
    .text("Legend");

  // Legend subtitle kept beside the gradient instead of floating below the chart.
  legend.append("text")
    .attr("x", 0)
    .attr("y", -10)
    .attr("font-size", "12px")
    .text("Avg. stat");

  // Color ramp showing low-to-high average stat values.
  legend.append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .attr("fill", "url(#stat-heatmap-gradient)")
    .attr("stroke", "#999");

  // Numeric legend axis for average stat values.
  legend.append("g")
    .attr("transform", `translate(${legendWidth},0)`)
    .call(d3.axisRight(legendScale)
      .tickValues(legendTicks)
      .tickFormat(d3.format(".0f")));

  updateHeatmapView = function(focusData) {
    const updatedCells = buildHeatmapCells(focusData);

    cells.data(updatedCells, d => `${d.type}-${d.stat}`)
      .transition()
      .duration(950)
      .ease(d3.easeCubicInOut)
      .attr("fill", d => d.value === null ? "#F1F1F1" : color(d.value))
      .attr("opacity", d => {
        if (d.value === null) {
          return 0.22;
        }
        return !selectedType || selectedType === d.type ? 1 : 0.42;
      })
      .attr("stroke", d => selectedType === d.type ? legendaryColors.dark : "rgba(255,255,255,0.8)")
      .attr("stroke-width", d => {
        if (selectedType === d.type) {
          return 2.4;
        }
        return brushedRowIds && d.count > 0 ? 1.6 : 1;
      });

    d3.selectAll(".heatmap-y-axis text")
      .transition()
      .duration(600)
      .attr("fill", d => !selectedType || selectedType === d ? "#222" : "#777")
      .attr("font-weight", d => selectedType === d ? "bold" : "normal");
  };
}

// View 3: Advanced view showing Legendary Pokemon flow from primary type to secondary type.
function drawLegendarySankey(data) {
  const container = d3.select("#chart3");
  container.selectAll("*").remove();

  const margin = { top: 48, right: 24, bottom: 18, left: 18 };
  const outerWidth = 700;
  const outerHeight = 330;
  const width = outerWidth - margin.left - margin.right;
  const height = outerHeight - margin.top - margin.bottom;

  // SVG canvas for the Legendary typing Sankey diagram.
  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${outerWidth} ${outerHeight}`);

  // SVG defs holding the repeating Legendary gradient.
  const defs = svg.append("defs");

  // Larger repeat distance keeps the node from looking striped while preserving the shimmer.
  const legendaryGradient = defs.append("linearGradient")
    .attr("id", "legendary-gradient")
    .attr("gradientUnits", "objectBoundingBox")
    .attr("spreadMethod", "repeat")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", 1)
    .attr("y2", 0.72);

  [
    { offset: "0%", color: legendaryColors.dark },
    { offset: "40%", color: legendaryColors.gold },
    { offset: "75%", color: legendaryColors.silver },
    { offset: "100%", color: legendaryColors.dark }
  ].forEach(stop => {
    legendaryGradient.append("stop")
      .attr("offset", stop.offset)
      .attr("stop-color", stop.color);
  });

  // Plot group translated inside the Sankey margins.
  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Chart title identifying the advanced view.
  svg.append("text")
    .attr("x", margin.left)
    .attr("y", 24)
    .attr("font-size", "22px")
    .attr("font-weight", "bold")
    .text("Legendary Pokemon Typing Flow");

  // Subtitle explaining the Sankey path direction.
  svg.append("text")
    .attr("x", margin.left)
    .attr("y", 42)
    .attr("font-size", "14px")
    .attr("fill", "#555")
    .text("Flow shows Primary Type to Secondary Type to Legendary status.");

  const sankey = d3.sankey()
    .nodeWidth(12)
    .nodePadding(7)
    .extent([[0, 0], [width, height]]);

  function nodeColor(name) {
    if (name === "Legendary") {
      return "url(#legendary-gradient)";
    }

    const cleanName = name.replace("Primary: ", "").replace("Secondary: ", "");
    return typeColors[cleanName] || "#BBBBBB";
  }

  function cleanNodeName(name) {
    return name.replace("Primary: ", "").replace("Secondary: ", "");
  }

  function nodeMatchesSelectedType(name) {
    return selectedType && cleanNodeName(name) === selectedType;
  }

  function drawEmptySankeyMessage() {
    const emptyState = svg.append("g")
      .attr("class", "sankey-empty-state")
      .attr("transform", `translate(${outerWidth / 2},${margin.top + height / 2})`)
      .attr("opacity", 0);

    emptyState.append("rect")
      .attr("x", -190)
      .attr("y", -48)
      .attr("width", 380)
      .attr("height", 96)
      .attr("rx", 8)
      .attr("fill", "rgba(255,255,255,0.90)")
      .attr("stroke", "#bbb");

    emptyState.append("text")
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .attr("font-size", "19px")
      .attr("font-weight", "bold")
      .attr("fill", "#333")
      .text("No Legendary Pokemon selected");

    emptyState.append("text")
      .attr("y", 22)
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .attr("fill", "#666")
      .text("Try brushing a different part of the scatterplot.");

    emptyState.transition()
      .duration(450)
      .attr("opacity", 1);
  }

  function handleSankeyTypeClick(event, d) {
    event.stopPropagation();
    const type = cleanNodeName(d.name);

    if (type !== "Legendary") {
      selectedType = selectedType === type ? null : type;
      updateDashboardHighlights();
    }
  }

  function buildSankeyGraph(focusData) {
    const legendaryData = focusData.filter(d => d.isLegendary);
    const links = [];

    d3.rollups(legendaryData, v => v.length, d => `Primary: ${d.Type_1}`, d => `Secondary: ${d.Type_2}`)
      .forEach(([source, targets]) => {
        targets.forEach(([target, value]) => links.push({ source, target, value }));
      });

    d3.rollups(legendaryData, v => v.length, d => `Secondary: ${d.Type_2}`, d => "Legendary")
      .forEach(([source, targets]) => {
        targets.forEach(([target, value]) => links.push({ source, target, value }));
      });

    const nodeNames = Array.from(new Set(links.flatMap(d => [d.source, d.target])));
    const nodes = nodeNames.map(name => ({ name }));
    const nodeIndex = new Map(nodes.map((d, i) => [d.name, i]));
    const sankeyLinks = links.map(d => ({
      source: nodeIndex.get(d.source),
      target: nodeIndex.get(d.target),
      value: d.value
    }));

    return sankey({
      nodes: nodes.map(d => Object.assign({}, d)),
      links: sankeyLinks.map(d => Object.assign({}, d))
    });
  }

  const legendaryCount = data.filter(d => d.isLegendary).length;

  if (legendaryCount === 0) {
    drawEmptySankeyMessage();

    updateSankeyView = function(focusData) {
      if (!focusData.some(d => d.isLegendary)) {
        drawLegendarySankey(focusData);
        return;
      }

      const currentSvg = container.select("svg");
      if (currentSvg.empty()) {
        drawLegendarySankey(focusData);
        return;
      }

      currentSvg.transition()
        .duration(220)
        .style("opacity", 0)
        .on("end", function() {
          drawLegendarySankey(focusData);
        });
    };
    return;
  }

  const graph = buildSankeyGraph(data);

  // Sankey links whose thickness encodes the number of Legendary Pokemon in each flow.
  const link = g.append("g")
    .selectAll("path")
    .data(graph.links)
    .enter()
    .append("path")
    .attr("d", d3.sankeyLinkHorizontal())
    .attr("stroke", d => nodeColor(d.source.name))
    .attr("stroke-width", 0)
    .attr("fill", "none")
    .attr("opacity", d => {
      if (!selectedType) {
        return 0.34;
      }
      return nodeMatchesSelectedType(d.source.name) || nodeMatchesSelectedType(d.target.name) ? 0.58 : 0.08;
    })
    .on("mousemove", function(event, d) {
      tooltip
        .style("opacity", 1)
        .style("left", event.pageX + 12 + "px")
        .style("top", event.pageY - 28 + "px")
        .html(
          `<strong>${d.source.name}</strong> to <strong>${d.target.name}</strong><br>
          ${d.value} Legendary Pokemon`
        );
    })
    .on("mouseleave", function() {
      tooltip.style("opacity", 0);
    });

  link.transition()
    .duration(700)
    .delay((d, i) => i * 10)
    .ease(d3.easeCubicOut)
    .attr("stroke-width", d => Math.max(1, d.width));

  // Node groups for primary types, secondary types, and the final Legendary status.
  const node = g.append("g")
    .selectAll("g")
    .data(graph.nodes)
    .enter()
    .append("g")
    .style("cursor", d => cleanNodeName(d.name) === "Legendary" ? "default" : "pointer")
    .on("click", handleSankeyTypeClick);

  // Node rectangles colored by type or Legendary status.
  node.append("rect")
    .attr("x", d => d.x0)
    .attr("y", d => d.y0)
    .attr("height", d => d.y1 - d.y0)
    .attr("width", d => d.x1 - d.x0)
    .attr("fill", d => nodeColor(d.name))
    .attr("stroke", "#333")
    .attr("stroke-width", d => nodeMatchesSelectedType(d.name) ? 2 : 0.5)
    .attr("opacity", d => {
      if (!selectedType || d.name === "Legendary" || nodeMatchesSelectedType(d.name)) {
        return 1;
      }
      return 0.28;
    })
    .on("mousemove", function(event, d) {
      tooltip
        .style("opacity", 1)
        .style("left", event.pageX + 12 + "px")
        .style("top", event.pageY - 28 + "px")
        .html(`<strong>${d.name}</strong><br>Value: ${d.value}`);
    })
    .on("mouseleave", function() {
      tooltip.style("opacity", 0);
    });

  // Node labels placed beside type nodes and above the final Legendary node.
  node.append("text")
    .attr("x", function(d) {
      if (d.name === "Legendary") {
        return (d.x0 + d.x1) / 2;
      }
      return d.x0 < width / 2 ? d.x1 + 5 : d.x0 - 5;
    })
    .attr("y", function(d) {
      if (d.name === "Legendary") {
        return d.y0 - 7;
      }
      return (d.y0 + d.y1) / 2;
    })
    .attr("dy", "0.35em")
    .attr("text-anchor", function(d) {
      if (d.name === "Legendary") {
        return "middle";
      }
      return d.x0 < width / 2 ? "start" : "end";
    })
    .attr("font-size", "11px")
    .attr("fill", d => !selectedType || d.name === "Legendary" || nodeMatchesSelectedType(d.name) ? "#222" : "#777")
    .attr("font-weight", d => nodeMatchesSelectedType(d.name) ? "bold" : "normal")
    .text(d => cleanNodeName(d.name));

  // Compact Sankey legend group kept in the lower-right corner.
  const legend = svg.append("g")
    .attr("transform", `translate(${margin.left + width - 102}, ${margin.top + height - 42})`);

  // Legend background box for readability over links.
  legend.append("rect")
    .attr("width", 114)
    .attr("height", 46)
    .attr("rx", 6)
    .attr("fill", "rgba(255,255,255,0.86)")
    .attr("stroke", "#ccc");

  // Legend title.
  legend.append("text")
    .attr("x", 7)
    .attr("y", 12)
    .attr("font-size", "12px")
    .attr("font-weight", "bold")
    .text("Legend");

  // Legend swatch for Pokemon type colors.
  legend.append("rect")
    .attr("x", 7)
    .attr("y", 17)
    .attr("width", 10)
    .attr("height", 10)
    .attr("fill", "#6390F0")
    .attr("stroke", "#333")
    .attr("stroke-width", 0.5);

  // Legend label for type colors.
  legend.append("text")
    .attr("x", 23)
    .attr("y", 26)
    .attr("font-size", "11px")
    .text("Type color");

  // Legend swatch for Legendary status.
  legend.append("rect")
    .attr("x", 7)
    .attr("y", 31)
    .attr("width", 10)
    .attr("height", 10)
    .attr("fill", "url(#legendary-gradient)")
    .attr("stroke", "#333")
    .attr("stroke-width", 0.5);

  // Legend label for Legendary status.
  legend.append("text")
    .attr("x", 23)
    .attr("y", 40)
    .attr("font-size", "11px")
    .text("Legendary");

  updateSankeyView = function(focusData) {
    if (!focusData.some(d => d.isLegendary)) {
      drawLegendarySankey(focusData);
      return;
    }

    const currentSvg = container.select("svg");
    if (currentSvg.empty()) {
      drawLegendarySankey(focusData);
      return;
    }

    currentSvg.transition()
      .duration(220)
      .style("opacity", 0)
      .on("end", function() {
        drawLegendarySankey(focusData);
      });
  };
}
