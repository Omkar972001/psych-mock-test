const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'psych_test_03.json'); // Already partly cleaned by previous run

try {
    const rawContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(rawContent);

    const q11 = data.questions.find(q => q.id === 11);

    console.log("Q11 Text Length:", q11.text.length);
    console.log("Q11 Text Snippet (Last 200 chars):");
    console.log(JSON.stringify(q11.text.substring(q11.text.length - 200)));

    // Test Regex
    const remaining = q11.text;
    const match = remaining.match(/\(A\)\s*([\s\S]*?)\s*\((B)\)\s*([\s\S]*?)\s*\((C)\)\s*([\s\S]*?)\s*\((D)\)\s*([\s\S]*)/i);
    console.log("Regex Match:", !!match);

    const lastA = q11.text.lastIndexOf('(A) ');
    console.log("LastIndexOf (A) :", lastA);

} catch (e) {
    console.error(e);
}
