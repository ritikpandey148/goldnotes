// db.js
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Optional: test connection on start
pool.connect((err, client, release) => {
  if (err) {
    console.log("❌ DB Connection Failed");
    console.log(err);
  } else {
    console.log("✅ PostgreSQL Connected Successfully");
    release();
  }
});

module.exports = pool;