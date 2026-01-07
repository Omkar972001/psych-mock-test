const fs = require('fs');

const dump = fs.readFileSync('pdf_full_dump.txt', 'utf8');

function parseKeyBlock(text) {
    const clean = text.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ');
    const answers = {};
    const regex = /(\d+)\s+([A-D](?:[,&][A-D])*|WQ|Cancelled|Dropped)/gi;
    let match;
    while ((match = regex.exec(clean)) !== null) {
        const qNo = parseInt(match[1]);
        let ans = match[2];
        ans = ans.replace(/&/g, ',');
        if (ans === 'WQ' || ans === 'Cancelled' || ans === 'Dropped') {
            ans = 'A,B,C,D';
        }
        answers[qNo] = ans;
    }
    return answers;
}

console.log("Extracting keys...");

// Test 1
const p1Match = dump.match(/MARCH_2023[\s\S]*?ANSWER KEY\s*Q\.NO\.\s*ANS([\s\S]*?)--- PAGE/i);
const key1 = p1Match ? parseKeyBlock(p1Match[1]) : {};
console.log("Key 1 items:", Object.keys(key1).sort((a, b) => a - b).join(', '));
console.log("Raw match snippet:", p1Match ? p1Match[1].substring(0, 200) : "NULL");

// Test 2
const p2Match = dump.match(/SEPTEMBER_\s*2022[\s\S]*?ANSWER KEY\s*Q\s*\.\s*NO\.([\s\S]*?)--- PAGE/i);
const key2 = p2Match ? parseKeyBlock(p2Match[1]) : {};
console.log("Key 2 items:", Object.keys(key2).length);

// Test 4
const p4Match = dump.match(/JUNE 2020[\s\S]*?ANSWER KEY([\s\S]*?)(?:---|Q\.1)/i); // Adjusted regex to stop at next Q or ---
const key4 = p4Match ? parseKeyBlock(p4Match[1]) : {};
console.log("Key 4 items:", Object.keys(key4).length);
