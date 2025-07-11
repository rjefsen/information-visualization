import * as d3 from 'd3';

interface HeatmapData {
    duration: number;
    quality: number;
    count: number;
}

export class SleepDurationQualityHeatmap {
    private container: d3.Selection<HTMLElement, unknown, HTMLElement, any>;
    private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
    private width: number;
    private height: number;
    private margin = { top: 20, right: 100, bottom: 70, left: 60 };
    private data: HeatmapData[] = [];

    constructor(selector: string) {
        this.container = d3.select(selector);
        this.width = 500;
        this.height = 350;
        
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
            
            const durationQualityMap = new Map<string, number>();
            
            csvData.forEach(d => {
                const duration = Math.round(+d['Sleep Duration']);
                const quality = Math.round(+d['Quality of Sleep']);
                const key = `${duration}-${quality}`;
                
                durationQualityMap.set(key, (durationQualityMap.get(key) || 0) + 1);
            });

            this.data = [];
            for (let duration = 4; duration <= 10; duration++) {
                for (let quality = 4; quality <= 10; quality++) {
                    const key = `${duration}-${quality}`;
                    const count = durationQualityMap.get(key) || 0;
                    this.data.push({ duration, quality, count });
                }
            }
        } catch (error) {
            console.error('Error loading CSV data:', error);
            this.data = [{ duration: 0, quality: 0, count: 0 }];
        }
    }

    public async render(): Promise<void> {
        if (this.data.length === 0) {
            await this.initializeData();
        }
        this.svg.selectAll('*').remove();

        const g = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        const durationExtent = d3.extent(this.data, d => d.duration) as [number, number];
        const qualityExtent = d3.extent(this.data, d => d.quality) as [number, number];

        const xScale = d3.scaleBand()
            .domain(d3.range(durationExtent[0], durationExtent[1] + 1).map(d => d.toString()))
            .range([0, this.width])
            .padding(0.05);

        const yScale = d3.scaleBand()
            .domain(d3.range(qualityExtent[0], qualityExtent[1] + 1).map(d => d.toString()))
            .range([this.height, 0])
            .padding(0.05);

        const colorScale = d3.scaleSequential(d3.interpolateReds)
            .domain([0, d3.max(this.data, d => d.count) || 1]);

        const xAxis = d3.axisBottom(xScale)
            .tickFormat(d => d + 'h');

        g.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${this.height})`)
            .call(xAxis)
            .selectAll('text')
            .style('font-size', '12px')
            .style('fill', '#333');

        g.select('.x-axis .domain')
            .style('stroke', '#333');

        g.selectAll('.x-axis line')
            .style('stroke', '#333');

        const yAxis = d3.axisLeft(yScale)
            .tickFormat(d => d);

        g.append('g')
            .attr('class', 'y-axis')
            .call(yAxis)
            .selectAll('text')
            .style('font-size', '12px')
            .style('fill', '#333');

        g.select('.y-axis .domain')
            .style('stroke', '#333');

        g.selectAll('.y-axis line')
            .style('stroke', '#333');

        // Add x-axis title directly to SVG
        this.svg.append('text')
            .attr('class', 'x-axis-label')
            .attr('x', (this.width + this.margin.left + this.margin.right) / 2)
            .attr('y', this.height + this.margin.top + this.margin.bottom - 10)
            .style('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('font-weight', 'bold')
            .style('fill', 'red')
            .text('Sleep Duration (hours)');

        g.append('text')
            .attr('class', 'y-axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('y', 0 - this.margin.left + 15)
            .attr('x', 0 - (this.height / 2))
            .style('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .style('fill', '#333')
            .text('Sleep Quality (1-10)');

        let tooltip = d3.select('#tooltip');
        if (tooltip.empty()) {
            tooltip = d3.select('body').append('div')
                .attr('id', 'tooltip')
                .attr('class', 'tooltip')
                .style('position', 'absolute')
                .style('background', 'rgba(0, 0, 0, 0.8)')
                .style('color', 'white')
                .style('padding', '10px')
                .style('border-radius', '5px')
                .style('pointer-events', 'none')
                .style('opacity', 0)
                .style('z-index', '1000');
        }

        const cells = g.selectAll('.cell')
            .data(this.data)
            .enter().append('rect')
            .attr('class', 'cell')
            .attr('x', d => xScale(d.duration.toString()) || 0)
            .attr('y', d => yScale(d.quality.toString()) || 0)
            .attr('width', xScale.bandwidth())
            .attr('height', yScale.bandwidth())
            .attr('fill', d => colorScale(d.count))
            .attr('stroke', '#fff')
            .attr('stroke-width', 1)
            .attr('opacity', 0);

        cells.transition()
            .duration(800)
            .delay((d, i) => i * 20)
            .attr('opacity', 1);

        cells.on('mouseover', (event, d) => {
            d3.select(event.currentTarget)
                .transition()
                .duration(200)
                .attr('stroke-width', 2)
                .attr('stroke', '#333');

            tooltip.transition()
                .duration(200)
                .style('opacity', 0.9);
            
            tooltip.html(`
                    <strong>Sleep Pattern</strong><br/>
                    Duration: ${d.duration} hours<br/>
                    Quality: ${d.quality}/10<br/>
                    Count: ${d.count} people
                `)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', (event) => {
            d3.select(event.currentTarget)
                .transition()
                .duration(200)
                .attr('stroke-width', 1)
                .attr('stroke', '#fff');

            tooltip.transition()
                .duration(500)
                .style('opacity', 0);
        });

        this.addColorLegend(g, colorScale);
    }

    private addColorLegend(g: d3.Selection<SVGGElement, unknown, HTMLElement, any>, colorScale: d3.ScaleSequential<string>): void {
        const legendWidth = 20;
        const legendHeight = 150;
        
        const legend = g.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${this.width + 20}, ${(this.height - legendHeight) / 2})`);

        const legendScale = d3.scaleLinear()
            .domain(colorScale.domain())
            .range([legendHeight, 0]);

        const legendAxis = d3.axisRight(legendScale)
            .ticks(5)
            .tickSize(6);

        const gradient = this.svg.append('defs')
            .append('linearGradient')
            .attr('id', 'legend-gradient')
            .attr('x1', '0%')
            .attr('x2', '0%')
            .attr('y1', '100%')
            .attr('y2', '0%');

        gradient.selectAll('stop')
            .data(d3.range(0, 1.01, 0.01))
            .enter().append('stop')
            .attr('offset', d => `${d * 100}%`)
            .attr('stop-color', d => colorScale(legendScale.invert(legendHeight - d * legendHeight)));

        legend.append('rect')
            .attr('width', legendWidth)
            .attr('height', legendHeight)
            .style('fill', 'url(#legend-gradient)');

        legend.append('g')
            .attr('transform', `translate(${legendWidth}, 0)`)
            .call(legendAxis);

        legend.append('text')
            .attr('x', legendWidth + 35)
            .attr('y', legendHeight / 2)
            .attr('transform', `rotate(90, ${legendWidth + 35}, ${legendHeight / 2})`)
            .style('text-anchor', 'middle')
            .style('font-size', '12px')
            .text('Number of People');
    }
}