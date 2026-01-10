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

    let modifiedCount = 0;

    // Recursive function to walk the object and clean strings
    function cleanObject(obj) {
        if (typeof obj === 'string') {
            // Regex explanation:
            // (?<!\n)\n  -> Match a newline that is NOT preceded by a newline (avoid matching the second \n in \n\n)
            // (?!\n|[ \t]*\(|[ \t]*List|[ \t]*Comprehension) -> Lookahead: Match newline ONLY IF it is NOT followed by:
            //    - another newline (paragraph break)
            //    - '(' (start of list item like (a), (b))
            //    - 'List' (header)
            //    - 'Comprehension' (passage header)

            // Note: We use a replacement function to log changes for verification
            const regex = /(?<!\n)\n(?!\n|[ \t]*\(|[ \t]*List|[ \t]*Comprehension)/g;

            if (regex.test(obj)) {
                const newText = obj.replace(regex, ' ');
                if (newText !== obj) {
                    // console.log(`[Before]: ${JSON.stringify(obj.substring(0, 50))}...`);
                    // console.log(`[After ]: ${JSON.stringify(newText.substring(0, 50))}...`);
                    modifiedCount++;
                    return newText;
                }
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

    if (modifiedCount > 0) {
        fs.writeFileSync(filePath, JSON.stringify(cleanData, null, 4), 'utf8');
        console.log(`Successfully fixed newlines. Modified ${modifiedCount} strings.`);
    } else {
        console.log("No text needed fixing based on the rules.");
    }

} catch (e) {
    console.error("Error processing file:", e);
}
