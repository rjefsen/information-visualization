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

interface OccupationalRiskData {
    occupation: string;
    totalCount: number;
    disorderCount: number;
    riskPercentage: number;
    avgSleepQuality: number;
    avgSleepDuration: number;
    avgStressLevel: number;
    commonDisorders: { disorder: string; count: number }[];
    riskLevel: string;
}

export class OccupationalRisk {
    private container: string;
    private data: SleepData[] = [];
    private riskData: OccupationalRiskData[] = [];
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
        const occupations = Array.from(new Set(this.data.map(d => d.Occupation)));
        
        this.riskData = occupations.map(occupation => {
            const occupationData = this.data.filter(d => d.Occupation === occupation);
            const totalCount = occupationData.length;
            const disorderData = occupationData.filter(d => d['Sleep Disorder'] !== 'None');
            const disorderCount = disorderData.length;
            const riskPercentage = totalCount > 0 ? (disorderCount / totalCount) * 100 : 0;
            
            const disorderCounts = d3.rollup(disorderData, v => v.length, d => d['Sleep Disorder']);
            const commonDisorders = Array.from(disorderCounts.entries())
                .map(([disorder, count]) => ({ disorder, count }))
                .sort((a, b) => b.count - a.count);

            let riskLevel = 'Low';
            if (riskPercentage > 50) riskLevel = 'High';
            else if (riskPercentage > 25) riskLevel = 'Medium';

            return {
                occupation,
                totalCount,
                disorderCount,
                riskPercentage,
                avgSleepQuality: d3.mean(occupationData, d => d['Quality of Sleep']) || 0,
                avgSleepDuration: d3.mean(occupationData, d => d['Sleep Duration']) || 0,
                avgStressLevel: d3.mean(occupationData, d => d['Stress Level']) || 0,
                commonDisorders,
                riskLevel
            };
        }).sort((a, b) => b.riskPercentage - a.riskPercentage);
    }

    private setupSVG(): void {
        d3.select(this.container).selectAll('*').remove();

        this.svg = d3.select(this.container)
            .append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom);
    }

    private createVisualization(): void {
        if (!this.svg || this.riskData.length === 0) return;

        const innerWidth = this.width - this.margin.left - this.margin.right;
        const innerHeight = this.height - this.margin.top - this.margin.bottom;

        const g = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        const xScale = d3.scaleBand()
            .domain(this.riskData.map(d => d.occupation))
            .range([0, innerWidth])
            .padding(0.1);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(this.riskData, d => d.riskPercentage) || 100])
            .range([innerHeight, 0]);

        const riskColorScale = d3.scaleOrdinal()
            .domain(['Low', 'Medium', 'High'])
            .range(['#2ecc71', '#f39c12', '#e74c3c']);

        const sizeScale = d3.scaleLinear()
            .domain(d3.extent(this.riskData, d => d.totalCount) as [number, number])
            .range([10, 25]);

        const tooltip = d3.select('#tooltip');

        const bars = g.selectAll('.risk-bar')
            .data(this.riskData)
            .enter()
            .append('g')
            .attr('class', 'risk-bar')
            .attr('transform', d => `translate(${xScale(d.occupation)}, 0)`);

        bars.append('rect')
            .attr('class', 'bar')
            .attr('x', 0)
            .attr('y', d => yScale(d.riskPercentage))
            .attr('width', xScale.bandwidth())
            .attr('height', d => innerHeight - yScale(d.riskPercentage))
            .attr('fill', d => riskColorScale(d.riskLevel) as string)
            .attr('stroke', '#333')
            .attr('stroke-width', 1)
            .on('mouseover', (event, d) => {
                tooltip.transition()
                    .duration(200)
                    .style('opacity', 0.9);
                tooltip.html(`
                    <strong>${d.occupation}</strong><br/>
                    Risk Level: ${d.riskLevel}<br/>
                    Disorder Rate: ${d.riskPercentage.toFixed(1)}%<br/>
                    People with Disorders: ${d.disorderCount}/${d.totalCount}<br/>
                    Avg Sleep Quality: ${d.avgSleepQuality.toFixed(1)}<br/>
                    Avg Sleep Duration: ${d.avgSleepDuration.toFixed(1)}h<br/>
                    Avg Stress Level: ${d.avgStressLevel.toFixed(1)}<br/>
                    ${d.commonDisorders.length > 0 ? `Most Common: ${d.commonDisorders[0].disorder}` : ''}
                `)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', () => {
                tooltip.transition()
                    .duration(500)
                    .style('opacity', 0);
            });

        bars.append('text')
            .attr('class', 'percentage-label')
            .attr('x', xScale.bandwidth() / 2)
            .attr('y', d => yScale(d.riskPercentage) - 5)
            .attr('text-anchor', 'middle')
            .attr('font-size', '9px')
            .attr('font-weight', 'bold')
            .text(d => d.riskPercentage.toFixed(0) + '%');

        bars.append('circle')
            .attr('class', 'sample-size')
            .attr('cx', xScale.bandwidth() / 2)
            .attr('cy', d => yScale(d.riskPercentage) + (innerHeight - yScale(d.riskPercentage)) / 2)
            .attr('r', d => sizeScale(d.totalCount))
            .attr('fill', 'rgba(255, 255, 255, 0.8)')
            .attr('stroke', '#333')
            .attr('stroke-width', 1);

        bars.append('text')
            .attr('class', 'sample-size-label')
            .attr('x', xScale.bandwidth() / 2)
            .attr('y', d => yScale(d.riskPercentage) + (innerHeight - yScale(d.riskPercentage)) / 2 + 3)
            .attr('text-anchor', 'middle')
            .attr('font-size', '8px')
            .attr('font-weight', 'bold')
            .text(d => d.totalCount);

        g.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${innerHeight})`)
            .call(d3.axisBottom(xScale))
            .selectAll('text')
            .attr('transform', 'rotate(-45)')
            .style('text-anchor', 'end')
            .style('font-size', '10px');

        g.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(yScale).tickFormat(d => d + '%'));

        g.append('text')
            .attr('class', 'axis-label')
            .attr('x', innerWidth / 2)
            .attr('y', innerHeight + 80)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .text('Occupation');

        g.append('text')
            .attr('class', 'axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('x', -innerHeight / 2)
            .attr('y', -60)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .text('Sleep Disorder Risk (%)');

        const legend = g.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${innerWidth + 20}, 20)`);

        legend.append('text')
            .attr('x', 0)
            .attr('y', 0)
            .attr('font-size', '12px')
            .attr('font-weight', 'bold')
            .text('Risk Level');

        const riskLevels = ['Low', 'Medium', 'High'];
        const riskItems = legend.selectAll('.risk-item')
            .data(riskLevels)
            .enter()
            .append('g')
            .attr('class', 'risk-item')
            .attr('transform', (d, i) => `translate(0, ${15 + i * 20})`);

        riskItems.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', 15)
            .attr('height', 15)
            .attr('fill', d => riskColorScale(d) as string)
            .attr('stroke', '#333')
            .attr('stroke-width', 1);

        riskItems.append('text')
            .attr('x', 20)
            .attr('y', 12)
            .attr('font-size', '10px')
            .text(d => d);

        legend.append('text')
            .attr('x', 0)
            .attr('y', 90)
            .attr('font-size', '10px')
            .attr('font-weight', 'bold')
            .text('Circle Size = Sample Size');

        const sampleSizes = [
            { size: d3.min(this.riskData, d => d.totalCount) || 0, label: 'Min' },
            { size: d3.max(this.riskData, d => d.totalCount) || 0, label: 'Max' }
        ];

        sampleSizes.forEach((sample, i) => {
            const sampleItem = legend.append('g')
                .attr('class', 'sample-item')
                .attr('transform', `translate(0, ${110 + i * 25})`);

            sampleItem.append('circle')
                .attr('cx', 10)
                .attr('cy', 10)
                .attr('r', sizeScale(sample.size))
                .attr('fill', 'rgba(255, 255, 255, 0.8)')
                .attr('stroke', '#333')
                .attr('stroke-width', 1);

            sampleItem.append('text')
                .attr('x', 25)
                .attr('y', 14)
                .attr('font-size', '9px')
                .text(`${sample.label}: ${sample.size}`);
        });

        const summaryStats = g.append('g')
            .attr('class', 'summary-stats')
            .attr('transform', `translate(20, 20)`);

        const overallRisk = (this.riskData.reduce((sum, d) => sum + d.disorderCount, 0) / 
                           this.riskData.reduce((sum, d) => sum + d.totalCount, 0)) * 100;

        const highRiskOccupations = this.riskData.filter(d => d.riskLevel === 'High').length;

        summaryStats.append('text')
            .attr('x', 0)
            .attr('y', 0)
            .attr('font-size', '10px')
            .attr('font-weight', 'bold')
            .text(`Overall Risk: ${overallRisk.toFixed(1)}%`);

        summaryStats.append('text')
            .attr('x', 0)
            .attr('y', 15)
            .attr('font-size', '10px')
            .text(`High Risk Jobs: ${highRiskOccupations}`);

        const highestRisk = this.riskData[0];
        summaryStats.append('text')
            .attr('x', 0)
            .attr('y', 30)
            .attr('font-size', '10px')
            .text(`Highest Risk: ${highestRisk.occupation}`);
    }
}