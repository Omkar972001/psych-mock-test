const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'psych_test_02.json');

try {
    const rawContent = fs.readFileSync(filePath, 'utf8');
    let data = JSON.parse(rawContent);

    // Initialize passages object if missing
    if (!data.passages) {
        data.passages = {};
    }

    // Helper to extract passage and clean option
    function extractPassage(qIndex, optionKey, passageId, rangeStart, rangeEnd) {
        const q = data.questions.find(q => q.id === qIndex);
        if (!q || !q.options[optionKey]) {
            console.error(`Question ${qIndex} or Option ${optionKey} not found.`);
            return;
        }

        const optionText = q.options[optionKey];
        // Split by "Comprehension ("
        // The data has: "Physical aggression\nComprehension (91-95) Read the following..."
        const splitPattern = /\nComprehension\s*\(\d+-\d+\)/i;
        const match = optionText.match(splitPattern);

        if (match) {
            const splitIndex = match.index;
            const cleanOption = optionText.substring(0, splitIndex).trim();
            // The passage starts from the match. Let's include the "Comprehension..." header or just the text?
            // The app likely just displays the text. The user wants it "formatting correctly". 
            // Usually "Comprehension (91-95)" is a header.
            // Let's capture the whole remaining part as the passage.
            const passageText = optionText.substring(splitIndex).trim();

            // Clean option
            q.options[optionKey] = cleanOption;

            // Add to passages
            data.passages[passageId] = passageText;
            console.log(`Extracted passage '${passageId}' from Q${qIndex}.`);

            // Link questions to passage
            for (let i = rangeStart; i <= rangeEnd; i++) {
                const targetQ = data.questions.find(q => q.id === i);
                if (targetQ) {
                    targetQ.passageId = passageId;
                }
            }
            console.log(`Linked Q${rangeStart}-Q${rangeEnd} to passage '${passageId}'.`);

        } else {
            console.warn(`Passage pattern not found in Q${qIndex} Option ${optionKey}.`);
            // Check if it was already fixed?
            if (optionText.includes("Comprehension")) {
                console.log("Comprehension keyword found but regex failed. Content:", optionText.substring(0, 100));
            }
        }
    }

    // Fix Passage 1 (Q91-95) in Q90 Option D
    extractPassage(90, 'D', 'p_91_95', 91, 95);

    // Fix Passage 2 (Q96-100) in Q95 Option D
    extractPassage(95, 'D', 'p_96_100', 96, 100);


    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
    console.log("Successfully updated passages.");

} catch (e) {
    console.error("Error processing file:", e);
}
