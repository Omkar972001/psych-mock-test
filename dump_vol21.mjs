import { getDocument } from './node_modules/pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'node:fs';

const pdfPath = './knowledge/PsychologyVOL21compressed.pdf';

if (!fs.existsSync(pdfPath)) {
    console.error(`File not found: ${pdfPath}`);
    process.exit(1);
}

const data = new Uint8Array(fs.readFileSync(pdfPath));

async function extract() {
    try {
        const loadingTask = getDocument({
            data: data,
            disableFontFace: true,
        });

        const doc = await loadingTask.promise;
        console.log(`PDF Loaded. Metadata: ${doc.numPages} pages.`);

        let fullText = "";

        // Iterate all pages
        for (let i = 1; i <= doc.numPages; i++) {
            try {
                const page = await doc.getPage(i);
                const content = await page.getTextContent();
                const strings = content.items.map(item => item.str); // Join items

                fullText += `\n--- PAGE ${i} ---\n`;
                fullText += strings.join(" ");
            } catch (pageErr) {
                console.error(`Error on page ${i}:`, pageErr);
            }
        }

        fs.writeFileSync('knowledge/vol21_dump.txt', fullText);
        console.log("Success: Written to knowledge/vol21_dump.txt");

        if (fullText.toLowerCase().includes("june 2024")) {
            console.log("SUCCESS: Found 'june 2024' (case insensitive).");
        } else {
            console.log("WARNING: 'june 2024' not found in this PDF.");
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

extract();
