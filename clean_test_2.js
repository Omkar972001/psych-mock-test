const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'psych_test_02.json');

try {
    const rawContent = fs.readFileSync(filePath, 'utf8');
    let data;
    try {
        data = JSON.parse(rawContent);
    } catch (parseError) {
        console.error("Failed to parse JSON:", parseError);
        process.exit(1);

    }

    let modified = false;

    // Recursive function to walk the object and clean strings
    function cleanObject(obj) {
        if (typeof obj === 'string') {
            // Regex to match "www.aifer.in [tab] [page] [newlines] -- [page] of 202 --"
            // Since we are operating on the JS string, \t and \n are real characters now.
            // Pattern: www\.aifer\.in\s+\d+\s+-- \d+ of 202 --
            // We also want to trim any resulting leading/trailing whitespace if the whole string was affected differently? 
            // Or just replace the artifact with empty string.

            const regex = /www\.aifer\.in\s+\d+\s+-- \d+ of 202 --/g;
            if (regex.test(obj)) {
                modified = true;
                return obj.replace(regex, '').trim();
            }
            return obj;
        } else if (Array.isArray(obj)) {
            return obj.map(item => cleanObject(item));
        } else if (typeof obj === 'object' && obj !== null) {
            for (const key in obj) {
                obj[key] = cleanObject(obj[key]);
            }
            return obj;
        }
        return obj;
    }

    const cleanData = cleanObject(data);

    if (modified) {
        fs.writeFileSync(filePath, JSON.stringify(cleanData, null, 4), 'utf8');
        console.log("Successfully removed artifacts and saved JSON.");
    } else {
        console.log("No artifacts found matching the regex.");
    }

} catch (e) {
    console.error("Error processing file:", e);
}
