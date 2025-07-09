import * as d3 from 'd3';

interface DemographicData {
    group: string;
    quality: number;
    count: number;
}

export class SleepQualityDemographics {
    private container: d3.Selection<HTMLElement, unknown, HTMLElement, any>;
    private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
    private width: number;
    private height: number;
    private margin = { top: 40, right: 100, bottom: 80, left: 80 };
    private data: DemographicData[] = [];
    private currentGrouping: 'age' | 'gender' | 'occupation' = 'age';

    constructor(selector: string) {
        this.container = d3.select(selector);
        this.width = 650 - this.margin.left - this.margin.right;
        this.height = 500 - this.margin.top - this.margin.bottom;
        
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
            this.updateDataForGrouping(csvData, this.currentGrouping);
        } catch (error) {
            console.error('Error loading CSV data:', error);
            this.data = [{ group: 'Error', quality: 0, count: 0 }];
        }
    }

    private updateDataForGrouping(csvData: any[], grouping: 'age' | 'gender' | 'occupation'): void {
        const groupedData = new Map<string, number[]>();

        csvData.forEach(d => {
            let group = '';
            if (grouping === 'age') {
                const age = +d.Age;
                if (age < 30) group = '20-29';
                else if (age < 40) group = '30-39';
                else if (age < 50) group = '40-49';
                else group = '50+';
            } else if (grouping === 'gender') {
                group = d.Gender;
            } else if (grouping === 'occupation') {
                group = d.Occupation;
            }

            if (!groupedData.has(group)) {
                groupedData.set(group, []);
            }
            groupedData.get(group)!.push(+d['Quality of Sleep']);
        });

        this.data = [];
        groupedData.forEach((qualities, group) => {
            qualities.forEach(quality => {
                this.data.push({ group, quality, count: 1 });
            });
        });
    }

    public async render(): Promise<void> {
        if (this.data.length === 0) {
            await this.initializeData();
        }
        this.svg.selectAll('*').remove();

        const g = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        const groups = [...new Set(this.data.map(d => d.group))];
        const groupedData = d3.group(this.data, d => d.group);

        const xScale = d3.scaleBand()
            .domain(groups)
            .range([0, this.width])
            .padding(0.1);

        const yScale = d3.scaleLinear()
            .domain([0, 10])
            .range([this.height, 0]);

        const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
            .domain(groups);

        g.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${this.height})`)
            .call(d3.axisBottom(xScale))
            .selectAll('text')
            .style('text-anchor', 'end')
            .attr('dx', '-.8em')
            .attr('dy', '.15em')
            .attr('transform', 'rotate(-45)');

        g.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(yScale));

        g.append('text')
            .attr('class', 'axis-label')
            .attr('transform', `translate(${this.width / 2}, ${this.height + 60})`)
            .style('text-anchor', 'middle')
            .text(this.currentGrouping === 'age' ? 'Age Groups' : 
                  this.currentGrouping === 'gender' ? 'Gender' : 'Occupation');

        g.append('text')
            .attr('class', 'axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('y', 0 - this.margin.left + 15)
            .attr('x', 0 - (this.height / 2))
            .style('text-anchor', 'middle')
            .text('Sleep Quality (1-10)');

        const tooltip = d3.select('#tooltip');

        groups.forEach(group => {
            const groupData = groupedData.get(group) || [];
            const qualities = groupData.map(d => d.quality);
            
            const binWidth = xScale.bandwidth() * 0.8;
            const binHeight = this.height / 20;
            
            const histogram = d3.histogram()
                .domain([0, 10])
                .thresholds(10);
            
            const bins = histogram(qualities);
            const maxBinLength = d3.max(bins, d => d.length) || 1;
            
            const widthScale = d3.scaleLinear()
                .domain([0, maxBinLength])
                .range([0, binWidth]);

            const groupG = g.append('g')
                .attr('class', 'violin-group')
                .attr('transform', `translate(${xScale(group)! + xScale.bandwidth() / 2}, 0)`);

            bins.forEach(bin => {
                if (bin.length === 0) return;
                
                const binY = yScale((bin.x0! + bin.x1!) / 2);
                const binCount = bin.length;
                const barWidth = widthScale(binCount);
                
                groupG.append('rect')
                    .attr('class', 'violin-bar')
                    .attr('x', -barWidth / 2)
                    .attr('y', binY - binHeight / 2)
                    .attr('width', 0)
                    .attr('height', binHeight)
                    .attr('fill', colorScale(group))
                    .attr('opacity', 0.7)
                    .transition()
                    .duration(800)
                    .delay(groups.indexOf(group) * 100)
                    .attr('width', barWidth);
            });

            const median = d3.median(qualities) || 0;
            const q1 = d3.quantile(qualities.sort(d3.ascending), 0.25) || 0;
            const q3 = d3.quantile(qualities.sort(d3.ascending), 0.75) || 0;

            groupG.append('line')
                .attr('class', 'median-line')
                .attr('x1', -binWidth / 2)
                .attr('x2', binWidth / 2)
                .attr('y1', yScale(median))
                .attr('y2', yScale(median))
                .attr('stroke', '#333')
                .attr('stroke-width', 2)
                .attr('opacity', 0)
                .transition()
                .duration(800)
                .delay(groups.indexOf(group) * 100)
                .attr('opacity', 1);

            groupG.append('rect')
                .attr('class', 'tooltip-area')
                .attr('x', -xScale.bandwidth() / 2)
                .attr('y', 0)
                .attr('width', xScale.bandwidth())
                .attr('height', this.height)
                .attr('fill', 'transparent')
                .on('mouseover', (event) => {
                    tooltip.classed('visible', true)
                        .html(`
                            <strong>${group}</strong><br/>
                            Count: ${qualities.length}<br/>
                            Median Quality: ${median.toFixed(1)}<br/>
                            Q1: ${q1.toFixed(1)}, Q3: ${q3.toFixed(1)}<br/>
                            Range: ${d3.min(qualities)}-${d3.max(qualities)}
                        `)
                        .style('left', (event.pageX + 10) + 'px')
                        .style('top', (event.pageY - 10) + 'px');
                })
                .on('mouseout', () => {
                    tooltip.classed('visible', false);
                });
        });
    }

    public async updateGrouping(grouping: 'age' | 'gender' | 'occupation'): Promise<void> {
        this.currentGrouping = grouping;
        try {
            const csvData = await d3.csv('/data/Health and Sleep relation 2024/Sleep_health_and_lifestyle_dataset.csv');
            this.updateDataForGrouping(csvData, grouping);
            await this.render();
        } catch (error) {
            console.error('Error updating grouping:', error);
        }
    }
}