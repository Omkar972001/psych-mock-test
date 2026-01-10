const fs = require('fs');
const path = require('path');

const DIR = 'c:\\Users\\krish\\.gemini\\antigravity\\scratch\\psych_mock_test';

function loadJSON(filename) {
    return JSON.parse(fs.readFileSync(path.join(DIR, filename), 'utf8'));
}

function saveJSON(filename, data) {
    fs.writeFileSync(path.join(DIR, filename), JSON.stringify(data, null, 4), 'utf8');
    console.log(`Saved ${filename}`);
}

function refineTest4() {
    console.log("Refining Test 4 Passages...");
    const data = loadJSON('psych_test_04.json');
    let fixed = 0;

    if (!data.passages) return;

    // Fix Passage 91-95 (Table)
    if (data.passages['passage_91_95']) {
        let pText = data.passages['passage_91_95'];
        // Ideally we want to identify the table part.
        // It starts after "The scores are given below."
        // And contains "Before After\n4 6\n..."

        const splitPhrase = "The scores are given below.";
        if (pText.includes(splitPhrase)) {
            const parts = pText.split(splitPhrase);
            const intro = parts[0].trim() + " " + splitPhrase;
            const tablePart = parts[1].trim(); // "Before \tAfter\n4 \t6..."

            // Construct HTML Table
            // Assuming tablePart is lines of data
            const lines = tablePart.split('\n').map(l => l.trim()).filter(l => l).map(l => l.split(/\s+/));

            let tableHtml = `
            <div style="margin-top:1rem; overflow-x:auto;">
                <table style="width:100%; border-collapse: collapse; border: 1px solid #ddd; font-family: sans-serif;">
                    <thead>
                        <tr style="background-color: #f2f2f2;">
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Before</th>
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">After</th>
                        </tr>
                    </thead>
                    <tbody>`;

            // Skip header row if it's "Before After" in the text data, or handle it?
            // The split might leave "Before After" as the first line.
            lines.forEach(row => {
                if (row.length >= 2) {
                    const c1 = row[0];
                    const c2 = row[1];
                    // Naive check if header
                    if (c1.toLowerCase() === 'before' || c2.toLowerCase() === 'after') return;

                    tableHtml += `
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${c1}</td>
                            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${c2}</td>
                        </tr>`;
                }
            });

            tableHtml += `
                    </tbody>
                </table>
            </div>`;

            data.passages['passage_91_95'] = `${intro}<br>${tableHtml}`;
            fixed++;
            console.log("- Formatted Table in Passage 91-95");
        }
    }

    // Fix Passage 96-100 (Unnecessary spaces)
    if (data.passages['passage_96_100']) {
        let pText = data.passages['passage_96_100'];
        // Remove multiple newlines/spaces
        // pText has "\n\n\n\ntype of support"
        let newText = pText.replace(/\n\s*\n/g, "\n"); // Collapse multiple blank lines
        newText = newText.replace(/\n/g, " "); // Join lines? Or just clean up?
        // Usually these PDF dumps have hard wraps. Joining them makes it flow better.
        // Let's replace single newlines with spaces, but keep double newlines if they mark paragraphs.

        // Strategy: 
        // 1. Replace \r\n with \n
        // 2. Replace \n\n+ with <PARAGRAPH_BREAK>
        // 3. Replace single \n with " "
        // 4. Replace <PARAGRAPH_BREAK> with \n\n

        // However, the user specifically complained about "unnessery space".
        // Looking at the view_file output:
        // "instructional process was developed in which the more knowledgeable partner adjusts the amount and\n\n\n\ntype of support"
        // This looks like a page break artifact.

        newText = pText.replace(/\n+/g, " "); // Just collapse everything to single spaces for now?
        // Or better, handle the specific artifact.

        // Let's just normalize whitespace completely.
        newText = newText.replace(/\s+/g, " ").trim();

        data.passages['passage_96_100'] = newText;
        fixed++;
        console.log("- Cleaned whitespace in Passage 96-100");
    }

    if (fixed > 0) saveJSON('psych_test_04.json', data);
    else console.log("- No changes needed for Test 4 refinement");
}

refineTest4();
