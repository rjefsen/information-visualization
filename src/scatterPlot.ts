import * as d3 from 'd3';

interface ScatterData {
    x: number;
    y: number;
    label?: string;
}

export class ScatterPlot {
    private container: d3.Selection<HTMLElement, unknown, HTMLElement, any>;
    private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
    private width: number;
    private height: number;
    private margin = { top: 60, right: 80, bottom: 80, left: 80 };
    private data: ScatterData[] = [];
    private xVariable: string = '';
    private yVariable: string = '';

    constructor(selector: string) {
        this.container = d3.select(selector);
        const containerRect = (this.container.node() as HTMLElement).getBoundingClientRect();
        this.width = Math.max(400, containerRect.width - this.margin.left - this.margin.right);
        this.height = Math.max(300, containerRect.height - this.margin.top - this.margin.bottom);
        
        this.setupSVG();
    }

    private setupSVG(): void {
        this.container.selectAll('*').remove();
        this.svg = this.container
            .append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom);
    }

    public async loadData(xVariable: string, yVariable: string): Promise<void> {
        this.xVariable = xVariable;
        this.yVariable = yVariable;
        
        try {
            const csvData = await d3.csv('/data/Health and Sleep relation 2024/Sleep_health_and_lifestyle_dataset.csv');
            
            this.data = csvData
                .map(d => ({
                    x: +d[xVariable],
                    y: +d[yVariable],
                    label: d['Person ID'] || ''
                }))
                .filter(d => !isNaN(d.x) && !isNaN(d.y));
        } catch (error) {
            console.error('Error loading CSV data:', error);
            this.data = [];
        }
    }

    public async render(): Promise<void> {
        if (this.data.length === 0) return;

        this.svg.selectAll('*').remove();

        const g = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        const xScale = d3.scaleLinear()
            .domain(d3.extent(this.data, d => d.x) as [number, number])
            .range([0, this.width])
            .nice();

        const yScale = d3.scaleLinear()
            .domain(d3.extent(this.data, d => d.y) as [number, number])
            .range([this.height, 0])
            .nice();

        const xAxis = d3.axisBottom(xScale)
            .tickFormat(d3.format('.1f'));

        const yAxis = d3.axisLeft(yScale)
            .tickFormat(d3.format('.1f'));

        g.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0, ${this.height})`)
            .call(xAxis);

        g.append('g')
            .attr('class', 'y-axis')
            .call(yAxis);

        g.append('text')
            .attr('class', 'x-axis-label')
            .attr('text-anchor', 'middle')
            .attr('x', this.width / 2)
            .attr('y', this.height + 35)
            .style('font-size', '12px')
            .text(this.xVariable);

        g.append('text')
            .attr('class', 'y-axis-label')
            .attr('text-anchor', 'middle')
            .attr('transform', 'rotate(-90)')
            .attr('x', -this.height / 2)
            .attr('y', -45)
            .style('font-size', '12px')
            .text(this.yVariable);

        const tooltip = d3.select('#tooltip');

        const circles = g.selectAll('.scatter-dot')
            .data(this.data)
            .enter().append('circle')
            .attr('class', 'scatter-dot')
            .attr('cx', d => xScale(d.x))
            .attr('cy', d => yScale(d.y))
            .attr('r', 0)
            .attr('fill', '#3498db')
            .attr('stroke', '#2980b9')
            .attr('stroke-width', 1)
            .attr('opacity', 0.7);

        circles.transition()
            .duration(800)
            .delay((d, i) => i * 2)
            .attr('r', 4);

        circles.on('mouseover', (event, d) => {
            d3.select(event.currentTarget)
                .transition()
                .duration(200)
                .attr('r', 6)
                .attr('opacity', 1);

            tooltip.classed('visible', true)
                .html(`
                    <strong>${this.xVariable}:</strong> ${d.x.toFixed(2)}<br/>
                    <strong>${this.yVariable}:</strong> ${d.y.toFixed(2)}
                `)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', (event) => {
            d3.select(event.currentTarget)
                .transition()
                .duration(200)
                .attr('r', 4)
                .attr('opacity', 0.7);

            tooltip.classed('visible', false);
        });

        const correlation = this.calculateCorrelation();
        const regression = this.calculateLinearRegression();
        
        const xDomain = xScale.domain();
        const lineGenerator = d3.line<{x: number, y: number}>()
            .x(d => xScale(d.x))
            .y(d => yScale(d.y));
        
        const regressionLine = [
            { x: xDomain[0], y: regression.slope * xDomain[0] + regression.intercept },
            { x: xDomain[1], y: regression.slope * xDomain[1] + regression.intercept }
        ];
        
        g.append('path')
            .datum(regressionLine)
            .attr('class', 'regression-line')
            .attr('d', lineGenerator)
            .attr('stroke', '#e74c3c')
            .attr('stroke-width', 2)
            .attr('fill', 'none')
            .attr('opacity', 0)
            .transition()
            .duration(1000)
            .delay(800)
            .attr('opacity', 0.8);
        
        g.append('text')
            .attr('class', 'correlation-text')
            .attr('x', this.width - 10)
            .attr('y', 20)
            .style('text-anchor', 'end')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .style('fill', correlation > 0 ? '#27ae60' : '#e74c3c')
            .text(`r = ${correlation.toFixed(3)}`);
        
        g.append('text')
            .attr('class', 'r2-text')
            .attr('x', this.width - 10)
            .attr('y', 40)
            .style('text-anchor', 'end')
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .style('fill', '#7f8c8d')
            .text(`R² = ${regression.r2.toFixed(3)}`);

        this.addTitle(g);
    }

    private calculateCorrelation(): number {
        if (this.data.length < 2) return 0;
        
        const meanX = d3.mean(this.data, d => d.x) || 0;
        const meanY = d3.mean(this.data, d => d.y) || 0;
        
        const numerator = d3.sum(this.data, d => (d.x - meanX) * (d.y - meanY));
        const denomX = Math.sqrt(d3.sum(this.data, d => Math.pow(d.x - meanX, 2)));
        const denomY = Math.sqrt(d3.sum(this.data, d => Math.pow(d.y - meanY, 2)));
        
        if (denomX === 0 || denomY === 0) return 0;
        
        return numerator / (denomX * denomY);
    }

    private calculateLinearRegression(): { slope: number; intercept: number; r2: number } {
        if (this.data.length < 2) return { slope: 0, intercept: 0, r2: 0 };
        
        const n = this.data.length;
        const sumX = d3.sum(this.data, d => d.x);
        const sumY = d3.sum(this.data, d => d.y);
        const sumXY = d3.sum(this.data, d => d.x * d.y);
        const sumX2 = d3.sum(this.data, d => d.x * d.x);
        const sumY2 = d3.sum(this.data, d => d.y * d.y);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        const meanY = sumY / n;
        const totalSumSquares = d3.sum(this.data, d => Math.pow(d.y - meanY, 2));
        const residualSumSquares = d3.sum(this.data, d => Math.pow(d.y - (slope * d.x + intercept), 2));
        const r2 = 1 - (residualSumSquares / totalSumSquares);
        
        return { slope, intercept, r2 };
    }

    private addTitle(g: d3.Selection<SVGGElement, unknown, HTMLElement, any>): void {
        g.append('text')
            .attr('class', 'scatter-title')
            .attr('x', this.width / 2)
            .attr('y', -25)
            .style('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('font-weight', 'bold')
            .text(`${this.xVariable} vs ${this.yVariable}`);
    }
}