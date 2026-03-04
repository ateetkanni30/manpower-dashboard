# Manpower Utilization Dashboard

An interactive workforce analytics dashboard built with React, Recharts, and Vite. Provides real-time insights into headcount, utilization, and workforce composition.

![Dashboard Preview](preview.png)

## Features

- **9 KPI Cards** — Total HC, Production HC, Non-Production, Utilization %, Expected Utilization %, Offshore/Onsite Utilization, Pending Subcon
- **Utilization Trend** — Monthly actual utilization line chart
- **Waterfall Charts** — Utilization and Headcount walk between any two months (New Hires, Attrition, Releases, Existing Additions)
- **HC Trends** — Total and Prod/Non-Prod bar charts with toggle
- **Employee Distribution** — Donut chart with Job Level / Experience toggle
- **JL Filter** — Filter all metrics by Job Level
- **CSV Upload** — Upload your own workforce data
- **Dark mode** glassmorphism design

## Quick Start

```bash
npm install
npm run dev
```

## Deploy to GitHub Pages

### One-time setup:
1. Create a GitHub repo named `manpower-dashboard`
2. Update `base` in `vite.config.js` to match your repo name
3. Push code to GitHub

### Deploy:
```bash
npm run build
npm run deploy
```

Your dashboard will be live at: `https://<your-username>.github.io/manpower-dashboard/`

### Step-by-step Git commands:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/manpower-dashboard.git
git push -u origin main
npm run build
npm run deploy
```

## Data Format

Upload a CSV with these columns:

| Column | Description |
|--------|-------------|
| EmpNo | Unique employee ID |
| EmpPU | Business unit code |
| MasterCustomerCode | Customer/account code |
| JoiningDate | Employee join date |
| MasterProjectCode | Project code |
| ProjectType | P(xxx)=Production, B(BCH)=Bench, L(LEV)=Leave, N(TRN)=Training |
| Onsite_Offshore | Onsite or Offshore |
| RoleMapping | Job Level (2-7, Subcon) |
| TotalExpInYears | Total experience in years |
| AsOfDate | Snapshot date (YYYY-MM-DD, last day of month) |

## Metric Logic

| Metric | Formula |
|--------|---------|
| Utilization % | Production HC / Total HC × 100 |
| Expected Utilization % | (Prod HC + Non-Prod Subcons) / Total HC × 100 |
| Pending Subcon | Count of Subcons on Non-Production |
| Offshore/Onsite Utilz | Respective Prod / Respective Total × 100 |
| Walk - New Hires | (From Prod + NH Prod) / (From Total + NH Total) − Base Utilz |
| Walk - Attrition | (From Prod − Att Prod) / (From Total − Att Total) − Base Utilz |
| Walk - Releases | (From Prod − Releases) / From Total − Base Utilz |
| Walk - Existing Addn | (From Prod + Additions) / From Total − Base Utilz |

## Tech Stack

- React 18 + Vite
- Recharts for visualizations
- PapaParse for CSV parsing
- Deployed via GitHub Pages

## License

MIT
