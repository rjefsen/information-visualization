import * as d3 from 'd3';
import { ScatterPlot } from './scatterPlot';

interface CorrelationData {
    variable1: string;
    variable2: string;
    correlation: number;
}

export class CorrelationMatrix {
    private container: d3.Selection<HTMLElement, unknown, HTMLElement, any>;
    private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
    private width: number;
    private height: number;
    private margin = { top: 80, right: 80, bottom: 140, left: 120 };
    private data: CorrelationData[] = [];
    private variables: string[] = [];
    private correlationMatrix: number[][] = [];
    private scatterPlot: ScatterPlot;

    constructor(selector: string, scatterSelector: string = '#correlation-scatter') {
        this.container = d3.select(selector);
        console.log('CorrelationMatrix container found:', this.container.size());
        
        const containerElement = this.container.node() as HTMLElement;
        if (!containerElement) {
            console.error('Container element not found for selector:', selector);
            return;
        }
        
        // Use smaller size to fit within frame with margins
        this.width = 400;
        this.height = 400;
        
        this.scatterPlot = new ScatterPlot(scatterSelector);
        this.setupSVG();
        this.initializeData();
    }

    private setupSVG(): void {
        this.svg = this.container
            .append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom);
    }

    private async initializeData(): Promise<void> {
        try {
            const csvData = await d3.csv('/data/Health and Sleep relation 2024/Sleep_health_and_lifestyle_dataset.csv');
            
            this.variables = [
                'Sleep Duration',
                'Quality of Sleep',
                'Physical Activity Level',
                'Stress Level',
                'Heart Rate',
                'Daily Steps'
            ];

            const numericData: { [key: string]: number[] } = {};
            this.variables.forEach(variable => {
                numericData[variable] = csvData.map(d => +d[variable]).filter(v => !isNaN(v));
            });

            this.correlationMatrix = [];
            this.data = [];

            for (let i = 0; i < this.variables.length; i++) {
                this.correlationMatrix[i] = [];
                for (let j = 0; j < this.variables.length; j++) {
                    const correlation = this.calculateCorrelation(
                        numericData[this.variables[i]], 
                        numericData[this.variables[j]]
                    );
                    this.correlationMatrix[i][j] = correlation;
                    
                    this.data.push({
                        variable1: this.variables[i],
                        variable2: this.variables[j],
                        correlation: correlation
                    });
                }
            }
        } catch (error) {
            console.error('Error loading CSV data:', error);
            this.variables = ['Error'];
            this.correlationMatrix = [[0]];
            this.data = [{ variable1: 'Error', variable2: 'Error', correlation: 0 }];
        }
    }

    private calculateCorrelation(x: number[], y: number[]): number {
        const n = Math.min(x.length, y.length);
        const pairedData = x.slice(0, n).map((xi, i) => ({ x: xi, y: y[i] }))
                           .filter(d => !isNaN(d.x) && !isNaN(d.y));
        
        if (pairedData.length < 2) return 0;
        
        const meanX = d3.mean(pairedData, d => d.x) || 0;
        const meanY = d3.mean(pairedData, d => d.y) || 0;
        
        const numerator = d3.sum(pairedData, d => (d.x - meanX) * (d.y - meanY));
        const denomX = Math.sqrt(d3.sum(pairedData, d => Math.pow(d.x - meanX, 2)));
        const denomY = Math.sqrt(d3.sum(pairedData, d => Math.pow(d.y - meanY, 2)));
        
        if (denomX === 0 || denomY === 0) return 0;
        
        return numerator / (denomX * denomY);
    }

    public async render(): Promise<void> {
        if (this.data.length === 0) {
            await this.initializeData();
        }
        this.svg.selectAll('*').remove();

        const g = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        const cellSize = Math.min(this.width, this.height) / this.variables.length;

        const xScale = d3.scaleBand()
            .domain(this.variables)
            .range([0, this.width])
            .padding(0.02);

        const yScale = d3.scaleBand()
            .domain(this.variables)
            .range([0, this.height])
            .padding(0.02);

        const colorScale = d3.scaleSequential()
            .domain([-1, 1])
            .interpolator(t => d3.interpolateRdBu(1 - t));

        g.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0, ${this.height})`)
            .call(d3.axisBottom(xScale).tickSize(0))
            .selectAll('text')
            .style('text-anchor', 'end')
            .attr('dx', '-.8em')
            .attr('dy', '.15em')
            .attr('transform', 'rotate(-45)')
            .style('font-size', '10px');

        g.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(yScale).tickSize(0))
            .selectAll('text')
            .style('font-size', '11px');

        g.selectAll('.x-axis path, .y-axis path').remove();

        const tooltip = d3.select('#tooltip');

        const cells = g.selectAll('.matrix-cell')
            .data(this.data)
            .enter().append('rect')
            .attr('class', 'matrix-cell')
            .attr('x', d => xScale(d.variable1) || 0)
            .attr('y', d => yScale(d.variable2) || 0)
            .attr('width', xScale.bandwidth())
            .attr('height', yScale.bandwidth())
            .attr('fill', d => colorScale(d.correlation))
            .attr('stroke', '#000')
            .attr('stroke-width', 1)
            .attr('opacity', 0);

        cells.transition()
            .duration(1000)
            .delay((d, i) => i * 20)
            .attr('opacity', 1);

        const labels = g.selectAll('.correlation-label')
            .data(this.data)
            .enter().append('text')
            .attr('class', 'correlation-label')
            .attr('x', d => (xScale(d.variable1) || 0) + xScale.bandwidth() / 2)
            .attr('y', d => (yScale(d.variable2) || 0) + yScale.bandwidth() / 2)
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .style('font-size', '10px')
            .style('font-weight', 'bold')
            .style('fill', d => Math.abs(d.correlation) > 0.5 ? '#fff' : '#333')
            .text(d => d.correlation.toFixed(2))
            .attr('opacity', 0);

        labels.transition()
            .duration(1000)
            .delay((d, i) => i * 20 + 500)
            .attr('opacity', 1);

        cells.style('cursor', 'pointer')
            .on('mouseover', (event, d) => {
                const strength = Math.abs(d.correlation);
                let description = '';
                if (strength > 0.7) description = 'Strong';
                else if (strength > 0.4) description = 'Moderate';
                else if (strength > 0.2) description = 'Weak';
                else description = 'Very weak';
                
                const direction = d.correlation > 0 ? 'positive' : 'negative';

                tooltip.classed('visible', true)
                    .html(`
                        <strong>${d.variable1}</strong><br/>
                        <strong>vs ${d.variable2}</strong><br/>
                        Correlation: ${d.correlation.toFixed(3)}<br/>
                        ${description} ${direction} correlation<br/>
                        <em>Click to view scatterplot</em>
                    `)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            })
            .on('mouseout', () => {
                tooltip.classed('visible', false);
            })
            .on('click', async (event, d) => {
                if (d.variable1 !== d.variable2) {
                    const descriptionElement = d3.select('#scatter-description');
                    descriptionElement.text(`Relationship between ${d.variable1} and ${d.variable2}`);
                    
                    await this.scatterPlot.loadData(d.variable1, d.variable2);
                    await this.scatterPlot.render();
                }
            });

        this.addColorLegend(g);
        this.addTitle(g);
    }

    private addColorLegend(g: d3.Selection<SVGGElement, unknown, HTMLElement, any>): void {
        const legendWidth = 200;
        const legendHeight = 20;
        
        const legend = g.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${(this.width - legendWidth) / 2}, ${this.height + 60})`);

        const legendScale = d3.scaleLinear()
            .domain([-1, 1])
            .range([0, legendWidth]);

        const legendAxis = d3.axisBottom(legendScale)
            .ticks(5)
            .tickSize(6)
            .tickFormat(d3.format('.1f'));

        this.svg.select('defs').remove();
        const gradient = this.svg.append('defs')
            .append('linearGradient')
            .attr('id', 'correlation-gradient')
            .attr('x1', '0%')
            .attr('x2', '100%')
            .attr('y1', '0%')
            .attr('y2', '0%');

        gradient.selectAll('stop')
            .data(d3.range(-1, 1.01, 0.1))
            .enter().append('stop')
            .attr('offset', d => `${(d + 1) * 50}%`)
            .attr('stop-color', d => {
                const normalized = (d + 1) / 2;
                return d3.interpolateRdBu(1 - normalized);
            });

        legend.append('rect')
            .attr('width', legendWidth)
            .attr('height', legendHeight)
            .style('fill', 'url(#correlation-gradient)');

        legend.append('g')
            .attr('transform', `translate(0, ${legendHeight})`)
            .call(legendAxis);
    }

    private addTitle(g: d3.Selection<SVGGElement, unknown, HTMLElement, any>): void {
        g.append('text')
            .attr('class', 'matrix-title')
            .attr('x', this.width / 2)
            .attr('y', -30)
            .style('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('font-weight', 'bold')
            .text('Health Metrics Correlation Matrix');
    }
}