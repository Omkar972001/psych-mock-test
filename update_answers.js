const fs = require('fs');

const dump = fs.readFileSync('pdf_full_dump.txt', 'utf8');

function parseKeyBlock(text) {
    // Matches "1 A", "2 B", "53 D, A", "93 A&C", "25 A,B,C,D"
    // Normalize text
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

// Test 1: Match from "MARCH_2023" ... "ANSWER KEY" ... until "SEPTEMBER_"
const p1Match = dump.match(/MARCH_2023[\s\S]*?ANSWER KEY([\s\S]*?)SEPTEMBER_/i);
const key1 = p1Match ? parseKeyBlock(p1Match[1]) : {};
console.log("Key 1 items:", Object.keys(key1).length);

// Test 2: Match from "SEPTEMBER_ 2022" ... "ANSWER KEY" ... until "JUNE 2020" or "JUNE" ?
// Let's check what comes after Sept 2022. It is June 2020 or Dec 2019?
// I'll assume the next major header or long lookahead.
// Based on log line 63: SEPTEMBER_.
// Based on logs, Test 4 is June 2020.
// So I will look until "JUNE".
const p2Match = dump.match(/SEPTEMBER_\s*2022[\s\S]*?ANSWER KEY([\s\S]*?)JUNE/i);
const key2 = p2Match ? parseKeyBlock(p2Match[1]) : {};
console.log("Key 2 items:", Object.keys(key2).length);

// Test 4: Match from "JUNE 2020" ... "ANSWER KEY" ... until next paper or EOF.
// Look for "Question Paper" or "DECEMBER"
const p4Match = dump.match(/JUNE 2020[\s\S]*?ANSWER KEY([\s\S]*?)(?:Question Paper|DECEMBER|--- PAGE 120|To get free)/i);
const key4 = p4Match ? parseKeyBlock(p4Match[1]) : {};
console.log("Key 4 items:", Object.keys(key4).length);


function updateFile(filename, keyMap) {
    if (!fs.existsSync(filename)) {
        console.log(`File not found: ${filename}`);
        return;
    }
    const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
    let updatedCount = 0;

    data.questions.forEach(q => {
        if (keyMap[q.id]) {
            const newAns = keyMap[q.id];

            // Check current answer
            let current = q.answer;
            if (current && typeof current === 'string' && current.endsWith(',')) {
                current = current.slice(0, -1);
            }

            if (current !== newAns) {
                // console.log(`  Q${q.id}: '${q.answer}' -> '${newAns}'`);
                q.answer = newAns;
                updatedCount++;
            }
        }
    });

    fs.writeFileSync(filename, JSON.stringify(data, null, 4));
    console.log(`Updated ${filename}: ${updatedCount} answers changed/fixed.`);
}

console.log("Starting Update...");
updateFile('psych_test_01.json', key1);
updateFile('psych_test_02.json', key2);
updateFile('psych_test_04.json', key4);
console.log("Update Complete.");
