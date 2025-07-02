import * as d3 from 'd3';
import { BarChart } from './barChart';
import { ScatterPlot } from './scatterPlot';

class App {
    private barChart: BarChart;
    private scatterPlot: ScatterPlot;

    constructor() {
        this.barChart = new BarChart('#bar-chart');
        this.scatterPlot = new ScatterPlot('#scatter-plot');
        this.initializeNavigation();
        this.initializeControls();
        
        this.barChart.render();
    }

    private initializeNavigation(): void {
        const barChartBtn = d3.select('#bar-chart-btn');
        const scatterPlotBtn = d3.select('#scatter-plot-btn');
        const barChartDemo = d3.select('#bar-chart-demo');
        const scatterPlotDemo = d3.select('#scatter-plot-demo');

        barChartBtn.on('click', () => {
            d3.selectAll('.nav-btn').classed('active', false);
            d3.selectAll('.demo-section').classed('active', false);
            
            barChartBtn.classed('active', true);
            barChartDemo.classed('active', true);
            
            this.barChart.render();
        });

        scatterPlotBtn.on('click', () => {
            d3.selectAll('.nav-btn').classed('active', false);
            d3.selectAll('.demo-section').classed('active', false);
            
            scatterPlotBtn.classed('active', true);
            scatterPlotDemo.classed('active', true);
            
            this.scatterPlot.render();
        });
    }

    private initializeControls(): void {
        const dataSelect = d3.select('#data-select');
        dataSelect.on('change', () => {
            const selectedDataset = (dataSelect.node() as HTMLSelectElement).value;
            this.barChart.updateData(selectedDataset);
        });

        const colorScaleSelect = d3.select('#color-scale');
        colorScaleSelect.on('change', () => {
            const selectedScale = (colorScaleSelect.node() as HTMLSelectElement).value;
            this.scatterPlot.updateColorScale(selectedScale);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new App();
});