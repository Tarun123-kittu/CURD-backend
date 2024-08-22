const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const dotenv = require('dotenv');
const app = express();
const port = 8000;

// Load environment variables
dotenv.config();

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.static(`${__dirname}/public`));
app.use(express.json());
app.use(express.text());
app.use(express.urlencoded({ extended: true }));

// Database connection
let connection;
(async function initializeDbConnection() {
  try {
    connection = await mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    // Test the connection
    await connection.query('SELECT 1');
    console.log('Database connection established successfully.');
  } catch (error) {
    console.error('Error establishing database connection:', error);
    process.exit(1); // Exit the process with failure
  }
})();

// API endpoint
app.get('/api/weekly-summary', async (req, res) => {

  const { startDate, endDate } = req.query;
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const formatDate = date => date.toISOString().split('T')[0];
  const queryStartDate = startDate ? startDate : formatDate(startOfMonth);
  const queryEndDate = endDate ? endDate : formatDate(endOfMonth);

  try {
    const query = `
        SELECT 
            DAYNAME(date) AS DayOfWeek, 
            SUM(total_time_cumulative) AS TotalGuests, 
            SUM(total_turnout) / 3600 AS TotalTimeoutHours
        FROM 
            chart
        WHERE 
            date BETWEEN COALESCE(?, DATE_FORMAT(CURDATE(), '%Y-%m-01')) 
                     AND COALESCE(?, LAST_DAY(CURDATE())) 
        GROUP BY 
            DAYOFWEEK(date)
        ORDER BY 
            FIELD(DAYOFWEEK(date), 2, 3, 4, 5, 6, 7, 1); 
    `;

    const [rows] = await connection.execute(query, [queryStartDate, queryEndDate]);
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
