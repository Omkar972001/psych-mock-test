const fs = require('fs');

const files = [
    'psych_test_02.json',
    'psych_test_03.json',
    'psych_test_04.json'
];

files.forEach(file => {
    if (!fs.existsSync(file)) {
        console.log(`Skipping ${file} - not found`);
        return;
    }
    console.log(`Processing ${file}...`);
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    let count = 0;

    data.questions.forEach(q => {
        if (q.correctAnswer && !q.answer) {
            q.answer = q.correctAnswer;
            delete q.correctAnswer;
            count++;
        }
    });

    fs.writeFileSync(file, JSON.stringify(data, null, 4));
    console.log(`  Renamed 'correctAnswer' to 'answer' in ${count} questions.`);
});
