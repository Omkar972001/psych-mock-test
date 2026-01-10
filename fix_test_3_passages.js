const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'psych_test_03.json');

try {
    const rawContent = fs.readFileSync(filePath, 'utf8');
    let data = JSON.parse(rawContent);

    if (!data.passages) {
        data.passages = {};
    }

    let modified = false;

    // --- Process Q90 for Passage 91-95 ---
    const q90 = data.questions.find(q => q.id === 90);
    if (q90 && q90.options && q90.options.D && q90.options.D.includes('Comprehension:')) {
        const fullText = q90.options.D;
        const splitIndex = fullText.indexOf('Comprehension:');

        const cleanOption = fullText.substring(0, splitIndex).trim();
        const passageText = fullText.substring(splitIndex).trim(); // Keep "Comprehension: ..." header or strip it?
        // Let's strip "Comprehension: (91-95) " to make it cleaner, or keep it as title.
        // In Test 2, we kept the text. Let's keep it but maybe clean the newlines/formatting if needed.

        // Actually, let's keep it simple: Extract everything from "Comprehension:" onwards.

        q90.options.D = cleanOption;
        data.passages['p_91_95'] = passageText;

        // Link Q91-95
        for (let i = 91; i <= 95; i++) {
            const q = data.questions.find(q => q.id === i);
            if (q) q.passageId = 'p_91_95';
        }
        modified = true;
        console.log("Extracted Passage 91-95 from Q90");
    }

    // --- Process Q95 for Passage 96-100 ---
    const q95 = data.questions.find(q => q.id === 95);
    if (q95 && q95.options && q95.options.D && q95.options.D.includes('Comprehension:')) {
        const fullText = q95.options.D;
        const splitIndex = fullText.indexOf('Comprehension:');

        const cleanOption = fullText.substring(0, splitIndex).trim();
        const passageText = fullText.substring(splitIndex).trim();

        q95.options.D = cleanOption;
        data.passages['p_96_100'] = passageText;

        // Link Q96-100
        for (let i = 96; i <= 100; i++) {
            const q = data.questions.find(q => q.id === i);
            if (q) q.passageId = 'p_96_100';
        }
        modified = true;
        console.log("Extracted Passage 96-100 from Q95");
    }

    if (modified) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
        console.log("Successfully updated passages for Test 3.");
    } else {
        console.log("No passage merging found (already fixed?).");
    }

} catch (e) {
    console.error("Error processing file:", e);
}
