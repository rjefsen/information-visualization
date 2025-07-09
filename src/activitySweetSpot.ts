import * as d3 from 'd3';

interface ActivityData {
    activity: number;
    sleepQuality: number;
    stressLevel: number;
    label: string;
}

export class ActivitySweetSpot {
    private container: d3.Selection<HTMLElement, unknown, HTMLElement, any>;
    private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
    private width: number;
    private height: number;
    private margin = { top: 40, right: 100, bottom: 80, left: 80 };
    private data: ActivityData[] = [];

    constructor(selector: string) {
        this.container = d3.select(selector);
        this.width = 650 - this.margin.left - this.margin.right;
        this.height = 450 - this.margin.top - this.margin.bottom;
        
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
            
            this.data = csvData.map(d => ({
                activity: +d['Physical Activity Level'],
                sleepQuality: +d['Quality of Sleep'],
                stressLevel: +d['Stress Level'],
                label: `${d.Occupation} (Age: ${d.Age})`
            }));
        } catch (error) {
            console.error('Error loading CSV data:', error);
            this.data = [{ activity: 0, sleepQuality: 0, stressLevel: 0, label: 'Error' }];
        }
    }

    public async render(): Promise<void> {
        if (this.data.length === 0) {
            await this.initializeData();
        }
        this.svg.selectAll('*').remove();

        const g = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        const xScale = d3.scaleLinear()
            .domain(d3.extent(this.data, d => d.activity) as [number, number])
            .nice()
            .range([0, this.width]);

        const yScale = d3.scaleLinear()
            .domain(d3.extent(this.data, d => d.sleepQuality) as [number, number])
            .nice()
            .range([this.height, 0]);

        const colorScale = d3.scaleSequential(d3.interpolateRdYlBu)
            .domain(d3.extent(this.data, d => d.stressLevel) as [number, number]);

        g.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${this.height})`)
            .call(d3.axisBottom(xScale));

        g.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(yScale));

        g.append('text')
            .attr('class', 'axis-label')
            .attr('transform', `translate(${this.width / 2}, ${this.height + 45})`)
            .style('text-anchor', 'middle')
            .text('Physical Activity Level (minutes/day)');

        g.append('text')
            .attr('class', 'axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('y', 0 - this.margin.left + 15)
            .attr('x', 0 - (this.height / 2))
            .style('text-anchor', 'middle')
            .text('Sleep Quality (1-10)');

        const tooltip = d3.select('#tooltip');

        const dots = g.selectAll('.dot')
            .data(this.data)
            .enter().append('circle')
            .attr('class', 'dot')
            .attr('cx', d => xScale(d.activity))
            .attr('cy', d => yScale(d.sleepQuality))
            .attr('r', 0)
            .attr('fill', d => colorScale(d.stressLevel))
            .attr('opacity', 0.7)
            .attr('stroke', '#333')
            .attr('stroke-width', 0.5);

        dots.transition()
            .duration(800)
            .delay((_d, i) => i * 20)
            .attr('r', 4);

        dots.on('mouseover', (event, d) => {
            d3.select(event.currentTarget)
                .transition()
                .duration(200)
                .attr('r', 6);

            tooltip.classed('visible', true)
                .html(`
                    <strong>${d.label}</strong><br/>
                    Activity Level: ${d.activity} min/day<br/>
                    Sleep Quality: ${d.sleepQuality}/10<br/>
                    Stress Level: ${d.stressLevel}/10
                `)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', (event) => {
            d3.select(event.currentTarget)
                .transition()
                .duration(200)
                .attr('r', 4);

            tooltip.classed('visible', false);
        });

        this.addTrendLine(g, xScale, yScale);
        this.addColorLegend(g, colorScale);
        this.addOptimalZone(g, xScale, yScale);
    }

    private addTrendLine(g: d3.Selection<SVGGElement, unknown, HTMLElement, any>, 
                        xScale: d3.ScaleLinear<number, number, never>, 
                        yScale: d3.ScaleLinear<number, number, never>): void {
        const regression = this.calculateLinearRegression(this.data.map(d => d.activity), this.data.map(d => d.sleepQuality));
        
        const xExtent = xScale.domain();
        const lineData = [
            { x: xExtent[0], y: regression.slope * xExtent[0] + regression.intercept },
            { x: xExtent[1], y: regression.slope * xExtent[1] + regression.intercept }
        ];

        const line = d3.line<{x: number, y: number}>()
            .x(d => xScale(d.x))
            .y(d => yScale(d.y));

        g.append('path')
            .datum(lineData)
            .attr('class', 'trend-line')
            .attr('d', line)
            .attr('fill', 'none')
            .attr('stroke', '#ff6b6b')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5')
            .attr('opacity', 0)
            .transition()
            .duration(1000)
            .attr('opacity', 0.8);
    }

    private addOptimalZone(g: d3.Selection<SVGGElement, unknown, HTMLElement, any>, 
                          xScale: d3.ScaleLinear<number, number, never>, 
                          yScale: d3.ScaleLinear<number, number, never>): void {
        const optimalActivityRange = [45, 75];
        const optimalQualityRange = [7, 10];

        g.append('rect')
            .attr('class', 'optimal-zone')
            .attr('x', xScale(optimalActivityRange[0]))
            .attr('y', yScale(optimalQualityRange[1]))
            .attr('width', xScale(optimalActivityRange[1]) - xScale(optimalActivityRange[0]))
            .attr('height', yScale(optimalQualityRange[0]) - yScale(optimalQualityRange[1]))
            .attr('fill', '#4ecdc4')
            .attr('opacity', 0)
            .transition()
            .duration(1000)
            .attr('opacity', 0.2);

        g.append('text')
            .attr('class', 'zone-label')
            .attr('x', xScale((optimalActivityRange[0] + optimalActivityRange[1]) / 2))
            .attr('y', yScale((optimalQualityRange[0] + optimalQualityRange[1]) / 2))
            .style('text-anchor', 'middle')
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .style('fill', '#2c3e50')
            .text('Sweet Spot')
            .attr('opacity', 0)
            .transition()
            .duration(1000)
            .delay(500)
            .attr('opacity', 0.8);
    }

    private calculateLinearRegression(x: number[], y: number[]): { slope: number, intercept: number } {
        const n = x.length;
        const sumX = d3.sum(x);
        const sumY = d3.sum(y);
        const sumXY = d3.sum(x.map((xi, i) => xi * y[i]));
        const sumXX = d3.sum(x.map(xi => xi * xi));

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        return { slope, intercept };
    }

    private addColorLegend(g: d3.Selection<SVGGElement, unknown, HTMLElement, any>, colorScale: d3.ScaleSequential<string>): void {
        const legendWidth = 200;
        const legendHeight = 20;
        
        const legend = g.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${this.width - legendWidth - 20}, 20)`);

        const legendScale = d3.scaleLinear()
            .domain(colorScale.domain())
            .range([0, legendWidth]);

        const legendAxis = d3.axisBottom(legendScale)
            .ticks(5)
            .tickSize(6);

        const gradient = this.svg.append('defs')
            .append('linearGradient')
            .attr('id', 'stress-gradient')
            .attr('x1', '0%')
            .attr('x2', '100%')
            .attr('y1', '0%')
            .attr('y2', '0%');

        gradient.selectAll('stop')
            .data(d3.range(0, 1.01, 0.01))
            .enter().append('stop')
            .attr('offset', d => `${d * 100}%`)
            .attr('stop-color', d => colorScale(legendScale.invert(d * legendWidth)));

        legend.append('rect')
            .attr('width', legendWidth)
            .attr('height', legendHeight)
            .style('fill', 'url(#stress-gradient)');

        legend.append('g')
            .attr('transform', `translate(0, ${legendHeight})`)
            .call(legendAxis);

        legend.append('text')
            .attr('x', legendWidth / 2)
            .attr('y', legendHeight + 35)
            .style('text-anchor', 'middle')
            .style('font-size', '12px')
            .text('Stress Level (1-10)');
    }
}