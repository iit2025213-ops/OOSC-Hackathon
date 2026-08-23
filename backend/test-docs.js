import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function testQuery() {
  console.log("Fetching cases...");
  const { data: cases, error: casesError } = await supabase
    .from('cases')
    .select('id, title');
    
  if (casesError) {
    console.error("casesError", casesError);
    return;
  }
  
  if (!cases || cases.length === 0) {
    console.log("no cases");
    return;
  }

  const caseIds = cases.map(c => c.id);
  console.log("caseIds:", caseIds);

  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('id, case_id, role, content, created_at')
    .in('case_id', caseIds)
    .eq('role', 'assistant')
    .order('created_at', { ascending: false });

  if (msgError) {
    console.error("msgError", msgError);
    return;
  }

  console.log(`Found ${messages?.length || 0} messages.`);
}

testQuery();
