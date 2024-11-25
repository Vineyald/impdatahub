# Impdatahub - a data analisis website
A [brief description] that solves [problem/challenge]. Built with [Django, Next.js, PlotlyJs].

## Technologies
<h2 align="center">⚒️ Languages-Frameworks-Tools ⚒️</h2>
<br/>
<div align="center">
    <img src="https://skillicons.dev/icons?i=react,bootstrap,django,html,css,vscode,github,tailwind,git" />
    <img src="https://skillicons.dev/icons?i=nodejs,python,javascript,typescript,postgres,nextjs" /><br>
</div>

## Features
- Multiple pages for metric analysis across different business sectors, such as customers, products, sales, and vendors.
- Web scraping using Selenium for data extraction from sales management platforms (Tiny/Olist).
- Automation of data processing for a PostgreSQL database.
- Interactive charts for data analysis.
- Suport for any device. 

## Screenshots
![Login Page](./docs/screenshots/login.png)
![Dashboard](./docs/screenshots/dashboard.png)

## Getting Started
### Prerequisites
1. Install Python
2. Install dependencies: `pip install -r requirements.txt`
3. Navigate to the front-end files: `cd .\next-frontend\`
4. Install dependencies: `npm install`

### Run Locally
at the Django app base dir (imptadahub)
```bash
python manage.py runserver
```

now run the Next server in the "next-frontend" dir
```bash
npm run build # use run dev in case you want a development env
npm start
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Lessons Learned
- Learned integration of Django + React.
- How to implement and drop a Next.Js project
- How to work with data plotting using PlotlySJ


