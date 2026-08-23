import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CENTRAL_FILE = path.join(__dirname, '../centralscheme.json');
const STATE_FILE = path.join(__dirname, '../statescheme.json');
const ENRICHED_FILE = path.join(__dirname, '../enriched_test.json');

function merge() {
  if (!fs.existsSync(ENRICHED_FILE)) {
    console.error("enriched_test.json not found! Ensure the enrich script has finished running.");
    return;
  }
  
  const enriched = JSON.parse(fs.readFileSync(ENRICHED_FILE, 'utf-8'));
  console.log(`[Merge] Loaded ${enriched.length} enriched schemes.`);

  // Create a fast lookup map by scheme_name since there are no unique IDs
  const enrichedMap = new Map();
  for (const s of enriched) {
    enrichedMap.set(s.scheme_name, s);
  }

  const central = JSON.parse(fs.readFileSync(CENTRAL_FILE, 'utf-8'));
  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));

  let centralUpdated = 0;
  for (let i = 0; i < central.length; i++) {
    if (enrichedMap.has(central[i].scheme_name)) {
      // Overwrite ONLY the eligibility criteria with the newly extracted AI data
      central[i].eligibility_criteria = enrichedMap.get(central[i].scheme_name).eligibility_criteria;
      centralUpdated++;
    }
  }

  let stateUpdated = 0;
  for (let i = 0; i < state.length; i++) {
    if (enrichedMap.has(state[i].scheme_name)) {
      // Overwrite ONLY the eligibility criteria with the newly extracted AI data
      state[i].eligibility_criteria = enrichedMap.get(state[i].scheme_name).eligibility_criteria;
      stateUpdated++;
    }
  }

  // Save the updated main files
  fs.writeFileSync(CENTRAL_FILE, JSON.stringify(central, null, 2));
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

  console.log(`[Merge] Successfully merged ${centralUpdated} into centralscheme.json`);
  console.log(`[Merge] Successfully merged ${stateUpdated} into statescheme.json`);
  console.log(`[Merge] Your entire database is now fully cleaned and updated!`);
}

merge();
