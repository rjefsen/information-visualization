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

interface DisorderProfile {
    disorder: string;
    count: number;
    avgAge: number;
    avgSleepQuality: number;
    avgSleepDuration: number;
    avgHeartRate: number;
    avgStressLevel: number;
    avgSteps: number;
    genderDistribution: { [key: string]: number };
    bmiDistribution: { [key: string]: number };
}

export class DisorderDashboard {
    private container: string;
    private data: SleepData[] = [];
    private disorderProfiles: DisorderProfile[] = [];
    private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any> | null = null;
    private margin = { top: 40, right: 120, bottom: 80, left: 80 };
    private width = 650;
    private height = 500;

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
        const disorders = Array.from(new Set(this.data.map(d => d['Sleep Disorder'])));
        
        this.disorderProfiles = disorders.map(disorder => {
            const disorderData = this.data.filter(d => d['Sleep Disorder'] === disorder);
            
            const genderCounts = d3.rollup(disorderData, v => v.length, d => d.Gender);
            const bmiCounts = d3.rollup(disorderData, v => v.length, d => d['BMI Category']);
            
            return {
                disorder,
                count: disorderData.length,
                avgAge: d3.mean(disorderData, d => d.Age) || 0,
                avgSleepQuality: d3.mean(disorderData, d => d['Quality of Sleep']) || 0,
                avgSleepDuration: d3.mean(disorderData, d => d['Sleep Duration']) || 0,
                avgHeartRate: d3.mean(disorderData, d => d['Heart Rate']) || 0,
                avgStressLevel: d3.mean(disorderData, d => d['Stress Level']) || 0,
                avgSteps: d3.mean(disorderData, d => d['Daily Steps']) || 0,
                genderDistribution: Object.fromEntries(genderCounts),
                bmiDistribution: Object.fromEntries(bmiCounts)
            };
        });
    }

    private setupSVG(): void {
        d3.select(this.container).selectAll('*').remove();

        this.svg = d3.select(this.container)
            .append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom);
    }

    private createVisualization(): void {
        if (!this.svg || this.disorderProfiles.length === 0) return;

        const innerWidth = this.width - this.margin.left - this.margin.right;
        const innerHeight = this.height - this.margin.top - this.margin.bottom;

        const g = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        this.createMainChart(g, innerWidth, innerHeight);
    }

    private createMainChart(g: d3.Selection<SVGGElement, unknown, HTMLElement, any>, width: number, height: number): void {
        const xScale = d3.scaleBand()
            .domain(this.disorderProfiles.map(d => d.disorder))
            .range([0, width])
            .padding(0.2);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(this.disorderProfiles, d => d.count) || 0])
            .range([height, 0]);

        const colorScale = d3.scaleOrdinal(d3.schemeSet3)
            .domain(this.disorderProfiles.map(d => d.disorder));

        const tooltip = d3.select('#tooltip');

        g.selectAll('.disorder-bar')
            .data(this.disorderProfiles)
            .enter()
            .append('rect')
            .attr('class', 'disorder-bar')
            .attr('x', d => xScale(d.disorder) || 0)
            .attr('y', d => yScale(d.count))
            .attr('width', xScale.bandwidth())
            .attr('height', d => height - yScale(d.count))
            .attr('fill', d => colorScale(d.disorder))
            .attr('stroke', '#333')
            .attr('stroke-width', 1)
            .attr('opacity', 0.8)
            .on('mouseover', (event, d) => {
                tooltip.classed('visible', true)
                    .html(`
                        <strong>${d.disorder}</strong><br/>
                        Count: ${d.count} people<br/>
                        Avg Sleep Quality: ${d.avgSleepQuality.toFixed(1)}/10<br/>
                        Avg Sleep Duration: ${d.avgSleepDuration.toFixed(1)}h<br/>
                        Avg Stress Level: ${d.avgStressLevel.toFixed(1)}/10<br/>
                        Avg Heart Rate: ${d.avgHeartRate.toFixed(1)} bpm
                    `)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            })
            .on('mouseout', () => {
                tooltip.classed('visible', false);
            });

        g.selectAll('.disorder-label')
            .data(this.disorderProfiles)
            .enter()
            .append('text')
            .attr('class', 'disorder-label')
            .attr('x', d => (xScale(d.disorder) || 0) + xScale.bandwidth() / 2)
            .attr('y', d => yScale(d.count) - 5)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .text(d => d.count);

        g.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale))
            .selectAll('text')
            .style('text-anchor', 'end')
            .attr('dx', '-.8em')
            .attr('dy', '.15em')
            .attr('transform', 'rotate(-45)')
            .style('font-size', '12px');

        g.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(yScale));

        g.append('text')
            .attr('class', 'y-axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('y', 0 - this.margin.left + 20)
            .attr('x', 0 - (height / 2))
            .style('text-anchor', 'middle')
            .style('font-size', '14px')
            .text('Number of People');

        g.append('text')
            .attr('class', 'chart-title')
            .attr('x', width / 2)
            .attr('y', -15)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('font-weight', 'bold')
            .text('Sleep Disorder Distribution');
    }

    private createRadarChart(g: d3.Selection<SVGGElement, unknown, HTMLElement, any>, cx: number, cy: number): void {
        const radarG = g.append('g')
            .attr('class', 'radar-chart')
            .attr('transform', `translate(${cx},${cy})`);

        const metrics = ['avgSleepQuality', 'avgSleepDuration', 'avgHeartRate', 'avgStressLevel'];
        const metricLabels = ['Sleep Quality', 'Sleep Duration', 'Heart Rate', 'Stress Level'];
        const radius = 100;
        const angleSlice = Math.PI * 2 / metrics.length;

        const maxValues = {
            avgSleepQuality: 10,
            avgSleepDuration: 12,
            avgHeartRate: 100,
            avgStressLevel: 10
        };

        const scales = {
            avgSleepQuality: d3.scaleLinear().domain([0, maxValues.avgSleepQuality]).range([0, radius]),
            avgSleepDuration: d3.scaleLinear().domain([0, maxValues.avgSleepDuration]).range([0, radius]),
            avgHeartRate: d3.scaleLinear().domain([0, maxValues.avgHeartRate]).range([0, radius]),
            avgStressLevel: d3.scaleLinear().domain([0, maxValues.avgStressLevel]).range([0, radius])
        };

        const levels = 5;
        for (let i = 0; i < levels; i++) {
            const levelRadius = radius * (i + 1) / levels;
            radarG.append('circle')
                .attr('cx', 0)
                .attr('cy', 0)
                .attr('r', levelRadius)
                .attr('fill', 'none')
                .attr('stroke', '#ccc')
                .attr('stroke-width', 1);
        }

        metrics.forEach((metric, i) => {
            const angle = angleSlice * i - Math.PI / 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            radarG.append('line')
                .attr('x1', 0)
                .attr('y1', 0)
                .attr('x2', x)
                .attr('y2', y)
                .attr('stroke', '#ccc')
                .attr('stroke-width', 1);

            radarG.append('text')
                .attr('x', x * 1.2)
                .attr('y', y * 1.2)
                .attr('text-anchor', 'middle')
                .attr('font-size', '10px')
                .text(metricLabels[i]);
        });

        const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
            .domain(this.disorderProfiles.map(d => d.disorder));

        this.disorderProfiles.forEach(profile => {
            const pathPoints = metrics.map((metric, i) => {
                const angle = angleSlice * i - Math.PI / 2;
                const value = (profile as any)[metric];
                const scaledValue = (scales as any)[metric](value);
                const x = Math.cos(angle) * scaledValue;
                const y = Math.sin(angle) * scaledValue;
                return [x, y];
            });

            const line = d3.line()
                .x(d => d[0])
                .y(d => d[1])
                .curve(d3.curveCardinalClosed);

            radarG.append('path')
                .datum(pathPoints)
                .attr('d', line as any)
                .attr('fill', colorScale(profile.disorder))
                .attr('fill-opacity', 0.3)
                .attr('stroke', colorScale(profile.disorder))
                .attr('stroke-width', 2);

            radarG.selectAll(`.dot-${profile.disorder}`)
                .data(pathPoints)
                .enter()
                .append('circle')
                .attr('class', `dot-${profile.disorder}`)
                .attr('cx', d => d[0])
                .attr('cy', d => d[1])
                .attr('r', 3)
                .attr('fill', colorScale(profile.disorder));
        });

        radarG.append('text')
            .attr('x', 0)
            .attr('y', -radius - 20)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('font-weight', 'bold')
            .text('Health Metrics Profile');
    }
}