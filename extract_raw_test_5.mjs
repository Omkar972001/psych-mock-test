import { getDocument } from './node_modules/pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'node:fs';

const pdfPath = './knowledge/UGCNETPSYCHOLOGYPYQBOOK.pdf';
// Test 5: 108-139

async function dump() {
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const loadingTask = getDocument({ data: data });
    const doc = await loadingTask.promise;

    let text = "";
    for (let i = 108; i <= 115; i++) { // Extract first few pages of Test 5 to check start
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        text += `---PAGE_${i}---\n`;
        text += content.items.map(item => item.str).join(" ") + "\n";
    }

    fs.writeFileSync('raw_test_5_debug.txt', text);
    console.log("Dumped raw_test_5_debug.txt");
}
dump();
