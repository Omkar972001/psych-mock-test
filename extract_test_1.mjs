import { getDocument } from './node_modules/pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'node:fs';

const pdfPath = './knowledge/UGCNETPSYCHOLOGYPYQBOOK.pdf';

if (!fs.existsSync(pdfPath)) {
    console.error(`File not found: ${pdfPath}`);
    process.exit(1);
}

const data = new Uint8Array(fs.readFileSync(pdfPath));

// Disable worker (or let it fail back to main thread)
// Usually in Node it works fine if we don't set workerSrc.

async function extract() {
    try {
        const loadingTask = getDocument({
            data: data,
            // In Node, we might need to verify font loading, but standard fonts should be fine
            disableFontFace: true,
        });

        const doc = await loadingTask.promise;
        console.log(`PDF Loaded. Metadata: ${doc.numPages} pages.`);

        let fullText = "";

        // Loop pages 6 to 29 (Test 1)
        for (let i = 6; i <= 29; i++) {
            const page = await doc.getPage(i);
            const content = await page.getTextContent();

            // Simple join
            const strings = content.items.map(item => item.str);

            // pdf.js text items are often fragmented.
            // We'll join with " " but sometimes newlines are needed.
            // Usually item.hasEOL or transform[5] change indicates newline.
            // For now, join with space and cleanup later.
            // Better: Join with "\n" if we detect Y coordinate change?
            // Let's just dump it for now.

            fullText += `---PAGE_${i}---\n` + strings.join(" ") + "\n";
        }

        fs.writeFileSync('./raw_test_1.txt', fullText);
        console.log("Success: Written to raw_test_1.txt");

    } catch (e) {
        console.error("Error:", e);
    }
}

extract();
