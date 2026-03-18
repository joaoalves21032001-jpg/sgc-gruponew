import pg from 'pg';
const { Client } = pg;

const user = "postgres"; // Standard postgres user
const password = encodeURIComponent("19212527121973aA@");
const host = "db.cfqtbvkiegwmzkzmpojt.supabase.co"; // Direct host
const port = 5432;
const database = "postgres";

const connectionString = `postgresql://${user}:${password}@${host}:${port}/${database}`;

const client = new Client({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

const sql = process.argv[2];
if (!sql) {
  console.error("Please provide a SQL query as an argument.");
  process.exit(1);
}

async function run() {
  try {
    await client.connect();
    console.log("Connected to database");
    console.log(`Executing: ${sql}`);
    const res = await client.query(sql);
    console.log("Result:");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error("Error executing SQL:");
    console.dir(err);
  } finally {
    await client.end();
  }
}

run();
