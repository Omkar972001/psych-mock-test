const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'psych_test_03.json');

try {
    const rawContent = fs.readFileSync(filePath, 'utf8');
    let data = JSON.parse(rawContent);

    let modifiedCount = 0;

    function cleanString(str) {
        if (!str) return str;
        let newStr = str;

        // Common Mojibake replacements for UTF-8 interpreted as Windows-1252 or similar
        // â€™ -> ’ (Right single quotation mark) -> Replace with '
        newStr = newStr.replace(/â€™/g, "'");

        // â€“ -> – (En dash) -> Replace with -
        newStr = newStr.replace(/â€“/g, "-");

        // â€œ -> “ (Left double quotation mark) -> Replace with "
        newStr = newStr.replace(/â€œ/g, '"');

        // â€ -> ” (Right double quotation mark) -> Replace with "
        // Note: Sometimes â€ is right quote, but it can be ambiguous. 
        // In the context "wordâ€", it's likely a closing quote.
        newStr = newStr.replace(/â€/g, '"');

        // â€˜ -> ‘ (Left single quotation mark) -> Replace with '
        newStr = newStr.replace(/â€˜/g, "'");

        // Weird â (a circumflex) appearing alone? 
        // Usually part of the sequence. If remaining, replace or warn?
        // Let's stick to the specific sequences first.

        return newStr;
    }

    function traverseAndClean(obj) {
        if (typeof obj === 'string') {
            const cleaned = cleanString(obj);
            if (cleaned !== obj) {
                modifiedCount++;
                return cleaned;
            }
            return obj;
        } else if (Array.isArray(obj)) {
            return obj.map(item => traverseAndClean(item));
        } else if (typeof obj === 'object' && obj !== null) {
            for (const key in obj) {
                obj[key] = traverseAndClean(obj[key]);
            }
            return obj;
        }
        return obj;
    }

    const cleanData = traverseAndClean(data);

    if (modifiedCount > 0) {
        fs.writeFileSync(filePath, JSON.stringify(cleanData, null, 4), 'utf8');
        console.log(`Successfully fixed encoding. Modified ${modifiedCount} strings.`);
    } else {
        console.log("No encoding issues found (with these patterns).");
    }

} catch (e) {
    console.error("Error processing file:", e);
}
