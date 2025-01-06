'use client';

import React, { useState } from "react";
import Plot from "react-plotly.js";
import { Layout, PlotMouseEvent, PlotData } from "plotly.js";

interface GraphConfig {
  name: string;
  xaxis: string[];
  xaxistitle: string;
  yaxis: number[];
  yaxistitle: string;
  text?: string[];
  type?: "scatter" | "bar"; // Support multiple chart types
  slider?: boolean;
}

interface LineChartProps {
  numberOfGraphs: number;
  graphs: GraphConfig[];
  size?: { width: number | string ; height: number | string };
  onClick?: (event: Readonly<PlotMouseEvent>) => void;
}

const LineChart: React.FC<LineChartProps> = ({ numberOfGraphs, graphs, size, onClick }) => {
  const [hoveredX, setHoveredX] = useState<string | null>(null);
  const plotData: Partial<PlotData>[] = graphs.slice(0, numberOfGraphs).flatMap((graph, index) => {
    const baseData: Partial<PlotData> = {
      x: graph.xaxis,
      y: graph.yaxis,
      type: graph.type,
      mode: graph.type === "scatter" ? "lines+markers" : undefined,
      name: graph.name,
      line: {
        color: index === 0 ? "url(#primaryGradient)" : "url(#secondaryGradient)",
        width: 2,
        shape: "spline",
      },
      marker: {
        color: index === 0 ? "#54CEEE" : "#FB923C",
        size: 6,
      },
      fill: "tozeroy",
      fillcolor: graph.type === "scatter" ? "rgba(84, 206, 238, 0.8)" : undefined,
    };

    const scatterDots: Partial<PlotData> = {
      x: graph.xaxis,
      y: graph.yaxis,
      type: "scatter",
      mode: "text+markers",
      text: graph.text,
      textposition: "bottom center",
      textfont: {
        color: "white",
        size: 12,
        family: "Arial, sans-serif",
        weight: 700,
        
      },
      name: `${graph.name} (Labels)`,
      marker: {
        color: index === 0 ? "#54CEEE" : "#FB923C",
        size: 8,
        symbol: "circle",
      },
      hoverinfo: "text",
      showlegend: false,
    };

    return [baseData, scatterDots];
  });

  const layout: Partial<Layout> = {
    margin: {
      l: 100, // Adjust for Y-axis title
      r: 60,  // Adjust for legend or extra spacing
      t: 0,  // Top margin
      b: 100,  // Adjust for X-axis title
    },
    xaxis: {
      title: graphs[0]?.xaxistitle || "X-Axis",
      color: "white",
      showgrid: false,
      rangeslider: {
        visible: graphs[0]?.slider?? false,
      },
      autorange: true,
      range: [graphs[0]?.xaxis[0], graphs[0]?.xaxis[10] || graphs[0]?.xaxis[graphs[0].xaxis.length - 1]], // Initial visible range
    },
    yaxis: {
      title: graphs[0]?.yaxistitle || "Y-Axis",
      color: "white",
      showgrid: false,
      separatethousands: true,
    },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    legend: {
      x: 1,
      xanchor: "right",
      y: 1.2,
      font: {
        color: "white",
        size: Math.max(typeof size?.width === 'number' ? size.width * 0.01 : 0, 10)
      },
      bgcolor: "rgba(0,0,0,0)",
    },
    shapes: hoveredX
      ? [
          {
            type: "line",
            x0: hoveredX,
            x1: hoveredX,
            y0: 0,
            y1: 1,
            xref: "x",
            yref: "paper",
            line: {
              color: "rgba(255, 255, 255, 0.5)",
              width: 2,
              dash: "dot",
            },
          },
        ]
      : [],
  };  

  const handleHover = (event: Readonly<PlotMouseEvent>) => {
    if (event.points && event.points[0]) {
      setHoveredX(event.points[0].x as string);
    }
  };

  const handleUnhover = () => {
    setHoveredX(null);
  };

  return (
    <div className="w-full h-full">
      <svg width="0" height="0">
        <defs>
          <linearGradient id="primaryGradient" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#54CEEE" />
            <stop offset="100%" stopColor="#35A4E0" />
          </linearGradient>
          <linearGradient id="secondaryGradient" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#FB923C" />
            <stop offset="100%" stopColor="#EA580C" />
          </linearGradient>
        </defs>
      </svg>
      <Plot
        data={plotData}
        layout={layout}
        style={{ width: size?.width, height: size?.height }}
        useResizeHandler={true}
        onHover={handleHover}
        onUnhover={handleUnhover}
        onClick={onClick}
      />
    </div>
  );
};

export default LineChart;