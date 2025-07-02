import * as d3 from 'd3';

interface ScatterData {
    x: number;
    y: number;
    category: string;
    label: string;
    value: number;
}

export class ScatterPlot {
    private container: d3.Selection<HTMLElement, unknown, HTMLElement, any>;
    private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
    private width: number;
    private height: number;
    private margin = { top: 20, right: 30, bottom: 50, left: 60 };
    private data: ScatterData[] = [];
    private colorMode: 'category' | 'value' = 'category';

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
        this.data = [
            { x: 10, y: 20, category: 'A', label: 'Point 1', value: 25 },
            { x: 15, y: 35, category: 'B', label: 'Point 2', value: 45 },
            { x: 22, y: 18, category: 'A', label: 'Point 3', value: 30 },
            { x: 28, y: 42, category: 'C', label: 'Point 4', value: 55 },
            { x: 35, y: 25, category: 'B', label: 'Point 5', value: 40 },
            { x: 42, y: 38, category: 'A', label: 'Point 6', value: 50 },
            { x: 48, y: 15, category: 'C', label: 'Point 7', value: 35 },
            { x: 55, y: 45, category: 'B', label: 'Point 8', value: 60 },
            { x: 62, y: 28, category: 'A', label: 'Point 9', value: 42 },
            { x: 68, y: 32, category: 'C', label: 'Point 10', value: 48 },
            { x: 75, y: 22, category: 'B', label: 'Point 11', value: 38 },
            { x: 82, y: 40, category: 'A', label: 'Point 12', value: 52 },
            { x: 88, y: 35, category: 'C', label: 'Point 13', value: 47 },
            { x: 95, y: 48, category: 'B', label: 'Point 14', value: 63 }
        ];
    }

    public render(): void {
        this.svg.selectAll('*').remove();

        const g = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        const xScale = d3.scaleLinear()
            .domain(d3.extent(this.data, d => d.x) as [number, number])
            .nice()
            .range([0, this.width]);

        const yScale = d3.scaleLinear()
            .domain(d3.extent(this.data, d => d.y) as [number, number])
            .nice()
            .range([this.height, 0]);

        let colorScale: d3.ScaleOrdinal<string, string> | d3.ScaleSequential<string>;
        
        if (this.colorMode === 'category') {
            colorScale = d3.scaleOrdinal(d3.schemeCategory10)
                .domain([...new Set(this.data.map(d => d.category))]);
        } else {
            colorScale = d3.scaleSequential(d3.interpolateViridis)
                .domain(d3.extent(this.data, d => d.value) as [number, number]);
        }

        g.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${this.height})`)
            .call(d3.axisBottom(xScale));

        g.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(yScale));

        g.append('text')
            .attr('class', 'axis-label')
            .attr('transform', `translate(${this.width / 2}, ${this.height + this.margin.bottom - 10})`)
            .style('text-anchor', 'middle')
            .text('X Value');

        g.append('text')
            .attr('class', 'axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('y', 0 - this.margin.left)
            .attr('x', 0 - (this.height / 2))
            .attr('dy', '1em')
            .style('text-anchor', 'middle')
            .text('Y Value');

        const tooltip = d3.select('#tooltip');

        const dots = g.selectAll('.dot')
            .data(this.data)
            .enter().append('circle')
            .attr('class', 'dot')
            .attr('cx', d => xScale(d.x))
            .attr('cy', d => yScale(d.y))
            .attr('r', 0)
            .attr('fill', d => {
                if (this.colorMode === 'category') {
                    return (colorScale as d3.ScaleOrdinal<string, string>)(d.category);
                } else {
                    return (colorScale as d3.ScaleSequential<string>)(d.value);
                }
            });

        dots.transition()
            .duration(800)
            .delay((d, i) => i * 50)
            .attr('r', 4);

        dots.on('mouseover', (event, d) => {
            d3.select(event.currentTarget)
                .transition()
                .duration(200)
                .attr('r', 6);

            tooltip.classed('visible', true)
                .html(`
                    <strong>${d.label}</strong><br/>
                    Category: ${d.category}<br/>
                    X: ${d.x}, Y: ${d.y}<br/>
                    Value: ${d.value}
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

        if (this.colorMode === 'category') {
            this.addLegend(g, colorScale as d3.ScaleOrdinal<string, string>);
        }
    }

    private addLegend(g: d3.Selection<SVGGElement, unknown, HTMLElement, any>, colorScale: d3.ScaleOrdinal<string, string>): void {
        const legend = g.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${this.width - 100}, 20)`);

        const categories = colorScale.domain();
        const legendItems = legend.selectAll('.legend-item')
            .data(categories)
            .enter().append('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(0, ${i * 20})`);

        legendItems.append('rect')
            .attr('width', 15)
            .attr('height', 15)
            .attr('fill', d => colorScale(d));

        legendItems.append('text')
            .attr('x', 20)
            .attr('y', 12)
            .style('font-size', '12px')
            .text(d => d);
    }

    public updateColorScale(mode: string): void {
        this.colorMode = mode as 'category' | 'value';
        this.render();
    }
}