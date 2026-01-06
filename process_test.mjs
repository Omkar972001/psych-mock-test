import { getDocument } from './node_modules/pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'node:fs';

// Arguments: node process_test.mjs <startPage> <endPage> <testName> <outputFile>
// Example: node process_test.mjs 30 50 "Mock Test 2" psych_test_02.json

const args = process.argv.slice(2);
if (args.length < 4) {
    console.error("Usage: node process_test.mjs <startPage> <endPage> <testName> <outputFile>");
    process.exit(1);
}

const startPage = parseInt(args[0]);
const endPage = parseInt(args[1]);
const testName = args[2];
const outputFile = args[3];
const pdfPath = './knowledge/UGCNETPSYCHOLOGYPYQBOOK.pdf';

// Helper to clean text
function clean(str) {
    // Remove (a)/(b) if it's just a label at start? No, keep them for structure if needed.
    // Replace multiple spaces with single space.
    return str.replace(/\s+/g, ' ').trim();
}

async function run() {
    try {
        const dataBuffer = new Uint8Array(fs.readFileSync(pdfPath));
        const loadingTask = getDocument({
            data: dataBuffer,
            disableFontFace: true,
        });
        const doc = await loadingTask.promise;

        let fullText = "";

        console.log(`Extracting pages ${startPage}-${endPage}...`);

        for (let i = startPage; i <= endPage; i++) {
            const page = await doc.getPage(i);
            const content = await page.getTextContent();
            const strings = content.items.map(item => item.str);

            // Marker for page break if needed, but for parsing we treat as continuous stream
            // optionally removing headers/footers
            fullText += strings.join(" ") + " ";
        }

        // Parsing Logic (Adapted from parse_test.mjs)

        // 1. Remove Headers/Footers typically found in this PDF
        // "To get free NTA NET... Page X"
        fullText = fullText.replace(/To get free NTA NET.*?www\.aifer\.in \d+/g, '');
        // Also remove ---PAGE_X--- style if we added it (we didn't here)

        // 2. Extract Answer Key
        // Strategy: Look for "ANSWER KEY" anywhere.
        const keyRegex = /ANSWER KEY[\s\S]*?(?=To get|---PAGE|December|$)/i;
        // Note: In Test 5, key is at start, followed by text. 
        // In Test 1, key is at end.

        let answerKey = {};
        // let textWithoutKey = fullText; // Removed as we parse from fullText now

        // Find all occurrences of Answer Key (could be multiple if extracting big range)
        // We assume one key per test file.
        // const allKeyMatches = [...fullText.matchAll(/ANSWER KEY[\s\S]*?(\n\n|---PAGE|$)/gi)]; // Not used directly

        // We prefer the one that looks like a table of numbers and letters
        // Logic: Extract from all found key blocks

        const keyBlockRegex = /ANSWER KEY[\s\S]*?((?:To get|---PAGE|December|Q\.1|1\.)|$)/i; // Heuristic end
        const keyMatch = fullText.match(keyBlockRegex);

        if (keyMatch) {
            const keySection = keyMatch[0]; // Logic might be brittle
            // Let's refine: Search for patterns "1 A", "1 (A)", "1. A" etc.
            // Test 5: "1 A 11 D ..."
            const matches = keySection.matchAll(/(\d+)\s+([A-D,]+)/g);
            for (const m of matches) {
                answerKey[parseInt(m[1])] = m[2].trim();
            }
            // Remove key from text if it's very long (avoid confusion)
            // But strict removal is hard. We'll just ignore it during Q parsing if we use strict Q regex.
        }

        // 3. Extract Passages (Moved after key extraction, before question parsing)
        let passage1Text = "";
        let passage2Text = "";

        // Regex for passages
        // Passage 1 around Q91
        const p1Match = fullText.match(/Read the given paragraph[\s\S]*?(?=91\.)/);
        // Sometimes "Read the following questions..." or "Instruction..."
        // We'll try generic "Read the..." if specific fails
        if (p1Match) {
            passage1Text = clean(p1Match[0]);
        } else {
            // Fallback: finding large block of text before Q91?
        }

        // Passage 2 around Q96
        const p2Match = fullText.match(/Read the following passage[\s\S]*?(?=96\.)/);
        if (p2Match) {
            passage2Text = clean(p2Match[0]);
        }

        // Parsing Logic Switch
        // Mode A: "1. Question ... (A) ... (B)"
        // Mode B: "Q.1 Question ... (1) ... (2)"

        const isModeB = fullText.includes("Q.1") || fullText.includes("Q. 1");

        console.log(`Parsing Mode: ${isModeB ? "B (Q.1 style)" : "A (1. style)"}`);

        const questions = [];
        let cursor = 0;
        const searchScope = fullText; // Use full text, carefully

        for (let i = 1; i <= 100; i++) {
            let match = null;
            let qRegex;

            if (isModeB) {
                // "Q.1", "Q. 1", "Q.1"
                // Test 5: "Q.1"
                qRegex = new RegExp(`(?:^|\\s)Q\\.\\s*${i}\\s`);
            } else {
                // "1."
                qRegex = new RegExp(`(?:^|\\s)${i}\\.\\s`);
            }

            match = searchScope.substring(cursor).match(qRegex);

            if (!match) {
                // Warning only, some tests might check fewer questions? Or specific parsing error.
                if (i < 90) console.warn(`Could not find Question ${i} in ${testName}`);
                continue;
            }

            const absoluteStart = cursor + match.index + match[0].length;

            // Find End
            let endIdx = searchScope.length;

            if (i < 100) {
                let nextQRegex;
                if (isModeB) {
                    nextQRegex = new RegExp(`(?:^|\\s)Q\\.\\s*${i + 1}\\s`);
                } else {
                    nextQRegex = new RegExp(`(?:^|\\s)${i + 1}\\.\\s`);
                }

                const nextMatch = searchScope.substring(absoluteStart).match(nextQRegex);
                if (nextMatch) {
                    endIdx = absoluteStart + nextMatch.index;
                }
            } else {
                // Last question, cut before next 'ANSWER KEY' or '---PAGE' (optional)
                const kIdx = searchScope.indexOf("ANSWER KEY", absoluteStart);
                if (kIdx > -1) endIdx = kIdx;
            }

            let block = searchScope.substring(absoluteStart, endIdx);
            cursor = endIdx;

            // OPTION PARSING
            let opts = [];
            let qText = "";

            if (isModeB) {
                // Options (1), (2), (3), (4)
                // Sometimes (a), (b) also exist for matching questions.
                // We want the main options. "Choose the correct option: (1)..."

                // If "Choose the correct option" exists, we treat text before it as Q context?
                // Test 5 Q6: "Match ... List I ... List II ... Choose codes: (1)..."

                // Let's rely on (1) (2) (3) (4) split.
                const parts = block.split(/\(\s*[1-4]\s*\)/);

                if (parts.length >= 5) {
                    qText = clean(parts[0]);
                    opts = [clean(parts[1]), clean(parts[2]), clean(parts[3]), clean(parts[4])];
                } else {
                    // Fallback or complex question
                    qText = clean(block);
                }
            } else {
                // Mode A: (A) (B) (C) (D)
                const parts = block.split(/\([A-D]\)/);
                let finalParts = parts;
                if (parts.length < 5) {
                    const partsLower = block.split(/\([a-d]\)/);
                    if (partsLower.length >= 5) finalParts = partsLower;
                }

                if (finalParts.length >= 5) {
                    qText = clean(finalParts[0]);
                    opts = [clean(finalParts[1]), clean(finalParts[2]), clean(finalParts[3]), clean(finalParts[4])];
                } else {
                    // For now, leave empty or raw block
                    // opts = ["Parsing Error within block: " + block];
                    qText = clean(block);
                }
            }

            // Normalize Answer Key if Mode B (Map 1->A?)
            // Key in Test 5 says "1 A", but Options are 1, 2, 3, 4.
            // We should ideally convert user choice 1->A? 
            // Or just store Answer "A" (which is key) and UI handles mapping "Option 1 == A".
            // Yes, standard is Option 1 is A.

            // Passages
            let pid = null;
            // Mode A logic
            if (!isModeB) {
                if (i >= 91 && i <= 95) pid = "passage_1";
                if (i >= 96 && i <= 100) pid = "passage_2";
            } else {
                // Mode B might have different passage numbers. 
                // We'll leave null for now or infer.
            }

            questions.push({
                id: i,
                question: qText,
                options: opts,
                answer: answerKey[i] || null,
                passageId: pid,
                passage: null
            });
        }

        const output = {
            testName: testName,
            passages: {
                "passage_1": passage1Text,
                "passage_2": passage2Text
            },
            questions: questions
        };

        fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
        console.log(`Saved ${outputFile} with ${questions.length} questions.`);

    } catch (e) {
        console.error("Error:", e);
    }
}

run();
