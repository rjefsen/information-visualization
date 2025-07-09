import * as d3 from 'd3';

interface BarData {
    label: string;
    value: number;
    category?: string;
}

export class BarChart {
    private container: d3.Selection<HTMLElement, unknown, HTMLElement, any>;
    private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
    private width: number;
    private height: number;
    private margin = { top: 40, right: 100, bottom: 80, left: 80 };
    private data: BarData[] = [];
    private datasets: { [key: string]: BarData[] };

    constructor(selector: string) {
        this.container = d3.select(selector);
        this.width = 650 - this.margin.left - this.margin.right;
        this.height = 500 - this.margin.top - this.margin.bottom;
        
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
            
            const sleepByOccupation = d3.rollup(
                csvData,
                v => d3.mean(v, d => +d['Sleep Duration']),
                d => d.Occupation
            );
            
            const stressByOccupation = d3.rollup(
                csvData,
                v => d3.mean(v, d => +d['Stress Level']),
                d => d.Occupation
            );
            
            const physicalActivityByOccupation = d3.rollup(
                csvData,
                v => d3.mean(v, d => +d['Physical Activity Level']),
                d => d.Occupation
            );

            this.datasets = {
                'sleep-duration': Array.from(sleepByOccupation, ([occupation, avgSleep]) => ({
                    label: occupation,
                    value: avgSleep || 0
                })),
                'stress-level': Array.from(stressByOccupation, ([occupation, avgStress]) => ({
                    label: occupation,
                    value: avgStress || 0
                })),
                'physical-activity': Array.from(physicalActivityByOccupation, ([occupation, avgActivity]) => ({
                    label: occupation,
                    value: avgActivity || 0
                }))
            };
            
            this.data = this.datasets['sleep-duration'];
        } catch (error) {
            console.error('Error loading CSV data:', error);
            this.datasets = {
                'sleep-duration': [{ label: 'Error loading data', value: 0 }]
            };
            this.data = this.datasets['sleep-duration'];
        }
    }

    public async render(): Promise<void> {
        if (Object.keys(this.datasets).length === 0) {
            await this.initializeData();
        }
        this.renderChart();
    }

    public async updateData(datasetKey: string): Promise<void> {
        if (this.datasets[datasetKey]) {
            this.data = this.datasets[datasetKey];
            this.renderChart();
        }
    }

    private renderChart(): void {
        this.svg.selectAll('*').remove();

        const g = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        const xScale = d3.scaleBand()
            .domain(this.data.map(d => d.label))
            .range([0, this.width])
            .padding(0.1);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(this.data, d => d.value) || 0])
            .nice()
            .range([this.height, 0]);

        const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

        g.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${this.height})`)
            .call(d3.axisBottom(xScale));

        g.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(yScale).tickFormat(d3.format('.2s')));

        g.append('text')
            .attr('class', 'axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('y', 0 - this.margin.left)
            .attr('x', 0 - (this.height / 2))
            .attr('dy', '1em')
            .style('text-anchor', 'middle')
            .text('Average Value');

        const tooltip = d3.select('#tooltip');

        const bars = g.selectAll('.bar')
            .data(this.data)
            .enter().append('rect')
            .attr('class', 'bar')
            .attr('x', d => xScale(d.label) || 0)
            .attr('width', xScale.bandwidth())
            .attr('y', this.height)
            .attr('height', 0)
            .attr('fill', (d, i) => colorScale(i.toString()));

        bars.transition()
            .duration(800)
            .attr('y', d => yScale(d.value))
            .attr('height', d => this.height - yScale(d.value));

        bars.on('mouseover', (event, d) => {
            tooltip.classed('visible', true)
                .html(`<strong>${d.label}</strong><br/>Value: ${d.value.toLocaleString()}`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', () => {
            tooltip.classed('visible', false);
        });
    }
}