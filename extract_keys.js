
const fs = require('fs');
const path = require('path');

const dumpPath = path.join(__dirname, 'pdf_full_dump.txt');
const content = fs.readFileSync(dumpPath, 'utf8');
const lines = content.split('\n');

function extractPages(startMarker, endMarker) {
    const start = lines.findIndex(l => l.includes(startMarker));
    const end = lines.findIndex(l => l.includes(endMarker));

    if (start === -1 || end === -1) {
        console.log(`Could not find range ${startMarker} to ${endMarker}`);
        return;
    }

    console.log(`\n--- CONTENT FROM ${startMarker} TO ${endMarker} ---`);
    for (let i = start; i <= end; i++) {
        console.log(lines[i]);
    }
}

// Test 3 Key (Dec 2021) - Expected around Page 73-75
extractPages('--- PAGE 73 ---', '--- PAGE 75 ---');

// Test 4 Key (June 2020) - Expected around Page 108
extractPages('--- PAGE 108 ---', '--- PAGE 110 ---');
