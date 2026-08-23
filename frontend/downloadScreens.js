import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screens = [
  {
    name: "Landing_Page_Brightened",
    url: "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1OTc2OWMzYzYzYzUwMzM4NGIyM2NlMjQ3YjNlEgsSBxDP4Pj78hUYAZIBJAoKcHJvamVjdF9pZBIWQhQxNjE5NTE5MzUwNDcyNTYyMjA2Mg&filename=&opi=89354086"
  },
  {
    name: "Home",
    url: "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1OTc2ODc0OGQ0NjIwNmYxYzliYzllMGVmMTIyEgsSBxDP4Pj78hUYAZIBJAoKcHJvamVjdF9pZBIWQhQxNjE5NTE5MzUwNDcyNTYyMjA2Mg&filename=&opi=89354086"
  },
  {
    name: "Case_Overview",
    url: "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1OTc2ODZiMTdlOWMwMWE2MjgwYzkyMWY1YWJkEgsSBxDP4Pj78hUYAZIBJAoKcHJvamVjdF9pZBIWQhQxNjE5NTE5MzUwNDcyNTYyMjA2Mg&filename=&opi=89354086"
  },
  {
    name: "Action_Plan",
    url: "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1OTc2ODc1ZDc5ZmQwMWE2MmRiM2Y3M2IxNTk1EgsSBxDP4Pj78hUYAZIBJAoKcHJvamVjdF9pZBIWQhQxNjE5NTE5MzUwNDcyNTYyMjA2Mg&filename=&opi=89354086"
  },
  {
    name: "Landing_Page_Original",
    url: "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1OTc2N2FmZWU5NzUwMWVlN2M3YmI2MmIwODg1EgsSBxDP4Pj78hUYAZIBJAoKcHJvamVjdF9pZBIWQhQxNjE5NTE5MzUwNDcyNTYyMjA2Mg&filename=&opi=89354086"
  },
  {
    name: "Guided_Intake",
    url: "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1OTc2ODZjMDFhZTEwMjJkNGM5ZTk0MjZiMjlkEgsSBxDP4Pj78hUYAZIBJAoKcHJvamVjdF9pZBIWQhQxNjE5NTE5MzUwNDcyNTYyMjA2Mg&filename=&opi=89354086"
  },
  {
    name: "Authentication",
    url: "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1OTc2ODY5MTI2ZGIwMWE2MmRiM2Y3M2IxNTk1EgsSBxDP4Pj78hUYAZIBJAoKcHJvamVjdF9pZBIWQhQxNjE5NTE5MzUwNDcyNTYyMjA2Mg&filename=&opi=89354086"
  }
];

const downloadDir = path.join(__dirname, 'src', 'screens');

// Create the directory if it doesn't exist
if (!fs.existsSync(downloadDir)){
    fs.mkdirSync(downloadDir, { recursive: true });
}

console.log(`Downloading ${screens.length} screens into ${downloadDir}...\n`);

screens.forEach(screen => {
  const filePath = path.join(downloadDir, `${screen.name}.html`);
  const file = fs.createWriteStream(filePath);
  
  https.get(screen.url, (response) => {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log(`✅ Successfully downloaded: ${screen.name}.html`);
    });
  }).on('error', (err) => {
    fs.unlink(filePath, () => {}); // Delete the file async
    console.error(`❌ Error downloading ${screen.name}: ${err.message}`);
  });
});
// hi bro
