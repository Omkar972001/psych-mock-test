const fs = require('fs');
const path = require('path');

const DUMP_PATH = 'knowledge/vol21_dump.txt';
const TESTS = [
    {
        id: 2,
        file: 'psych_test_02.json',
        keyStartMarker: 'ANSWER KEY', // Need context or offset logic
        sectionStart: 'JUNE_2024_SHIFT I',
        sectionEnd: 'DECEMBER_2023'
    },
    {
        id: 3,
        file: 'psych_test_03.json',
        sectionStart: 'DECEMBER_2023',
        sectionEnd: 'JUNE 2023'
    },
    {
        id: 4,
        file: 'psych_test_04.json',
        sectionStart: 'JUNE 2023',
        sectionEnd: 'MARCH_2023_'
    }
];

const dump = fs.readFileSync(DUMP_PATH, 'utf8');

function parseKeyBlock(text) {
    // Normalize
    const clean = text.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ');
    const answers = {};
    // Regex for "1 A", "2 B", "53 D, A" etc.
    // Sometimes it's "1. A" or just "1 A"
    const regex = /(\d+)\s+([A-D](?:[,&][A-D])*|WQ|Cancelled|Dropped)/gi;

    let match;
    while ((match = regex.exec(clean)) !== null) {
        const qNo = parseInt(match[1]);
        let ans = match[2];
        ans = ans.replace(/&/g, ',');
        if (ans === 'WQ' || ans === 'Cancelled' || ans === 'Dropped') {
            ans = 'A,B,C,D'; // Give marks to all? Or null? Usually implies bonus.
        }
        answers[qNo] = ans;
    }
    return answers;
}

function updateTest(testConf) {
    console.log(`Processing Test ${testConf.id}...`);

    const startIdx = dump.indexOf(testConf.sectionStart);
    if (startIdx === -1) {
        console.error(`  Error: Section start '${testConf.sectionStart}' not found.`);
        return;
    }

    // Find section end
    let endIdx;
    if (testConf.sectionEnd) {
        endIdx = dump.indexOf(testConf.sectionEnd, startIdx);
    } else {
        endIdx = dump.length;
    }

    if (endIdx === -1) {
        console.error(`  Error: Section end '${testConf.sectionEnd}' not found.`);
        return;
    }

    const sectionText = dump.slice(startIdx, endIdx);

    // Find ANSWER KEY inside this section
    // It is usually near the end.
    const keyMarker = "ANSWER KEY";
    const keyIdx = sectionText.lastIndexOf(keyMarker);

    if (keyIdx === -1) {
        console.error(`  Error: 'ANSWER KEY' not found in section for Test ${testConf.id}.`);
        return;
    }

    const keyText = sectionText.slice(keyIdx + keyMarker.length);
    const answerMap = parseKeyBlock(keyText);
    const keyCount = Object.keys(answerMap).length;
    console.log(`  Found ${keyCount} answers.`);

    if (keyCount < 50) {
        console.warn("  Warning: Low answer count. Key might be truncated or parse failed.");
    }

    // Update JSON
    if (!fs.existsSync(testConf.file)) {
        console.error(`  Error: JSON file '${testConf.file}' not found.`);
        return;
    }

    const json = JSON.parse(fs.readFileSync(testConf.file, 'utf8'));
    let updated = 0;

    json.questions.forEach(q => {
        if (answerMap[q.id]) {
            const newAns = answerMap[q.id];
            if (q.correctAnswer !== newAns) { // schema usually correctAnswer
                q.correctAnswer = newAns;
                updated++;
            }
        } else {
            // console.log(`  Warning: No answer for Q${q.id}`);
        }
    });

    fs.writeFileSync(testConf.file, JSON.stringify(json, null, 4));
    console.log(`  Updated ${updated} answers in ${testConf.file}.`);
}

TESTS.forEach(updateTest);
