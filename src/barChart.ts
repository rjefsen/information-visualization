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
    private margin = { top: 20, right: 30, bottom: 40, left: 60 };
    private data: BarData[] = [];
    private datasets: { [key: string]: BarData[] };

    constructor(selector: string) {
        this.container = d3.select(selector);
        this.width = 800 - this.margin.left - this.margin.right;
        this.height = 400 - this.margin.top - this.margin.bottom;
        
        this.setupSVG();
        this.initializeData();
    }

    private setupSVG(): void {
        this.svg = this.container
            .append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom);
    }

    private initializeData(): void {
        this.datasets = {
            sales: [
                { label: 'Q1', value: 12000 },
                { label: 'Q2', value: 15000 },
                { label: 'Q3', value: 18000 },
                { label: 'Q4', value: 21000 },
                { label: 'Q5', value: 16000 }
            ],
            population: [
                { label: 'NYC', value: 8400000 },
                { label: 'LA', value: 3900000 },
                { label: 'Chicago', value: 2700000 },
                { label: 'Houston', value: 2300000 },
                { label: 'Phoenix', value: 1700000 }
            ],
            revenue: [
                { label: 'Product A', value: 45000 },
                { label: 'Product B', value: 38000 },
                { label: 'Product C', value: 52000 },
                { label: 'Product D', value: 29000 },
                { label: 'Product E', value: 41000 }
            ]
        };
        
        this.data = this.datasets.sales;
    }

    public render(): void {
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
            .text('Value');

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

    public updateData(datasetKey: string): void {
        if (this.datasets[datasetKey]) {
            this.data = this.datasets[datasetKey];
            this.render();
        }
    }
}