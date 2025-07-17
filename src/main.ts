import * as d3 from 'd3';
import { CorrelationMatrix } from './correlationMatrix';
import { CategoryHeatmap } from './categoryHeatmap';

class App {
    private correlationMatrix: CorrelationMatrix | null = null;
    private categoryHeatmap: CategoryHeatmap | null = null;
    private selectedCategories: string[] = [];

    constructor() {
        // Add a small delay to ensure DOM is fully loaded
        setTimeout(() => {
            this.correlationMatrix = new CorrelationMatrix('#correlation-matrix', '#correlation-scatter');
            this.categoryHeatmap = new CategoryHeatmap('#category-heatmap');
            
            this.initializeCategorySelection();
            this.initializeApp();
        }, 100);
    }

    private async initializeApp(): Promise<void> {
        console.log('Initializing app...');
        try {
            if (this.correlationMatrix) {
                await this.correlationMatrix.render();
                console.log('Correlation matrix rendered');
            }
            if (this.categoryHeatmap) {
                this.categoryHeatmap.updateCategories('Sleep Duration', 'Quality of Sleep');
                console.log('Category heatmap rendered');
            }
        } catch (error) {
            console.error('Error initializing app:', error);
        }
    }

    private initializeCategorySelection(): void {
        const categoryButtons = d3.selectAll('.category-btn');
        const category1Display = d3.select('#category1-display');
        const category2Display = d3.select('#category2-display');
        const heatmapTitle = d3.select('#heatmap-title');
        const heatmapDescription = d3.select('#heatmap-description');

        console.log('Category buttons found:', categoryButtons.size());
        console.log('Category displays found:', category1Display.size(), category2Display.size());

        categoryButtons.on('click', (event, d) => {
            const target = event.target as HTMLElement;
            const category = target.dataset.category;
            
            if (!category) return;
            
            if (this.selectedCategories.length === 0) {
                this.selectedCategories.push(category);
                category1Display.text(category);
                target.classList.add('selected');
            } else if (this.selectedCategories.length === 1) {
                if (this.selectedCategories[0] === category) {
                    return;
                }
                this.selectedCategories.push(category);
                category2Display.text(category);
                target.classList.add('selected');
                
                heatmapTitle.text(`${this.selectedCategories[0]} vs ${this.selectedCategories[1]} Correlation`);
                heatmapDescription.text(`Distribution heatmap showing the relationship between ${this.selectedCategories[0]} and ${this.selectedCategories[1]}`);
                
                if (this.categoryHeatmap) {
                    this.categoryHeatmap.updateCategories(this.selectedCategories[0], this.selectedCategories[1]);
                }
            } else {
                categoryButtons.classed('selected', false);
                this.selectedCategories = [category];
                category1Display.text(category);
                category2Display.text('Select second category');
                heatmapTitle.text('Category Correlation Heatmap');
                heatmapDescription.text('Select two categories above to see their detailed correlation');
                target.classList.add('selected');
                
                if (this.categoryHeatmap) {
                    this.categoryHeatmap.render();
                }
            }
        });
    }

}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, checking elements...');
    console.log('correlation-matrix div:', document.querySelector('#correlation-matrix'));
    console.log('category-heatmap div:', document.querySelector('#category-heatmap'));
    console.log('category buttons:', document.querySelectorAll('.category-btn').length);
    
    new App();
});