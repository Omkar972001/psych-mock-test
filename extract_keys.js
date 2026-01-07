const fs = require('fs');

const dump = fs.readFileSync('pdf_full_dump.txt', 'utf8');

// Helper to parse key block
function parseKeyBlock(text) {
    // Matches "1 A", "2 B", "53 D, A", "93 A&C", "25 A,B,C,D"
    // Normalize text
    const clean = text.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ');

    const answers = {};
    // Regex to find "Number Answer" pairs. 
    // Structure is usually: QNo Ans QNo Ans ...
    // Ans can be "A", "A,B", "A&C", "WQ" (Wrong Question?)

    // We look for patterns like: "1 A", "100 A"
    const regex = /(\d+)\s+([A-D](?:[,&][A-D])*|WQ|Cancelled|Dropped)/gi;

    let match;
    while ((match = regex.exec(clean)) !== null) {
        const qNo = parseInt(match[1]);
        let ans = match[2];
        // Normalize "A&C" to "A,C"
        ans = ans.replace(/&/g, ',');
        answers[qNo] = ans;
    }
    return answers;
}

// Extract based on page markers or known start text
// Test 1: March 2023. Key starts around Line 60 found in previous logs.
// Look for "ANSWER KEY Q.NO. ANS" after "MARCH_2023"
const p1Match = dump.match(/MARCH_2023[\s\S]*?ANSWER KEY\s*Q\.NO\.\s*ANS([\s\S]*?)--- PAGE/i);
const key1 = p1Match ? parseKeyBlock(p1Match[1]) : {};

// Test 2: Sept 2022. Key around Line 101.
// Look for "SEPTEMBER_ 2022" ... "ANSWER KEY Q . NO."
const p2Match = dump.match(/SEPTEMBER_\s*2022[\s\S]*?ANSWER KEY\s*Q\s*\.\s*NO\.([\s\S]*?)--- PAGE/i);
const key2 = p2Match ? parseKeyBlock(p2Match[1]) : {};

// Test 4: June 2020. Key around Line 217.
// Look for "JUNE 2020" ... "ANSWER KEY"
const p4Match = dump.match(/JUNE 2020[\s\S]*?ANSWER KEY([\s\S]*?)--- PAGE 109/i);
// Note: Page 108 is Dec 2019, so look until the end of this block.
const key4 = p4Match ? parseKeyBlock(p4Match[1]) : {};


console.log("Found Keys:");
console.log("Test 1 (March 2023):", Object.keys(key1).length, "items");
console.log(JSON.stringify(key1, null, 2));

console.log("\nTest 2 (Sept 2022):", Object.keys(key2).length, "items");
console.log(JSON.stringify(key2, null, 2));

console.log("\nTest 4 (June 2020):", Object.keys(key4).length, "items");
console.log(JSON.stringify(key4, null, 2));
