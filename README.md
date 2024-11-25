# Impdatahub - a data analisis website
### Description

**Impdatahub** is a comprehensive data analytics platform designed to streamline the analysis of metrics across various business domains. The platform tackles the challenges of managing and visualizing data from diverse sources by providing an automated workflow for data extraction, processing, and presentation. With interactive dashboards and a responsive interface, Impdatahub ensures data-driven insights are accessible and actionable for businesses of all sizes.

Built with **Django**, **Next.js**, and **PlotlyJS**, this solution integrates backend robustness with a dynamic frontend, offering seamless data visualization and user-friendly navigation.

## Technologies
<h3 align="center">⚒️ Languages-Frameworks-Tools ⚒️</h3>
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

## Architecture Overview
- **Backend:** Built with Django REST Freamework, featuring modularized apps for scalability.
- **Frontend:** Developed with Next.js for server-side rendering and React components.
- **Database:** PostgreSQL with relational modeling for business insights.
- **Data Processing:** Web scraping and automation pipelines using Selenium and Python scripts.


## Screenshots
Note: The charts displayed in the screenshots are intentionally left empty for security reasons, as this is a real project currently under development.

![Login Page](./images/Login%20pages.png)
![Example of page](./images/Ranking%20clients.png)
![Another example](./images/List%20of%20clients.png)

## Getting Started
### Prerequisites
1. Install Python
2. Create and run a new virtual enviroment

```bash
python venv venv
python venv/Scrips/activate #or venv/bin/activate for ubuntu
```

3. Install dependencies: `pip install -r requirements.txt`
4. Navigate to the front-end files: `cd .\next-frontend\`
5. Install dependencies: `npm install`

### Run Locally
at the Django app base dir (imptadahub) with the venv activated
```bash
(venv) python manage.py runserver
```

now run the NextJS server in the "next-frontend" dir
```bash
cd ./next-frontend/
npm run build # use "run dev" in case you want a development env
npm start
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Lessons Learned
- Gained foundational knowledge of integrating Django and React to build a seamless full-stack application.
- Mastered setting up and configuring a Next.js project from scratch, including learning how to build and deploy it effectively.
- Learned to create and customize interactive data visualizations using PlotlyJS, enhancing data interpretation and user experience.
- Developed skills in setting up and automating data extraction pipelines with Selenium, enabling efficient integration with sales platforms.
- Acquired experience in database design and management with PostgreSQL, focusing on scalable and efficient data storage.
- Strengthened understanding of frontend frameworks (React, TailwindCSS) and their application in responsive design.
- Enhanced problem-solving abilities by tackling real-world challenges in a complex, multi-technology environment.


