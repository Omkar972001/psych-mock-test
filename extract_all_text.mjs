import { getDocument } from './node_modules/pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'node:fs';

const pdfPath = './knowledge/UGCNETPSYCHOLOGYPYQBOOK.pdf';

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

                // Join items with whitespace
                const strings = content.items.map(item => item.str);

                // Add page marker
                fullText += `\n--- PAGE ${i} ---\n`;
                fullText += strings.join(" ");
            } catch (pageErr) {
                console.error(`Error on page ${i}:`, pageErr);
            }
        }

        fs.writeFileSync('./pdf_full_dump.txt', fullText);
        console.log("Success: Written to pdf_full_dump.txt");

    } catch (e) {
        console.error("Error:", e);
    }
}

extract();
