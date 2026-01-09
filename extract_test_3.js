const fs = require('fs');

// Read the raw text we dumped
const rawPath = 'raw_test_3.txt';
if (!fs.existsSync(rawPath)) {
    console.error("raw_test_3.txt not found. Run the dump command first.");
    process.exit(1);
}
const content = fs.readFileSync(rawPath, 'utf8');

console.log(`Read ${content.length} chars from ${rawPath}`);

// 1. Clean up
// Remove page headers
let cleanContent = content.replace(/--- PAGE \d+ ---\n/g, '')
    .replace(/To get free NTA NET study materials.*\n/g, '')
    .replace(/www\.aifer\.in\s+\d+\n/g, ''); // formatting

// 2. Separate Answer Key
// Marker: "ANSWER KEY"
const ansMarker = "ANSWER KEY";
const akIndex = cleanContent.indexOf(ansMarker);

if (akIndex === -1) {
    console.error("ANSWER KEY marker not found!");
    // Proceed with caution or exit? Let's try to proceed without keys if needed, but better to fail.
    // Actually, we can just log valid questions so far.
}

const questionsText = (akIndex !== -1) ? cleanContent.slice(0, akIndex) : cleanContent;
const answerKeyText = (akIndex !== -1) ? cleanContent.slice(akIndex) : "";

// 3. Parse Answer Key
const answerMap = {};
// Format: 1 C 51 A ...
const ansRegex = /(\d+)\s+([A-D])/g;
let match;
while ((match = ansRegex.exec(answerKeyText)) !== null) {
    answerMap[match[1]] = match[2];
}
console.log(`Parsed ${Object.keys(answerMap).length} answers.`);

// 4. Parse Questions
const questions = [];
// We look for "1. ", "2. " start patterns.
// Regex: Start of line or space, Number, Dot, Space
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

// Filter sequence 1..100
const validMatches = [];
let nextNum = 1;
// Allow some fuzziness but generally consecutive
for (const m of matches) {
    if (m.num === nextNum) {
        validMatches.push(m);
        nextNum++;
    } else if (m.num === nextNum - 1) {
        // Duplicate? Ignore
    } else {
        // Maybe missed one? or noise (e.g. "2024" year)
        // If we jump from 1 to 3, we missed 2.
        // For now, strict check
        // console.log(`Skipped potential match ${m.num} (Expected ${nextNum})`);
    }
}
console.log(`Identified ${validMatches.length} valid questions.`);

for (let i = 0; i < validMatches.length; i++) {
    const current = validMatches[i];
    const next = validMatches[i + 1];

    const start = current.index + current.matchLength;
    const end = next ? next.index : questionsText.length;
    let fullText = questionsText.slice(start, end).trim();

    // Parse options
    // Strategy: Look for (A), (B), (C), (D)
    // If we find (A) ... (B) ...
    // We assume the text before (A) is the question.

    let qContent = fullText;
    const opts = {};

    // Regex for options: (A) or (a) ? PDF mostly uses (A)
    // Looking at dump: "(A) Contact hypothesis"

    // We find indices of (A), (B), (C), (D)
    // Careful about (a) inside question text.
    // The options seem to be uppercase (A), (B), (C), (D) in the dump usually.

    const idxA = fullText.lastIndexOf('(A)');
    const idxB = fullText.lastIndexOf('(B)');
    const idxC = fullText.lastIndexOf('(C)');
    const idxD = fullText.lastIndexOf('(D)');

    // Valid options must be in order A < B < C < D usually, but lastIndexOf might mess if duplicate.
    // But usually options are at the end.

    if (idxA !== -1 && idxB > idxA && idxC > idxB && idxD > idxC) {
        qContent = fullText.substring(0, idxA).trim();
        opts['A'] = fullText.substring(idxA + 3, idxB).trim();
        opts['B'] = fullText.substring(idxB + 3, idxC).trim();
        opts['C'] = fullText.substring(idxC + 3, idxD).trim();
        opts['D'] = fullText.substring(idxD + 3).trim();
    } else {
        // Fallback or Match List handling
        // If it's a "Match List" question, typically it has (a)-(III)... options.
        // Code might need more smarts for Match Lists.
        // For now, dump raw text into qContent if parse fails
        // Or leave options empty?
        // App handles empty options by showing nothing?
        // Better to try parsing "Choose the correct answer..."
    }

    questions.push({
        id: current.num,
        text: qContent,
        options: Object.keys(opts).length > 0 ? opts : null, // If null, maybe UI handles it or we flag it
        correctAnswer: answerMap[current.num] || null
    });
}

// 5. Output
const output = {
    testId: "03", // This will be the new ID
    title: "DECEMBER 2023 SHIFT I",
    questions: questions
};

fs.writeFileSync('psych_test_new.json', JSON.stringify(output, null, 2));
console.log("Done.");
