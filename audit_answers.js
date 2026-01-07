const fs = require('fs');
const files = ['psych_test_01.json', 'psych_test_02.json', 'psych_test_04.json'];

files.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`\nAnalyzing ${file}...`);
        try {
            const data = JSON.parse(fs.readFileSync(file, 'utf8'));
            console.log(`Test Name: ${data.testName}`);

            let nullCount = 0;
            let badFormatCount = 0;

            data.questions.forEach(q => {
                if (q.answer === null) {
                    nullCount++;
                    console.log(`  ID ${q.id}: Answer is null`);
                } else if (typeof q.answer === 'string') {
                    const trimmed = q.answer.trim();
                    if (trimmed.length > 1 || trimmed !== q.answer) {
                        badFormatCount++;
                        console.log(`  ID ${q.id}: Answer '${q.answer}' (Length: ${q.answer.length})`);
                    }
                }
            });

            console.log(`Found ${nullCount} null answers.`);
            console.log(`Found ${badFormatCount} answers with potential formatting issues (trailing spaces/commas).`);

        } catch (e) {
            console.error(`Error reading ${file}: ${e.message}`);
        }
    }
});
