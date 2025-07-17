import * as d3 from 'd3';

interface SleepData {
    'Person ID': number;
    'Stress Level': number;
    'Quality of Sleep': number;
    'Daily Steps': number;
    'Sleep Duration': number;
    'Age': number;
    'Gender': string;
    'Occupation': string;
    'BMI Category': string;
    'Blood Pressure': string;
    'Heart Rate': number;
    'Sleep Disorder': string;
    'Physical Activity Level': number;
}

interface HeatmapData {
    category1Value: number;
    category2Value: number;
    category1Bin: string;
    category2Bin: string;
    count: number;
    correlation: number;
}

export class CategoryHeatmap {
    private container: d3.Selection<HTMLElement, unknown, HTMLElement, any>;
    private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
    private width: number = 600;
    private height: number = 400;
    private margin = { top: 60, right: 80, bottom: 80, left: 80 };
    private data: SleepData[] = [];
    private heatmapData: HeatmapData[] = [];
    private category1: string = '';
    private category2: string = '';

    constructor(selector: string) {
        this.container = d3.select(selector);
        console.log('CategoryHeatmap container found:', this.container.size());
        this.setupSVG();
        this.loadData();
    }

    private setupSVG(): void {
        this.container.selectAll('*').remove();
        this.svg = this.container
            .append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom);
    }

    private async loadData(): Promise<void> {
        try {
            this.data = await d3.csv('/data/Health and Sleep relation 2024/Sleep_health_and_lifestyle_dataset.csv', (d: any) => ({
                'Person ID': +d['Person ID'],
                'Stress Level': +d['Stress Level'],
                'Quality of Sleep': +d['Quality of Sleep'],
                'Daily Steps': +d['Daily Steps'],
                'Sleep Duration': +d['Sleep Duration'],
                'Age': +d['Age'],
                'Gender': d['Gender'],
                'Occupation': d['Occupation'],
                'BMI Category': d['BMI Category'],
                'Blood Pressure': d['Blood Pressure'],
                'Heart Rate': +d['Heart Rate'],
                'Sleep Disorder': d['Sleep Disorder'],
                'Physical Activity Level': +d['Physical Activity Level']
            }));
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    private createBins(values: number[], numBins: number = 6): { min: number; max: number; label: string }[] {
        const extent = d3.extent(values) as [number, number];
        const globalMin = Math.floor(extent[0]);
        const globalMax = Math.ceil(extent[1]);
        const binSize = (globalMax - globalMin) / numBins;
        
        return Array.from({ length: numBins }, (_, i) => {
            const min = globalMin + i * binSize;
            const max = globalMin + (i + 1) * binSize;
            return {
                min,
                max,
                label: `${min.toFixed(1)}-${max.toFixed(1)}`
            };
        });
    }

    private processData(): void {
        if (!this.category1 || !this.category2 || this.data.length === 0) {
            this.heatmapData = [];
            return;
        }

        const validData = this.data.filter(d => 
            !isNaN(d[this.category1 as keyof SleepData] as number) && 
            !isNaN(d[this.category2 as keyof SleepData] as number)
        );

        const category1Values = validData.map(d => d[this.category1 as keyof SleepData] as number);
        const category2Values = validData.map(d => d[this.category2 as keyof SleepData] as number);

        const category1Bins = this.createBins(category1Values);
        const category2Bins = this.createBins(category2Values);

        this.heatmapData = [];

        category1Bins.forEach(bin1 => {
            category2Bins.forEach(bin2 => {
                const pointsInBin = validData.filter(d => {
                    const val1 = d[this.category1 as keyof SleepData] as number;
                    const val2 = d[this.category2 as keyof SleepData] as number;
                    return val1 >= bin1.min && val1 < bin1.max && val2 >= bin2.min && val2 < bin2.max;
                });

                if (pointsInBin.length > 0) {
                    const avgVal1 = d3.mean(pointsInBin, d => d[this.category1 as keyof SleepData] as number) || 0;
                    const avgVal2 = d3.mean(pointsInBin, d => d[this.category2 as keyof SleepData] as number) || 0;
                    
                    const correlation = this.calculateCorrelation(
                        pointsInBin.map(d => d[this.category1 as keyof SleepData] as number),
                        pointsInBin.map(d => d[this.category2 as keyof SleepData] as number)
                    );

                    this.heatmapData.push({
                        category1Value: avgVal1,
                        category2Value: avgVal2,
                        category1Bin: bin1.label,
                        category2Bin: bin2.label,
                        count: pointsInBin.length,
                        correlation: correlation
                    });
                } else {
                    // Add empty squares for bins with no data
                    this.heatmapData.push({
                        category1Value: (bin1.min + bin1.max) / 2,
                        category2Value: (bin2.min + bin2.max) / 2,
                        category1Bin: bin1.label,
                        category2Bin: bin2.label,
                        count: 0,
                        correlation: 0
                    });
                }
            });
        });
    }

    private calculateCorrelation(x: number[], y: number[]): number {
        const n = Math.min(x.length, y.length);
        if (n < 2) return 0;
        
        const meanX = d3.mean(x) || 0;
        const meanY = d3.mean(y) || 0;
        
        const numerator = d3.sum(x, (xi, i) => (xi - meanX) * (y[i] - meanY));
        const denomX = Math.sqrt(d3.sum(x, xi => Math.pow(xi - meanX, 2)));
        const denomY = Math.sqrt(d3.sum(y, yi => Math.pow(yi - meanY, 2)));
        
        if (denomX === 0 || denomY === 0) return 0;
        
        return numerator / (denomX * denomY);
    }

    public updateCategories(category1: string, category2: string): void {
        this.category1 = category1;
        this.category2 = category2;
        this.processData();
        this.render();
    }

    public render(): void {
        if (this.heatmapData.length === 0) {
            this.renderEmpty();
            return;
        }

        this.svg.selectAll('*').remove();

        const g = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        const category1Bins = Array.from(new Set(this.heatmapData.map(d => d.category1Bin)));
        const category2Bins = Array.from(new Set(this.heatmapData.map(d => d.category2Bin)));

        const xScale = d3.scaleBand()
            .domain(category1Bins.sort((a, b) => parseFloat(a.split('-')[0]) - parseFloat(b.split('-')[0])))
            .range([0, this.width])
            .padding(0.05);

        const yScale = d3.scaleBand()
            .domain(category2Bins.sort((a, b) => parseFloat(a.split('-')[0]) - parseFloat(b.split('-')[0])))
            .range([this.height, 0])
            .padding(0.05);

        const maxCount = d3.max(this.heatmapData, d => d.count) || 1;
        const colorScale = d3.scaleSequential()
            .domain([0, Math.sqrt(maxCount)])
            .interpolator(d3.interpolateBlues);

        const tooltip = d3.select('#tooltip');

        const cells = g.selectAll('.heatmap-cell')
            .data(this.heatmapData)
            .enter()
            .append('rect')
            .attr('class', 'heatmap-cell')
            .attr('x', d => xScale(d.category1Bin) || 0)
            .attr('y', d => yScale(d.category2Bin) || 0)
            .attr('width', xScale.bandwidth())
            .attr('height', yScale.bandwidth())
            .attr('fill', d => d.count === 0 ? '#f8f9fa' : colorScale(Math.sqrt(d.count)))
            .attr('stroke', '#000000')
            .attr('stroke-width', 1)
            .on('mouseover', (event, d) => {
                tooltip.classed('visible', true)
                    .html(`
                        <strong>${this.category1}: ${d.category1Bin}</strong><br/>
                        <strong>${this.category2}: ${d.category2Bin}</strong><br/>
                        Count: ${d.count} people<br/>
                        ${d.count > 0 ? `Avg ${this.category1}: ${d.category1Value.toFixed(2)}<br/>Avg ${this.category2}: ${d.category2Value.toFixed(2)}` : 'No data in this range'}
                    `)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            })
            .on('mouseout', () => {
                tooltip.classed('visible', false);
            });

        g.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${this.height})`)
            .call(d3.axisBottom(xScale))
            .selectAll('text')
            .style('text-anchor', 'end')
            .attr('dx', '-.8em')
            .attr('dy', '.15em')
            .attr('transform', 'rotate(-45)')
            .style('font-size', '10px');

        g.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(yScale))
            .selectAll('text')
            .style('font-size', '10px');

        g.append('text')
            .attr('class', 'axis-label')
            .attr('x', this.width / 2)
            .attr('y', this.height + 60)
            .style('text-anchor', 'middle')
            .style('font-size', '12px')
            .text(this.category1);

        g.append('text')
            .attr('class', 'axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('x', -this.height / 2)
            .attr('y', -40)
            .style('text-anchor', 'middle')
            .style('font-size', '12px')
            .text(this.category2);

        g.append('text')
            .attr('class', 'chart-title')
            .attr('x', this.width / 2)
            .attr('y', -30)
            .style('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .text(`${this.category1} vs ${this.category2} Distribution`);

        this.addColorLegend(g);
    }

    private renderEmpty(): void {
        this.svg.selectAll('*').remove();
        
        const g = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        g.append('text')
            .attr('x', this.width / 2)
            .attr('y', this.height / 2)
            .style('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('fill', '#666')
            .text('Select two categories to see their correlation heatmap');
    }

    private addColorLegend(g: d3.Selection<SVGGElement, unknown, HTMLElement, any>): void {
        const legendWidth = 200;
        const legendHeight = 20;
        
        const legend = g.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${this.width - legendWidth}, ${this.height + 40})`);

        const maxCount = d3.max(this.heatmapData, d => d.count) || 1;
        const legendScale = d3.scaleLinear()
            .domain([0, maxCount])
            .range([0, legendWidth]);

        const legendAxis = d3.axisBottom(legendScale)
            .ticks(5)
            .tickSize(6);

        this.svg.select('defs').remove();
        const gradient = this.svg.append('defs')
            .append('linearGradient')
            .attr('id', 'heatmap-gradient')
            .attr('x1', '0%')
            .attr('x2', '100%')
            .attr('y1', '0%')
            .attr('y2', '0%');

        gradient.selectAll('stop')
            .data(d3.range(0, 1.01, 0.1))
            .enter().append('stop')
            .attr('offset', d => `${d * 100}%`)
            .attr('stop-color', d => d3.interpolateBlues(d));

        legend.append('rect')
            .attr('width', legendWidth)
            .attr('height', legendHeight)
            .style('fill', 'url(#heatmap-gradient)')
            .style('stroke', '#000')
            .style('stroke-width', 1);

        legend.append('g')
            .attr('transform', `translate(0, ${legendHeight})`)
            .call(legendAxis);

        legend.append('text')
            .attr('x', legendWidth / 2)
            .attr('y', legendHeight + 25)
            .style('text-anchor', 'middle')
            .style('font-size', '10px')
            .text('People Count');
    }
}