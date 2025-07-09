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

export class StressSleepSteps {
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

        const stressScale = d3.scaleLinear()
            .domain(d3.extent(this.data, d => d['Stress Level']) as [number, number])
            .range([0, innerWidth]);

        const sleepQualityScale = d3.scaleLinear()
            .domain(d3.extent(this.data, d => d['Quality of Sleep']) as [number, number])
            .range([innerHeight, 0]);

        const stepScale = d3.scaleLinear()
            .domain(d3.extent(this.data, d => d['Daily Steps']) as [number, number])
            .range([3, 15]);

        const colorScale = d3.scaleSequential(d3.interpolateRdYlBu)
            .domain(d3.extent(this.data, d => d['Daily Steps']) as [number, number]);

        const tooltip = d3.select('#tooltip');

        g.selectAll('.data-point')
            .data(this.data)
            .enter()
            .append('circle')
            .attr('class', 'data-point')
            .attr('cx', d => stressScale(d['Stress Level']))
            .attr('cy', d => sleepQualityScale(d['Quality of Sleep']))
            .attr('r', d => stepScale(d['Daily Steps']))
            .attr('fill', d => colorScale(d['Daily Steps']))
            .attr('stroke', '#333')
            .attr('stroke-width', 0.5)
            .attr('opacity', 0.7)
            .on('mouseover', (event, d) => {
                tooltip.transition()
                    .duration(200)
                    .style('opacity', 0.9);
                tooltip.html(`
                    <strong>Person ${d['Person ID']}</strong><br/>
                    Stress Level: ${d['Stress Level']}<br/>
                    Sleep Quality: ${d['Quality of Sleep']}<br/>
                    Daily Steps: ${d['Daily Steps'].toLocaleString()}<br/>
                    Age: ${d['Age']}<br/>
                    Gender: ${d['Gender']}<br/>
                    Occupation: ${d['Occupation']}
                `)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', () => {
                tooltip.transition()
                    .duration(500)
                    .style('opacity', 0);
            });

        g.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${innerHeight})`)
            .call(d3.axisBottom(stressScale));

        g.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(sleepQualityScale));

        g.append('text')
            .attr('class', 'axis-label')
            .attr('x', innerWidth / 2)
            .attr('y', innerHeight + 50)
            .attr('text-anchor', 'middle')
            .text('Stress Level');

        g.append('text')
            .attr('class', 'axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('x', -innerHeight / 2)
            .attr('y', -40)
            .attr('text-anchor', 'middle')
            .text('Sleep Quality');

        const legend = g.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${innerWidth - 120}, 20)`);

        legend.append('text')
            .attr('x', 0)
            .attr('y', 0)
            .attr('font-size', '12px')
            .attr('font-weight', 'bold')
            .text('Daily Steps');

        legend.append('text')
            .attr('x', 0)
            .attr('y', 15)
            .attr('font-size', '10px')
            .text('(bubble size & color)');

        const legendData = [
            { steps: d3.min(this.data, d => d['Daily Steps']) || 0, label: 'Low' },
            { steps: d3.mean(this.data, d => d['Daily Steps']) || 0, label: 'Medium' },
            { steps: d3.max(this.data, d => d['Daily Steps']) || 0, label: 'High' }
        ];

        const legendItems = legend.selectAll('.legend-item')
            .data(legendData)
            .enter()
            .append('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(0, ${35 + i * 20})`);

        legendItems.append('circle')
            .attr('cx', 10)
            .attr('cy', 0)
            .attr('r', d => stepScale(d.steps))
            .attr('fill', d => colorScale(d.steps))
            .attr('stroke', '#333')
            .attr('stroke-width', 0.5);

        legendItems.append('text')
            .attr('x', 25)
            .attr('y', 4)
            .attr('font-size', '10px')
            .text(d => `${d.label}: ${Math.round(d.steps).toLocaleString()}`);
    }
}