# Information Visualization with D3.js and TypeScript

Interactive data visualization demos built with D3.js and TypeScript, featuring modern web technologies and responsive design.

## Features

- **Interactive Bar Chart**: Dynamic dataset switching with smooth animations
- **Interactive Scatter Plot**: Hover effects, color coding, and customizable color scales
- **Responsive Design**: Clean, modern UI that works across devices
- **TypeScript**: Full type safety and modern JavaScript features
- **Smooth Animations**: Engaging transitions and hover effects

## Demos

### Bar Chart
- Switch between different datasets (Sales, Population, Revenue)
- Hover tooltips with detailed information
- Smooth animations on data updates
- Responsive scaling with formatted values

### Scatter Plot
- Interactive hover effects with enlarged points
- Color coding by category or continuous value scale
- Legend for categorical data
- Detailed tooltips with multi-line information

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone git@github.com:rjefsen/information-visualization.git
cd information-visualization
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Project Structure

```
├── src/
│   ├── main.ts          # Main application entry point
│   ├── barChart.ts      # Bar chart implementation
│   └── scatterPlot.ts   # Scatter plot implementation
├── index.html           # Main HTML file
├── style.css           # Application styles
├── package.json        # Project dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── vite.config.ts      # Vite bundler configuration
└── README.md           # This file
```

## Technologies Used

- **D3.js v7** - Data visualization library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and development server
- **HTML5/CSS3** - Modern web standards

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run type-check` - Type check without emitting files

## Browser Support

Modern browsers with ES2020 support:
- Chrome 80+
- Firefox 72+
- Safari 13.1+
- Edge 80+

## License

MIT License - see LICENSE file for details