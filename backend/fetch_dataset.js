import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function fetchAllData() {
  console.log("Fetching dataset file list from Hugging Face Hub...");
  const dataset = 'shrijayan/gov_myscheme';
  
  try {
    const treeUrl = `https://huggingface.co/api/datasets/${dataset}/tree/main`;
    let files = await fetchJSON(treeUrl);
    
    // If there is a text_data folder, fetch its contents too
    const textDataDir = files.find(f => f.type === 'directory' && f.path === 'text_data');
    if (textDataDir) {
      console.log("Found text_data directory, fetching its contents...");
      const subTreeUrl = `https://huggingface.co/api/datasets/${dataset}/tree/main/text_data`;
      const subFiles = await fetchJSON(subTreeUrl);
      files = files.concat(subFiles);
    }
    
    // Look for JSON or CSV
    let dataFile = files.find(f => f.path.endsWith('.json'));
    if (!dataFile) dataFile = files.find(f => f.path.endsWith('.csv'));
    
    if (!dataFile) {
      console.log("Files found in repo:", files.map(f => f.path));
      throw new Error("Could not find a .json or .csv file in the dataset repository.");
    }
    
    console.log(`Found data file: ${dataFile.path}`);
    console.log(`Downloading ${dataFile.path}...`);
    
    // Download raw file
    const rawUrl = `https://huggingface.co/datasets/${dataset}/resolve/main/${dataFile.path}`;
    
    // Use https to stream it directly to a file
    const outputPath = path.join(__dirname, 'myscheme' + (dataFile.path.endsWith('.csv') ? '.csv' : '.json'));
    const fileStream = fs.createWriteStream(outputPath);
    
    https.get(rawUrl, (response) => {
      response.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`Successfully downloaded dataset to ${outputPath}`);
        // Let's verify it
        const stats = fs.statSync(outputPath);
        console.log(`File size: ${stats.size} bytes`);
        
        try {
          const data = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
          console.log(`Successfully parsed JSON. Contains ${data.length || Object.keys(data).length} records.`);
        } catch(e) {
          console.log("File downloaded but could not parse as JSON array immediately:", e.message);
        }
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {});
      console.error("Error downloading file:", err);
    });

  } catch (error) {
    console.error("Error fetching dataset:", error);
  }
}

fetchAllData();
