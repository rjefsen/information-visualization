import * as d3 from 'd3';
import { BarChart } from './barChart';
import { SleepDurationQualityHeatmap } from './sleepDurationQualityHeatmap';
import { SleepQualityDemographics } from './sleepQualityDemographics';
// import { ActivitySweetSpot } from './activitySweetSpot';
import { CorrelationMatrix } from './correlationMatrix';
// import { StressSleepSteps } from './stressSleepSteps';
// import { BMISleepProfile } from './bmiSleepProfile';
import { BloodPressureSleepPatterns } from './bloodPressureSleepPatterns';
// import { DisorderDashboard } from './disorderDashboard';
// import { OccupationalRisk } from './occupationalRisk';

class App {
    // private barChart: BarChart;
    private sleepDurationQualityHeatmap: SleepDurationQualityHeatmap;
    private sleepQualityDemographics: SleepQualityDemographics;
    // private activitySweetSpot: ActivitySweetSpot;
    private correlationMatrix: CorrelationMatrix;
    // private stressSleepSteps: StressSleepSteps;
    // private bmiSleepProfile: BMISleepProfile;
    private bloodPressureSleepPatterns: BloodPressureSleepPatterns;
    // private disorderDashboard: DisorderDashboard;
    // private occupationalRisk: OccupationalRisk;

    constructor() {
        // this.barChart = new BarChart('#bar-chart');
        this.sleepDurationQualityHeatmap = new SleepDurationQualityHeatmap('#duration-quality-heatmap');
        this.sleepQualityDemographics = new SleepQualityDemographics('#quality-demographics');
        // this.activitySweetSpot = new ActivitySweetSpot('#activity-sweetspot');
        this.correlationMatrix = new CorrelationMatrix('#correlation-matrix', '#correlation-scatter');
        // this.stressSleepSteps = new StressSleepSteps('#stress-sleep-steps');
        // this.bmiSleepProfile = new BMISleepProfile('#bmi-sleep-profile');
        this.bloodPressureSleepPatterns = new BloodPressureSleepPatterns('#bp-sleep-patterns');
        // this.disorderDashboard = new DisorderDashboard('#disorder-dashboard');
        // this.occupationalRisk = new OccupationalRisk('#occupational-risk');
        
        this.initializeNavigation();
        this.initializeControls();
        this.initializeApp();
    }

    private async initializeApp(): Promise<void> {
        await this.sleepDurationQualityHeatmap.render();
        await this.sleepQualityDemographics.render();
    }

    private initializeNavigation(): void {
        const sleepPatternsBtn = d3.select('#sleep-patterns-btn');
        // const lifestyleBtn = d3.select('#lifestyle-btn');
        const cardiovascularBtn = d3.select('#cardiovascular-btn');
        // const disordersBtn = d3.select('#disorders-btn');

        const sleepPatternsSection = d3.select('#sleep-patterns-section');
        // const lifestyleSection = d3.select('#lifestyle-section');
        const cardiovascularSection = d3.select('#cardiovascular-section');
        // const disordersSection = d3.select('#disorders-section');

        sleepPatternsBtn.on('click', async () => {
            this.switchSection(sleepPatternsBtn, sleepPatternsSection);
            await this.sleepDurationQualityHeatmap.render();
            await this.sleepQualityDemographics.render();
        });

        // lifestyleBtn.on('click', async () => {
        //     this.switchSection(lifestyleBtn, lifestyleSection);
        //     await this.activitySweetSpot.render();
        //     await this.stressSleepSteps.render();
        //     await this.bmiSleepProfile.render();
        // });

        cardiovascularBtn.on('click', async () => {
            this.switchSection(cardiovascularBtn, cardiovascularSection);
            await this.correlationMatrix.render();
            await this.bloodPressureSleepPatterns.render();
        });

        // disordersBtn.on('click', async () => {
        //     this.switchSection(disordersBtn, disordersSection);
        //     await this.disorderDashboard.render();
        //     await this.occupationalRisk.render();
        // });
    }

    private switchSection(activeBtn: d3.Selection<d3.BaseType, unknown, HTMLElement, any>, 
                         activeSection: d3.Selection<d3.BaseType, unknown, HTMLElement, any>): void {
        d3.selectAll('.nav-btn').classed('active', false);
        d3.selectAll('.category-section').classed('active', false);
        
        activeBtn.classed('active', true);
        activeSection.classed('active', true);
    }

    private initializeControls(): void {
        const demographicSelect = d3.select('#demographic-select');
        demographicSelect.on('change', async () => {
            const selectedGrouping = (demographicSelect.node() as HTMLSelectElement).value as 'age' | 'gender' | 'occupation';
            await this.sleepQualityDemographics.updateGrouping(selectedGrouping);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new App();
});