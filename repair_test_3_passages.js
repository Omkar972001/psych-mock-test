const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'psych_test_03.json');

try {
    const rawContent = fs.readFileSync(filePath, 'utf8');
    let data = JSON.parse(rawContent);

    let modified = false;

    if (data.passages) {
        for (const key in data.passages) {
            const passageVal = data.passages[key];
            if (typeof passageVal === 'object' && passageVal.text) {
                // It's the nested object structure I created by mistake
                data.passages[key] = passageVal.text;
                modified = true;
                console.log(`Repaired passage '${key}': converted object to string.`);
            }
        }
    }

    if (modified) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
        console.log("Successfully repaired passages structure.");
    } else {
        console.log("No passages needed repair.");
    }

} catch (e) {
    console.error("Error processing file:", e);
}
