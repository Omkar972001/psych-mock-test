const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'psych_test_03.json');

try {
    const rawContent = fs.readFileSync(filePath, 'utf8');
    let data = JSON.parse(rawContent);

    let modifiedCount = 0;

    function cleanStrings(obj) {
        if (typeof obj === 'string') {
            // Fix: Replace \r\n with space, UNLESS it looks like a list or header.
            // Pattern in Test 3: "economic competition between\r\nsocial groups" -> want space
            // "List - I \tList - II" -> might want newline or preservation?
            // "\r\n(a) ..." -> list item, keep newline (maybe analyze context)

            // Strategy:
            // 1. Unify newlines to \n
            let text = obj.replace(/\r\n/g, '\n');

            const original = text;

            // 2. Remove single newlines that break sentences
            // Look for \n that is NOT followed by:
            // - Another \n (paragraph)
            // - List item pattern like (a), (b), (i), (ii)
            // - specific headers

            // Regex lookahead:
            // (?!\n): Not followed by newline
            // (?![ \t]*\([a-z0-9]+\)): Not followed by (a), (1), (i) etc.
            // (?![ \t]*List): Not followed by "List"
            // (?![ \t]*Assertion): Not followed by "Assertion"
            // (?![ \t]*Reason): Not followed by "Reason"

            const breakRegex = /(?<!\n)\n(?!\n|[ \t]*\([a-z0-9]+\)|[ \t]*List|[ \t]*Assertion|[ \t]*Reason|[ \t]*Choose the)/gi;

            if (breakRegex.test(text)) {
                text = text.replace(breakRegex, ' ');
            }

            // 3. Fix footer "Choose the correct answer..." to be on its own line if it isn't
            // (Test 2 style fix)
            const footerRegex = /(?<!\n)\s*(Choose the correct answer)/gi;
            if (footerRegex.test(text)) {
                text = text.replace(footerRegex, '\n$1');
            }

            if (text !== original) { // Check against post-unification text
                modifiedCount++;
                return text;
            } else if (text !== obj) { // Just \r\n fix counts too
                modifiedCount++;
                return text;
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

    // Also Check for Missing Answers while we are here
    let missingAnswers = 0;
    cleanData.questions.forEach(q => {
        if (!q.correctAnswer) {
            console.warn(`Q${q.id} missing Answer!`);
            missingAnswers++;
            // Maybe we can default cleanly or mark it?
            // q.correctAnswer = ""; 
        }
    });

    if (modifiedCount > 0) {
        fs.writeFileSync(filePath, JSON.stringify(cleanData, null, 4), 'utf8');
        console.log(`Successfully fixed formatting. Modified ${modifiedCount} strings.`);
        console.log(`Questions with missing answers: ${missingAnswers}`);
    } else {
        console.log("No formatting needed.");
    }

} catch (e) {
    console.error("Error processing file:", e);
}
