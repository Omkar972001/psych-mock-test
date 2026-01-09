const fs = require('fs');

// Read the full dump
const dump = fs.readFileSync('knowledge/vol21_dump.txt', 'utf8');

// 1. Isolate the "JUNE 2024 SHIFT I" section
// Start: "JUNE_2024 _SHIFT I"
// End: "DECEMBER _2023" (next test)
const startMarker = "JUNE_2024_SHIFT I";
const endMarker = "DECEMBER_2023";

const startIndex = dump.indexOf(startMarker);
const endIndex = dump.indexOf(endMarker, startIndex);

if (startIndex === -1 || endIndex === -1) {
    console.error("Could not locate test section markers.");
    process.exit(1);
}

const testContent = dump.slice(startIndex, endIndex);
console.log(`Extracted ${testContent.length} characters for Test 2.`);

// 2. Parse Questions
// Regex to find "1. Question... (A)... (B)..."
// This is tricky with raw text. We'll split by "Question Number" pattern roughly.
// Looking at dump: "1. Match...", "2. In the equation..."

const questions = [];
const questionRegex = /(\d+)\.\s+([\s\S]*?)(?=\n\d+\.\s+|$)/g;
// Explanation: 
// (\d+)\.\s+  -> Start with "1. "
// ([\s\S]*?)  -> Capture everything (lazy)
// (?=\n\d+\.\s+|$) -> Lookahead for next question start "2. " (newline then number then dot)

// But wait, the dump has page headers "--- PAGE 32 ---" inside. We should remove those first.
const cleanContent = testContent.replace(/--- PAGE \d+ ---\n/g, '').replace(/To get free NTA NET study materials.*\n/g, '');

// Extract Answer Key section separate first
const answerKeyMarker = "ANSWER KEY";
const akIndex = cleanContent.indexOf(answerKeyMarker);
const questionsText = cleanContent.slice(0, akIndex);
const answerKeyText = cleanContent.slice(akIndex);

console.log("DEBUG: content start:", questionsText.slice(0, 500));

// Parse Answer Key
const answerMap = {};
// Rows are like: "1 B 51 C"
// Regex: (\d+)\s+([A-D])
const ansRegex = /(\d+)\s+([A-D])/g;
let match;
while ((match = ansRegex.exec(answerKeyText)) !== null) {
    answerMap[match[1]] = match[2];
}
console.log(`Parsed ${Object.keys(answerMap).length} answers.`);

// Parse Questions loop
let qMatch;
// Regex: Space or Start, Number, Dot, Space
// Note: We might match "1. " inside text, so we'll filter for sequence 1, 2, 3...
const qRegex = /(?:\s|^)(\d+)\.\s/g;
let lastQNum = 0;

const qIndices = [];
let potentialMatch;

// Collect all potential matches
const matches = [];
while ((potentialMatch = qRegex.exec(questionsText)) !== null) {
    matches.push({
        num: parseInt(potentialMatch[1]),
        index: potentialMatch.index,
        matchLength: potentialMatch[0].length
    });
}

// Filter for linear sequence 1, 2, 3...
// We allow some flexibility if extraction is messy, but generally enforce order.
for (const m of matches) {
    if (m.num === lastQNum + 1) {
        // Found next question
        qIndices.push(m);
        lastQNum = m.num;
    }
    // If we missed one, say we jump from 1 to 3, we might want to be careful.
    // But for now, let's assume rigorous sequence.
    // If we see '1' again, it might be a restart or false positive, ignore if we are at 50.
}

console.log(`DEBUG: Found ${qIndices.length} valid sequential question markers.`);

for (let i = 0; i < qIndices.length; i++) {
    const current = qIndices[i];
    const next = qIndices[i + 1];

    // Check if valid question number (1-100)
    if (current.num > 100) continue; // Skip weird numbers

    // Start of content is index + full match length (e.g. " 1. ")
    const start = current.index + current.matchLength;
    const end = next ? next.index : questionsText.length;
    let broadContent = questionsText.slice(start, end).trim();

    // Remove "1. " from start - already done by slice logic mostly, but trim
    // broadContent = broadContent.replace(/^\d+\.\s+/, '');

    // Extract Options
    // (A) ... (B) ... (C) ... (D) ...
    // Regex looking for (A), (B), (C), (D) labels at start of lines or preceded by space
    const options = {};
    let qText = broadContent;

    // Helper to extract option text
    // We assume options are (A), (B), (C), (D)
    // We search for the *last* occurrence of (D), then (C) before it, etc. to slice?
    // Or just regex replace.

    // Splitting by option labels might be robust
    // Pattern: \(?([A-D])\)?\s+

    const parts = broadContent.split(/\([A-D]\)/);
    if (parts.length >= 5) {
        // parts[0] is question text
        // parts[1] is A, parts[2] is B..
        qText = parts[0].trim();
        options['A'] = parts[1].trim();
        options['B'] = parts[2].trim();
        options['C'] = parts[3].trim();
        options['D'] = parts[4].trim();
    } else {
        // Try alternate format: (a), (b)... in sub-items, and (A), (B) options below?
        // The prompt says: (A) ... (B) ...
        // Let's rely on specific regex for options
        const optA = broadContent.indexOf('(A)');
        const optB = broadContent.indexOf('(B)');
        const optC = broadContent.indexOf('(C)');
        const optD = broadContent.indexOf('(D)');

        if (optA !== -1 && optB !== -1 && optC !== -1 && optD !== -1) {
            qText = broadContent.substring(0, optA).trim();
            options['A'] = broadContent.substring(optA + 3, optB).trim();
            options['B'] = broadContent.substring(optB + 3, optC).trim();
            options['C'] = broadContent.substring(optC + 3, optD).trim();
            options['D'] = broadContent.substring(optD + 3).trim();
        }
    }

    questions.push({
        id: current.num,
        text: qText,
        options: options,
        correctAnswer: answerMap[current.num] || null
    });
}

// Create JSON Structure
const output = {
    testId: "02",
    title: "JUNE 2024 SHIFT I",
    questions: questions
};

fs.writeFileSync('psych_test_02.json', JSON.stringify(output, null, 2));
console.log(`Saved psych_test_02.json with ${questions.length} questions.`);
