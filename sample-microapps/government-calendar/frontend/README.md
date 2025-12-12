# Government Calendar 

A simple React + Vite + TailwindCSS calendar app that displays **Sri Lanka government holidays** from JSON files (`/events/2023.json`, `2024.json`, `2025.json`, …).  

The calendar:  
- Highlights **public, bank, and mercantile holidays** with different colors  
- Marks **today’s date** with a neutral box  
- Allows navigating between **months & years**  
- Dynamically loads the right events JSON file based on the selected year  

## Setup & Development

### 1. Clone the repo
```bash
git clone <repo-link>
cd government-calendar
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run locally
```bash
npm run dev
```


## Build to insert in the Super App

```bash
npm run build
```
- This will generate a dist/ folder containing the index.html 
- The index.html file should be zipped and added in the superapp database (micro_apps) in order to view the government-calendar within the superapp.

To preview:
```bash
npm run preview
```



