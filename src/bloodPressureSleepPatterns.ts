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

interface BloodPressureData {
    systolic: number;
    diastolic: number;
    sleepDuration: number;
    sleepQuality: number;
    category: string;
}

export class BloodPressureSleepPatterns {
    private container: string;
    private data: SleepData[] = [];
    private processedData: BloodPressureData[] = [];
    private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any> | null = null;
    private margin = { top: 40, right: 120, bottom: 80, left: 80 };
    private width = 600;
    private height = 450;

    constructor(container: string) {
        this.container = container;
    }

    async render(): Promise<void> {
        await this.loadData();
        this.processData();
        this.setupSVG();
        this.createVisualization();
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

    private processData(): void {
        this.processedData = this.data.map(d => {
            const bpParts = d['Blood Pressure'].split('/');
            const systolic = parseInt(bpParts[0]);
            const diastolic = parseInt(bpParts[1]);
            
            let category = 'Normal';
            if (systolic >= 140 || diastolic >= 90) {
                category = 'High';
            } else if (systolic >= 130 || diastolic >= 80) {
                category = 'Elevated';
            }

            return {
                systolic,
                diastolic,
                sleepDuration: d['Sleep Duration'],
                sleepQuality: d['Quality of Sleep'],
                category
            };
        }).filter(d => !isNaN(d.systolic) && !isNaN(d.diastolic));
    }

    private setupSVG(): void {
        d3.select(this.container).selectAll('*').remove();

        this.svg = d3.select(this.container)
            .append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom);
    }

    private createVisualization(): void {
        if (!this.svg || this.processedData.length === 0) return;

        const innerWidth = this.width - this.margin.left - this.margin.right;
        const innerHeight = this.height - this.margin.top - this.margin.bottom;

        const g = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        const sleepDurationBins = [0, 5, 6, 7, 8, 9, 12];
        const sleepDurationLabels = ['<5h', '5-6h', '6-7h', '7-8h', '8-9h', '9h+'];
        
        const bpCategories = ['Normal', 'Elevated', 'High'];
        const colorScale = d3.scaleOrdinal()
            .domain(bpCategories)
            .range(['#2ecc71', '#f39c12', '#e74c3c']);

        const xScale = d3.scaleBand()
            .domain(sleepDurationLabels)
            .range([0, innerWidth])
            .padding(0.1);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(this.processedData, d => d.systolic) || 200])
            .range([innerHeight, 0]);

        const tooltip = d3.select('#tooltip');

        const groupedData = sleepDurationLabels.map(label => {
            const binIndex = sleepDurationLabels.indexOf(label);
            const minDuration = sleepDurationBins[binIndex];
            const maxDuration = sleepDurationBins[binIndex + 1];
            
            const binData = this.processedData.filter(d => 
                d.sleepDuration >= minDuration && d.sleepDuration < maxDuration
            );

            return {
                label,
                data: binData,
                avgSystolic: d3.mean(binData, d => d.systolic) || 0,
                avgDiastolic: d3.mean(binData, d => d.diastolic) || 0,
                categoryCounts: bpCategories.map(cat => ({
                    category: cat,
                    count: binData.filter(d => d.category === cat).length
                }))
            };
        });

        const barWidth = xScale.bandwidth() / bpCategories.length;

        bpCategories.forEach((category, catIndex) => {
            g.selectAll(`.bar-${catIndex}`)
                .data(groupedData)
                .enter()
                .append('rect')
                .attr('class', `bar-${catIndex}`)
                .attr('x', d => (xScale(d.label) || 0) + catIndex * barWidth)
                .attr('y', d => {
                    const categoryData = d.data.filter(item => item.category === category);
                    const avgSystolic = d3.mean(categoryData, item => item.systolic) || 0;
                    return yScale(avgSystolic);
                })
                .attr('width', barWidth)
                .attr('height', d => {
                    const categoryData = d.data.filter(item => item.category === category);
                    const avgSystolic = d3.mean(categoryData, item => item.systolic) || 0;
                    return innerHeight - yScale(avgSystolic);
                })
                .attr('fill', colorScale(category) as string)
                .attr('stroke', '#fff')
                .attr('stroke-width', 1)
                .on('mouseover', (event, d) => {
                    const categoryData = d.data.filter(item => item.category === category);
                    const avgSystolic = d3.mean(categoryData, item => item.systolic) || 0;
                    const avgDiastolic = d3.mean(categoryData, item => item.diastolic) || 0;
                    const count = categoryData.length;
                    
                    tooltip.transition()
                        .duration(200)
                        .style('opacity', 0.9);
                    tooltip.html(`
                        <strong>Sleep Duration: ${d.label}</strong><br/>
                        <strong>BP Category: ${category}</strong><br/>
                        Count: ${count} people<br/>
                        Avg Systolic: ${avgSystolic.toFixed(1)}<br/>
                        Avg Diastolic: ${avgDiastolic.toFixed(1)}<br/>
                        BP Range: ${avgSystolic.toFixed(0)}/${avgDiastolic.toFixed(0)}
                    `)
                        .style('left', (event.pageX + 10) + 'px')
                        .style('top', (event.pageY - 28) + 'px');
                })
                .on('mouseout', () => {
                    tooltip.transition()
                        .duration(500)
                        .style('opacity', 0);
                });
        });

        const avgLine = d3.line<{ label: string; avgSystolic: number }>()
            .x(d => (xScale(d.label) || 0) + xScale.bandwidth() / 2)
            .y(d => yScale(d.avgSystolic))
            .curve(d3.curveMonotoneX);

        g.append('path')
            .datum(groupedData)
            .attr('class', 'trend-line')
            .attr('d', avgLine)
            .attr('fill', 'none')
            .attr('stroke', '#333')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5');

        g.selectAll('.trend-point')
            .data(groupedData)
            .enter()
            .append('circle')
            .attr('class', 'trend-point')
            .attr('cx', d => (xScale(d.label) || 0) + xScale.bandwidth() / 2)
            .attr('cy', d => yScale(d.avgSystolic))
            .attr('r', 4)
            .attr('fill', '#333')
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);

        g.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${innerHeight})`)
            .call(d3.axisBottom(xScale));

        g.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(yScale));

        g.append('text')
            .attr('class', 'axis-label')
            .attr('x', innerWidth / 2)
            .attr('y', innerHeight + 50)
            .attr('text-anchor', 'middle')
            .text('Sleep Duration Range');

        g.append('text')
            .attr('class', 'axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('x', -innerHeight / 2)
            .attr('y', -50)
            .attr('text-anchor', 'middle')
            .text('Average Systolic Blood Pressure');

        const legend = g.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${innerWidth + 20}, 20)`);

        legend.append('text')
            .attr('x', 0)
            .attr('y', 0)
            .attr('font-size', '12px')
            .attr('font-weight', 'bold')
            .text('BP Category');

        const legendItems = legend.selectAll('.legend-item')
            .data(bpCategories)
            .enter()
            .append('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(0, ${15 + i * 25})`);

        legendItems.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', 15)
            .attr('height', 15)
            .attr('fill', d => colorScale(d) as string)
            .attr('stroke', '#fff')
            .attr('stroke-width', 1);

        legendItems.append('text')
            .attr('x', 20)
            .attr('y', 12)
            .attr('font-size', '10px')
            .text(d => d);

        legend.append('line')
            .attr('x1', 0)
            .attr('y1', 100)
            .attr('x2', 20)
            .attr('y2', 100)
            .attr('stroke', '#333')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5');

        legend.append('text')
            .attr('x', 25)
            .attr('y', 105)
            .attr('font-size', '10px')
            .text('Trend Line');
    }
}