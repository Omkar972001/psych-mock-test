const fs = require('fs');

// Read the full dump
const dumpPath = 'knowledge/vol21_dump.txt';
if (!fs.existsSync(dumpPath)) {
    console.error("Dump file not found.");
    process.exit(1);
}
const dump = fs.readFileSync(dumpPath, 'utf8');

// Markers
// Start: "JUNE 2023 SHIFT 1"
// End: "MARCH_2023_AN SHIFT"
const startMarker = "JUNE 2023 SHIFT 1";
const endMarker = "MARCH_2023_AN SHIFT";

const startIndex = dump.indexOf(startMarker);
if (startIndex === -1) {
    console.error("Start marker not found:", startMarker);
    process.exit(1);
}

// Find end marker after start
const endIndex = dump.indexOf(endMarker, startIndex);
if (endIndex === -1) {
    console.error("End marker not found:", endMarker);
    // process.exit(1); // Maybe just read till end if it's the last one? but it's not.
}

const testContent = dump.slice(startIndex, endIndex !== -1 ? endIndex : undefined);
console.log(`Extracted ${testContent.length} characters.`);

// Clean Headers
let cleanContent = testContent.replace(/--- PAGE \d+ ---\n/g, '')
    .replace(/To get free NTA NET study materials.*\n/g, '')
    .replace(/www\.aifer\.in\s+\d+\n/g, '');

// Separate Answer Key
const ansMarker = "ANSWER KEY";
const akIndex = cleanContent.indexOf(ansMarker);
const questionsText = (akIndex !== -1) ? cleanContent.slice(0, akIndex) : cleanContent;
const answerKeyText = (akIndex !== -1) ? cleanContent.slice(akIndex) : "";

// Parse Answer Key
const answerMap = {};
const ansRegex = /(\d+)\s+([A-D])/g; // Simple regex, might need tweaking if keys are "Dropped"
let am;
while ((am = ansRegex.exec(answerKeyText)) !== null) {
    answerMap[am[1]] = am[2];
}
// Handle "Dropped" or weird keys if any?
// In Step 222, we see "80 Dropped". We should probably handle that.
// Or just ignore. The regex expects [A-D], so "Dropped" won't match.
// Let's add handling for "Dropped" or "A & C".
// Step 222: "43 A & C". This regex won't pick it up properly.
// let's try a more robust key parser.

const ansRegexRobust = /(\d+)\s+([A-D]|Dropped|[A-D] & [A-D])/g;
// Actually "A & C" might be "A & C" or "A&C".
// Let's just matching non-whitespace.
const ansRegexGeneral = /(\d+)\s+(.+?)(\s+\d+|$)/g;
// This is risky.
// Let's stick to standard and look for manual exceptions?
// "43 	A & C" -> The tab might be there.
// Let's try matching line by line.

const answerLines = answerKeyText.split('\n');
for (const line of answerLines) {
    // line might look like "43 A & C 93 C"
    // Tokenize
    const tokens = line.trim().split(/\s+/); // split by whitespace
    // Iterate tokens to find Number followed by Answer
    for (let i = 0; i < tokens.length; i++) {
        if (/^\d+$/.test(tokens[i])) {
            const qNum = tokens[i];
            // Next one or more tokens are answer.
            // If next token is number, previous was answer? No.
            // Look ahead
            if (i + 1 < tokens.length) {
                let ans = tokens[i + 1];
                // Check if ans is a number (start of next pair)
                if (!/^\d+$/.test(ans)) {
                    // It's the answer.
                    // Check if it's "A" "&" "C"
                    if (ans === "A" && tokens[i + 2] === "&" && tokens[i + 3] === "C") {
                        ans = "A & C";
                        i += 3;
                    }
                    // Or "Dropped"
                    else if (ans === "Dropped") {
                        // keep it
                    }
                    answerMap[qNum] = ans;
                }
            }
        }
    }
}
console.log(`Parsed ${Object.keys(answerMap).length} answers.`);


// Parse Questions
const questions = [];
const qRegex = /(?:\s|^)(\d+)\.\s/g;
const matches = [];
let m;
while ((m = qRegex.exec(questionsText)) !== null) {
    matches.push({
        num: parseInt(m[1]),
        index: m.index,
        matchLength: m[0].length
    });
}

// Filter sequence
const validMatches = [];
let nextNum = 1;
for (const m of matches) {
    if (m.num === nextNum) {
        validMatches.push(m);
        nextNum++;
    }
}
console.log(`Identified ${validMatches.length} valid questions.`);

for (let i = 0; i < validMatches.length; i++) {
    const current = validMatches[i];
    const next = validMatches[i + 1];

    // Calculate start/end of question block
    // If it's the last question, end is end of text
    const start = current.index + current.matchLength;
    const end = next ? next.index : questionsText.length;

    let fullText = questionsText.slice(start, end).trim();

    // Parse QText and Options
    // Check for (A), (B), (C), (D)
    // Sometimes PDF uses (a), (b) for sub-lists and (A), (B) for main options.
    // We want the MAIN options.

    let qContent = fullText;
    const opts = {};

    const idxA = fullText.lastIndexOf('(A)');
    const idxB = fullText.lastIndexOf('(B)');
    const idxC = fullText.lastIndexOf('(C)');
    const idxD = fullText.lastIndexOf('(D)');

    if (idxA !== -1 && idxB > idxA && idxC > idxB && idxD > idxC) {
        qContent = fullText.substring(0, idxA).trim();
        opts['A'] = fullText.substring(idxA + 3, idxB).trim();
        opts['B'] = fullText.substring(idxB + 3, idxC).trim();
        opts['C'] = fullText.substring(idxC + 3, idxD).trim();
        opts['D'] = fullText.substring(idxD + 3).trim();
    }

    questions.push({
        id: current.num,
        text: qContent,
        options: Object.keys(opts).length > 0 ? opts : null,
        correctAnswer: answerMap[current.num] || null
    });
}

const output = {
    testId: "04",
    title: "JUNE 2023 SHIFT I",
    questions: questions
};

fs.writeFileSync('psych_test_new_june23.json', JSON.stringify(output, null, 2));
console.log("Done.");
