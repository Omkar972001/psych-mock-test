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

function fixTest6() {
    console.log("Fixing Test 6...");
    const data = loadJSON('psych_test_06.json');
    let fixed = 0;

    const q29 = data.questions.find(q => q.id === 29);
    if (q29 && q29.options[0] === '𝛽𝛽') {
        q29.options[0] = '𝛽';
        fixed++;
        console.log("- Fixed Q29 options[0]");
    }

    if (fixed > 0) saveJSON('psych_test_06.json', data);
    else console.log("- No changes needed for Test 6");
}

function fixTest5() {
    console.log("Fixing Test 5...");
    const data = loadJSON('psych_test_05.json');
    let fixed = 0;

    // Q5 Formula Fixes
    const q5 = data.questions.find(q => q.id === 5);
    if (q5) {
        // Cleaning up the options based on visual look-alikes
        q5.options = [
            "Variance = ( ΣX - ΣX̄ )² / N",
            "Variance = Σ(X - X̄)² / N",
            "Variance = ( ΣX - X̄ )² / N²",
            "Variance = ( ΣX² - X̄² ) / N"
        ];
        // Ensure answer is still B (as per original)
        console.log("- Fixed Q5 formulas");
        fixed++;
    }

    // Newline Fixes
    data.questions.forEach(q => {
        if (q.question && q.question.includes("Choose the most appropriate answer")) {
            q.question = q.question.replace(/Choose the most appropriate answer/g, "\n\nChoose the most appropriate answer");
            // Fix double newlines just in case
            q.question = q.question.replace(/\n\n\n/g, "\n\n");
            // Also put (a), (b) on new lines if clustered? 
            // The request specifically mentioned "should come in different line" for the instructions.
            fixed++;
        }

        // Also fix "Choose the correct answer..."
        if (q.question && q.question.includes("Choose the correct answer")) {
            q.question = q.question.replace(/Choose the correct answer/g, "\n\nChoose the correct answer");
            q.question = q.question.replace(/\n\n\n/g, "\n\n");
            fixed++;
        }
    });

    if (fixed > 0) saveJSON('psych_test_05.json', data);
    else console.log("- No changes needed for Test 5");
}

function fixTest4() {
    console.log("Fixing Test 4...");
    const data = loadJSON('psych_test_04.json');
    let fixed = 0;

    // Q16 Formula Fix
    const q16 = data.questions.find(q => q.id === 16);
    if (q16) {
        q16.text = q16.text.replace(/K = 𝑓𝑓𝑜𝑜 −𝑓𝑓𝑐𝑐 N−𝑓𝑓𝑐𝑐/, "K = (fo - fc) / (N - fc)");
        console.log("- Fixed Q16 formula");
        fixed++;
    }

    // Q57 Formatting
    const q57 = data.questions.find(q => q.id === 57);
    if (q57 && !q57.options) {
        // Text contains: ... options given below: (A) ... (B) ... (C) ... (D) ...
        const text = q57.text;
        const splitPoint = text.indexOf("(A) Both");
        if (splitPoint !== -1) {
            const mainText = text.substring(0, splitPoint).trim();
            const optsText = text.substring(splitPoint);

            // Extract options A, B, C, D
            // Form is (A) ... (B) ... (C) ... (D) ...
            const struct = {};
            const keys = ['A', 'B', 'C', 'D'];

            let lastIdx = 0;
            keys.forEach((k, i) => {
                const nextK = keys[i + 1];
                const start = optsText.indexOf(`(${k})`);
                const end = nextK ? optsText.indexOf(`(${nextK})`) : optsText.length;

                if (start !== -1) {
                    let val = optsText.substring(start + 3, end).trim(); // +3 for (A) space
                    struct[k] = val;
                }
            });

            q57.text = mainText;
            q57.options = struct;
            console.log("- Fixed Q57 formatting");
            fixed++;
        }
    }

    // Passage Extraction logic
    // Helper to add passage
    if (!data.passages) data.passages = {};

    // Q91-95 Passage in Q90
    const q90 = data.questions.find(q => q.id === 90);
    // Looking for pattern "(91-95)" in the last option usually
    let q90OptD = q90.options['D'];
    if (q90OptD && q90OptD.includes('(91-95)')) {
        const parts = q90OptD.split('(91-95)');
        q90.options['D'] = parts[0].trim();

        let pText = parts[1].trim();
        // Remove "-- 96 of 202 --" artifacts if any (though that's usually later)

        const pId = "passage_91_95";
        data.passages[pId] = pText;
        console.log("- Extracted Passage 91-95");

        // Link questions
        for (let i = 91; i <= 95; i++) {
            const q = data.questions.find(x => x.id === i);
            if (q) q.passageId = pId;
        }
        fixed++;
    }

    // Q96-100 Passage in Q95
    const q95 = data.questions.find(q => q.id === 95);
    // Careful: The prompt said Q95 last option? Q95 Answer is A usually.
    // Let's check where the passage text is.
    // "and 96-100 should have passage which is mistakenly added to Q95 last option"
    // Wait, Q95 answer is 'A'. It might be in 'D' or 'A'.
    // Let's search all options of Q95 for "(96-100)"
    if (q95) {
        for (const [key, val] of Object.entries(q95.options)) {
            if (val && val.includes('(96-100)')) {
                const parts = val.split('(96-100)');
                q95.options[key] = parts[0].trim();

                let pText = parts[1].trim();
                // Clean page number artifacts common in this dump
                pText = pText.replace(/-- \d+ of \d+ --/g, "");

                const pId = "passage_96_100";
                data.passages[pId] = pText;
                console.log(`- Extracted Passage 96-100 from Option ${key}`);

                for (let i = 96; i <= 100; i++) {
                    const q = data.questions.find(x => x.id === i);
                    if (q) q.passageId = pId;
                }
                fixed++;
                break;
            }
        }
    }

    // Newline Fixes
    data.questions.forEach(q => {
        if (q.text && q.text.includes("Choose the most appropriate answer")) {
            q.text = q.text.replace(/Choose the most appropriate answer/g, "\n\nChoose the most appropriate answer");
            q.text = q.text.replace(/\n\n\n/g, "\n\n");
            fixed++;
        }
        if (q.text && q.text.includes("Choose the correct answer")) {
            q.text = q.text.replace(/Choose the correct answer/g, "\n\nChoose the correct answer");
            q.text = q.text.replace(/\n\n\n/g, "\n\n");
            fixed++;
        }
    });

    if (fixed > 0) saveJSON('psych_test_04.json', data);
    else console.log("- No changes needed for Test 4");
}

try {
    fixTest6();
    fixTest5();
    fixTest4();
    console.log("Done!");
} catch (e) {
    console.error("Error:", e);
}
