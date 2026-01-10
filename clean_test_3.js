const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'psych_test_03.json');

try {
    const rawContent = fs.readFileSync(filePath, 'utf8');
    let data = JSON.parse(rawContent);

    // Regex for the artifact
    const artifactRegex = /To get free NTA NET study materials[\s\S]*?-- \d+ of \d+ --/gi;

    let modifiedCount = 0;
    let parsedOptionsCount = 0;

    data.questions.forEach(q => {
        // 1. Remove Artifacts
        if (typeof q.text === 'string' && artifactRegex.test(q.text)) {
            q.text = q.text.replace(artifactRegex, '').trim();
            modifiedCount++;
        }
        if (q.options) {
            for (const key in q.options) {
                if (typeof q.options[key] === 'string' && artifactRegex.test(q.options[key])) {
                    q.options[key] = q.options[key].replace(artifactRegex, '').trim();
                    modifiedCount++;
                }
            }
        }

        // 2. Parse Options if missing
        if (!q.options || Object.keys(q.options).length === 0) {

            // Strategy: Look for "options given below:" or "answer from the options given below:"
            const footerRegex = /options given\s*below:?/i;
            const footerMatch = q.text.match(footerRegex);

            let optionsBlock = "";
            let splitIndex = -1;

            if (footerMatch) {
                splitIndex = footerMatch.index + footerMatch[0].length;
                optionsBlock = q.text.substring(splitIndex);
            } else {
                // Fallback: Try to find the *first* (A) that is followed by (B), (C), (D)
                // But avoid Assertion (A). Assertion (A) usually doesn't start a line or look like a specific list item in this context.
                // However, the cleanest way without footer is tricky.
                // Let's rely on footer for Q11 type questions first.
            }

            if (optionsBlock) {
                // Now parse A, B, C, D from optionsBlock
                // Regex: (A) ... (B) ... (C) ... (D) ...
                // Use [\s\S]*? for non-greedy content match
                const optParser = /\(A\)\s*([\s\S]*?)\s*\((B)\)\s*([\s\S]*?)\s*\((C)\)\s*([\s\S]*?)\s*\((D)\)\s*([\s\S]*)$/i;
                const matches = optionsBlock.match(optParser);

                if (matches) {
                    q.options = {
                        "A": matches[1].trim(),
                        "B": matches[2].trim(), // Wait, group 2 is 'B' label. Content is 3.
                        // Correct groups:
                        // 1: Content A
                        // 2: Label B
                        // 3: Content B
                        // 4: Label C
                        // 5: Content C
                        // 6: Label D
                        // 7: Content D
                    };

                    // Hmm, my regex groups above:
                    // (A) -> not captured
                    // ([\s\S]*?) -> Group 1 (Content A)
                    // \((B)\) -> Group 2 (Label B)
                    // ...

                    q.options = {
                        "A": matches[1].trim(),
                        "B": matches[3].trim(),
                        "C": matches[5].trim(),
                        "D": matches[7].trim()
                    };

                    // Update text: Remove options part
                    // Keep the footer? "Choose... below:" is usually kept as instruction.
                    q.text = q.text.substring(0, splitIndex).trim();
                    parsedOptionsCount++;
                    console.log(`Parsed options for Q${q.id}`);
                }
            }
        }
    });

    if (modifiedCount > 0 || parsedOptionsCount > 0) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
        console.log(`Cleaned artifacts: ${modifiedCount}`); // Might be 0 if already cleaned
        console.log(`Parsed missing options: ${parsedOptionsCount}`);
    } else {
        console.log("No changes made.");
    }

} catch (e) {
    console.error("Error processing file:", e);
}
