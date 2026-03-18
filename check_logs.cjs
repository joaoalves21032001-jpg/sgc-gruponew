require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkLogs() {
  const sql = `
  select id, function_edge_logs.timestamp, event_message, response.status_code, request.method, m.function_id, m.execution_time_ms, m.deployment_id, m.version from function_edge_logs
    cross join unnest(metadata) as m
    cross join unnest(m.response) as response
    cross join unnest(m.request) as request
    where (function_id = '193b3ddb-e2ac-4a98-a9d2-8def1f8513b6')
    order by timestamp desc
    limit 20
  `;
  
  // Actually, we can't query function_edge_logs directly via standard client because it's usually in a separate schema/project not exposed to standard data API.
  // Instead, let me query the newly added console.error which should also appear. But let's try the user's RPC idea if one exists.
  
  console.log("The user query is meant for the Supabase SQL Editor, which queries the logs database directly.");
  console.log("Since I cannot run it directly here easily without an RPC, let me look at the Edge Function code again.");
}

checkLogs();
