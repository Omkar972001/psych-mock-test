import fs from 'node:fs';

const rawText = fs.readFileSync('./raw_test_1.txt', 'utf8');

// Helper to clean text
function clean(str) {
    return str.replace(/\s+/g, ' ').trim();
}

// 1. Extract Answer Key
// Structure: "Q.NO. ANS ... 1 C ..."
// We'll search from end of file backwards or look for "ANSWER KEY"
const keyRegex = /ANSWER KEY[\s\S]*$/i;
const keyMatch = rawText.match(keyRegex);
let answerKey = {};

if (keyMatch) {
    const keySection = keyMatch[0];
    // Pattern: Number followed by Letter (or comma separated letters)
    // Matches lines like "1 C 51 D"
    // Regex: (\d+)\s+([A-D,]+)
    const matches = keySection.matchAll(/(\d+)\s+([A-D,]+)/g);
    for (const m of matches) {
        answerKey[parseInt(m[1])] = m[2].trim();
    }
} else {
    console.warn("No Answer Key found!");
}

// 2. Extract Passages
// We find blocks starting with "Read the given paragraph" or similar.
// And associate them with question ranges.
// Q91-95 and Q96-100 usually.
const passage1Start = rawText.indexOf("Read the given paragraph");
const passage2Start = rawText.indexOf("Read the following passage"); // Text says "passage" for second one?
// Let's refine based on raw text view:
// Line 139: "Read the given paragraph and answer the questions that follow:" around Q90/91
// Line 159: "Read the following passage and answer the questions." around Q95/96

// We will split the text into chunks.
// Strategy: Split by "Q.No." or simply regex for "^\d+\."? 
// The text has "1. The term..." "2. Which..."
// But raw text lines might be broken.
// We'll join lines relative to pages first? 
// No, the raw text has `---PAGE_X---` lines. We should remove them.
const cleanText = rawText.replace(/---PAGE_\d+---/g, '').replace(/To get free NTA NET.*?www\.aifer\.in \d+/g, '');
// Remove footers too! "To get free NTA NET... Page 6"

// Now we have a blob of text.
// We regex for Questions: `(\d+)\.\s+(.*?)`
// But we need to stop at the next number.
// And options `(A)` `(B)` etc.

const questions = [];
// Global split is risky because "1.2" might appear in text.
// But usually "1. ", "2. " is consistent.
// We can use a loop looking for "1. ", "2. ", ... "100. " in order.

let currentQ = 1;
let cursor = 0;

let passage1Text = "";
let passage2Text = "";

// Extract passages manually based on known markers
if (passage1Start > -1) {
    // Find where passage starts exactly
    // And where it ends (start of Q91)
    const p1Marker = "Read the given paragraph and answer the questions that follow:";
    const p1Idx = cleanText.indexOf(p1Marker);
    const q91Idx = cleanText.indexOf("91. ", p1Idx);
    if (p1Idx > -1 && q91Idx > -1) {
        passage1Text = cleanText.substring(p1Idx + p1Marker.length, q91Idx);
    }
}

if (passage2Start > -1) {
    const p2Marker = "Read the following passage and answer the questions.";
    const p2Idx = cleanText.indexOf(p2Marker); // Might vary slightly
    // In raw text: "Read the following passage and answer the questions."
    // Let's use flexible regex for marker
}

// Better LOOP approach:
const fullText = cleanText;

for (let i = 1; i <= 100; i++) {
    const qStartStr = `${i}. `;
    const qNextStr = `${i + 1}. `; // Look for next question

    // Find index of `i. ` allowing for whitespace/newlines
    // Regex: new RegExp(`\\b${i}\\.\\s`)
    // We need to search FROM `cursor`.

    const qRegex = new RegExp(`(?:^|\\s)${i}\\.\\s`);
    const match = fullText.substring(cursor).match(qRegex);

    if (!match) {
        console.error(`Could not find Question ${i}`);
        break;
    }

    const absoluteStart = cursor + match.index + match[0].length;
    const startOfQBlock = cursor + match.index;

    // Find End
    // If i=100, end is Answer Key or EOF.
    let endIdx = -1;
    if (i < 100) {
        const nextQRegex = new RegExp(`(?:^|\\s)${i + 1}\\.\\s`);
        const nextMatch = fullText.substring(absoluteStart).match(nextQRegex);
        if (nextMatch) {
            endIdx = absoluteStart + nextMatch.index;
        } else {
            console.warn(`Could not find Question ${i + 1}`);
            // Fallback: look for Answer Key
            endIdx = fullText.length;
        }
    } else {
        const ansKeyIdx = fullText.indexOf("ANSWER KEY", absoluteStart);
        endIdx = ansKeyIdx > -1 ? ansKeyIdx : fullText.length;
    }

    // Extracted Block
    let block = fullText.substring(absoluteStart, endIdx);

    // Update cursor
    cursor = endIdx;

    // Parse Q and Options from block
    // Block: "Question text? (A) opt1 (B) opt2 (C) opt3 (D) opt4"

    // Split by (A), (B), (C), (D)
    // Regex: /\([A-D]\)/

    const parts = block.split(/\([A-D]\)/);
    // parts[0] is Question Text
    // parts[1] is A, parts[2] is B...

    // Sometimes options are (a) (b) in headers but text seems (A) (B) per raw text.
    // Raw text Line 4: "(A) Panini (B) Patanjali..."

    let qText = clean(parts[0]);
    let opts = [];
    if (parts.length >= 5) {
        opts = [clean(parts[1]), clean(parts[2]), clean(parts[3]), clean(parts[4])];
    } else {
        // Maybe (a), (b)? Check text again. 
        // Text might differ.
        // Let's assume (A)-(D) for now.
        // If not found, store raw block as question (fail-safe).
        if (parts.length < 2) {
            // Try lower case?
            const partsLower = block.split(/\([a-d]\)/);
            if (partsLower.length >= 5) {
                qText = clean(partsLower[0]);
                opts = [clean(partsLower[1]), clean(partsLower[2]), clean(partsLower[3]), clean(partsLower[4])];
            } else {
                console.warn(`Question ${i} parsing issue options`);
            }
        }
    }

    // Specific Passage Logic
    let passage = null;
    if (i === 91) passage = passage1Text.trim(); // Add extracted passage text
    if (i === 96) passage = "Passage for 96-100 (Check Extraction)"; // Todo: extract accurately

    // Find passage in text if we missed it
    // If Q91 text includes the passage introduction, separate it.
    // The loop finds "91. ", so introductory text BEFORE "91. " is NOT captured in Q91 block.
    // It would be in Q90's "gap" or handled by logic above.
    // We'll rely on global extraction for passage.

    questions.push({
        id: i,
        question: qText,
        options: opts,
        answer: answerKey[i] || null,
        passage: null // We will populate this post-loop
    });
}

// Assign passages
// We need to parse passage text again.
const p1Match = fullText.match(/Read the given paragraph[\s\S]*?(?=91\.)/);
if (p1Match) passage1Text = clean(p1Match[0]);

const p2Match = fullText.match(/Read the following passage[\s\S]*?(?=96\.)/);
if (p2Match) passage2Text = clean(p2Match[0]);

// Link passages to qs
questions.forEach(q => {
    if (q.id >= 91 && q.id <= 95) q.passageId = "passage_1";
    if (q.id >= 96 && q.id <= 100) q.passageId = "passage_2";
});

const finalData = {
    testName: "Mock Test 1 (March 2023)",
    passages: {
        "passage_1": passage1Text,
        "passage_2": passage2Text
    },
    questions: questions
};

fs.writeFileSync('./psych_test_01.json', JSON.stringify(finalData, null, 2));
console.log("JSON generated.");
