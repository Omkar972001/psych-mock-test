const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'psych_test_02.json');

try {
    const rawContent = fs.readFileSync(filePath, 'utf8');
    let data = JSON.parse(rawContent);

    let modifiedCount = 0;

    function cleanStrings(obj) {
        if (typeof obj === 'string') {
            let newText = obj;

            // 1. Collapse multiple newlines (e.g., \n\n\n -> \n)
            // But verify if we want to keep paragraph breaks?
            // User complained about "unnecessary space".
            // Let's replace 3+ newlines with 1? Or 2+ with 1?
            // Usually \n\n is a paragraph break. \n\n\n is too much.
            // Let's normalize any sequence of 2 or more newlines to a single \n for compactness, 
            // OR maybe 2 newlines if it's a passage?
            // For now, let's just make it max 1 \n because the Questions are usually single block except lists.
            newText = newText.replace(/\n{2,}/g, '\n');

            // 2. Force newline before "Choose the correct answer"
            // Case-insensitive match just in case
            // (?<!\n) -> Not already preceded by newline
            // \s* -> optional whitespace
            // (Choose the correct answer) -> Capture group
            const footerRegex = /(?<!\n)\s*(Choose the correct answer)/gi;
            if (footerRegex.test(newText)) {
                newText = newText.replace(footerRegex, '\n$1');
            }

            // 3. Ensure List headers are on new lines
            const listRegex = /(?<!\n)\s*(List\s*-?\s*I)/gi;
            if (listRegex.test(newText)) {
                newText = newText.replace(listRegex, '\n$1');
            }

            // 4. Ensure List items (a), (b)... are on new lines if they got merged (just in case)
            // Be careful not to match text like "(a)" inside a sentence if it exists?
            // Usually (a) at start of line is a list item.
            // Let's replace ` (a) ` with `\n(a) `?
            const itemRegex = /(?<!\n)\s*(\([a-z]\)\s)/g;
            if (itemRegex.test(newText)) {
                // Actually, this is risky if "(a)" is used in normal text.
                // But in this dataset, it's almost always a list.
                newText = newText.replace(itemRegex, '\n$1');
            }

            if (newText !== obj) {
                modifiedCount++;
                return newText;
            }
            return obj;
        } else if (Array.isArray(obj)) {
            return obj.map(item => cleanStrings(item));
        } else if (typeof obj === 'object' && obj !== null) {
            for (const key in obj) {
                obj[key] = cleanStrings(obj[key]);
            }
            return obj;
        }
        return obj;
    }

    const cleanData = cleanStrings(data);

    if (modifiedCount > 0) {
        fs.writeFileSync(filePath, JSON.stringify(cleanData, null, 4), 'utf8');
        console.log(`Successfully fixed spacing. Modified ${modifiedCount} strings.`);
    } else {
        console.log("No spacing issues found.");
    }

} catch (e) {
    console.error("Error processing file:", e);
}
