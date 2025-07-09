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

export class BMISleepProfile {
    private container: string;
    private data: SleepData[] = [];
    private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any> | null = null;
    private margin = { top: 40, right: 100, bottom: 80, left: 80 };
    private width = 650;
    private height = 500;

    constructor(container: string) {
        this.container = container;
    }

    async render(): Promise<void> {
        await this.loadData();
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

    private setupSVG(): void {
        d3.select(this.container).selectAll('*').remove();

        this.svg = d3.select(this.container)
            .append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom);
    }

    private createVisualization(): void {
        if (!this.svg || this.data.length === 0) return;

        const innerWidth = this.width - this.margin.left - this.margin.right;
        const innerHeight = this.height - this.margin.top - this.margin.bottom;

        const g = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        const bmiCategories = Array.from(new Set(this.data.map(d => d['BMI Category'])));
        const sleepQualityBins = [0, 4, 6, 8, 10];
        const sleepQualityLabels = ['Poor (0-4)', 'Fair (4-6)', 'Good (6-8)', 'Excellent (8-10)'];

        const colorScale = d3.scaleOrdinal(d3.schemeSet3)
            .domain(sleepQualityLabels);

        const xScale = d3.scaleBand()
            .domain(bmiCategories)
            .range([0, innerWidth])
            .padding(0.1);

        const yScale = d3.scaleLinear()
            .domain([0, 100])
            .range([innerHeight, 0]);

        const stackedData = bmiCategories.map(bmiCategory => {
            const categoryData = this.data.filter(d => d['BMI Category'] === bmiCategory);
            const total = categoryData.length;
            
            const distribution = sleepQualityLabels.map((label, i) => {
                const min = sleepQualityBins[i];
                const max = sleepQualityBins[i + 1];
                const count = categoryData.filter(d => d['Quality of Sleep'] >= min && d['Quality of Sleep'] < max).length;
                return {
                    category: bmiCategory,
                    qualityRange: label,
                    count: count,
                    percentage: total > 0 ? (count / total) * 100 : 0
                };
            });

            let cumulative = 0;
            return distribution.map(d => {
                const result = {
                    ...d,
                    y0: cumulative,
                    y1: cumulative + d.percentage
                };
                cumulative += d.percentage;
                return result;
            });
        }).flat();

        const tooltip = d3.select('#tooltip');

        const bars = g.selectAll('.bar-group')
            .data(bmiCategories)
            .enter()
            .append('g')
            .attr('class', 'bar-group')
            .attr('transform', d => `translate(${xScale(d)}, 0)`);

        sleepQualityLabels.forEach((qualityLabel, i) => {
            bars.selectAll(`.bar-${i}`)
                .data(d => stackedData.filter(s => s.category === d && s.qualityRange === qualityLabel))
                .enter()
                .append('rect')
                .attr('class', `bar-${i}`)
                .attr('x', 0)
                .attr('y', d => yScale(d.y1))
                .attr('width', xScale.bandwidth())
                .attr('height', d => yScale(d.y0) - yScale(d.y1))
                .attr('fill', colorScale(qualityLabel))
                .attr('stroke', '#fff')
                .attr('stroke-width', 1)
                .on('mouseover', (event, d) => {
                    tooltip.transition()
                        .duration(200)
                        .style('opacity', 0.9);
                    tooltip.html(`
                        <strong>${d.category}</strong><br/>
                        Sleep Quality: ${d.qualityRange}<br/>
                        Count: ${d.count} people<br/>
                        Percentage: ${d.percentage.toFixed(1)}%
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

        g.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${innerHeight})`)
            .call(d3.axisBottom(xScale))
            .selectAll('text')
            .attr('transform', 'rotate(-45)')
            .style('text-anchor', 'end');

        g.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(yScale).tickFormat(d => d + '%'));

        g.append('text')
            .attr('class', 'axis-label')
            .attr('x', innerWidth / 2)
            .attr('y', innerHeight + 70)
            .attr('text-anchor', 'middle')
            .text('BMI Category');

        g.append('text')
            .attr('class', 'axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('x', -innerHeight / 2)
            .attr('y', -40)
            .attr('text-anchor', 'middle')
            .text('Percentage of Population');

        const legend = g.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${innerWidth - 150}, 20)`);

        legend.append('text')
            .attr('x', 0)
            .attr('y', 0)
            .attr('font-size', '12px')
            .attr('font-weight', 'bold')
            .text('Sleep Quality');

        const legendItems = legend.selectAll('.legend-item')
            .data(sleepQualityLabels)
            .enter()
            .append('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(0, ${15 + i * 20})`);

        legendItems.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', 15)
            .attr('height', 15)
            .attr('fill', d => colorScale(d))
            .attr('stroke', '#fff')
            .attr('stroke-width', 1);

        legendItems.append('text')
            .attr('x', 20)
            .attr('y', 12)
            .attr('font-size', '10px')
            .text(d => d);

        const summaryStats = g.append('g')
            .attr('class', 'summary-stats')
            .attr('transform', `translate(20, 20)`);

        const avgSleepByBMI = bmiCategories.map(category => {
            const categoryData = this.data.filter(d => d['BMI Category'] === category);
            const avgSleep = d3.mean(categoryData, d => d['Quality of Sleep']) || 0;
            return { category, avgSleep };
        });

        summaryStats.append('text')
            .attr('x', 0)
            .attr('y', 0)
            .attr('font-size', '10px')
            .attr('font-weight', 'bold')
            .text('Average Sleep Quality by BMI:');

        avgSleepByBMI.forEach((d, i) => {
            summaryStats.append('text')
                .attr('x', 0)
                .attr('y', 15 + i * 12)
                .attr('font-size', '9px')
                .text(`${d.category}: ${d.avgSleep.toFixed(1)}`);
        });
    }
}