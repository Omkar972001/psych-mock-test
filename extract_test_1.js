const fs = require('fs');
const { PDFParse } = require('pdf-parse');

const pdfPath = './knowledge/UGCNETPSYCHOLOGYPYQBOOK.pdf';
const dataBuffer = fs.readFileSync(pdfPath);

(async () => {
    try {
        console.log("Attempting new PDFParse({})...");
        let parser;
        try {
            parser = new PDFParse({ verbosity: 0 });
        } catch (e) {
            console.log("Constructor failed, trying with buffer:", e.message);
            // parser = new PDFParse(dataBuffer); // Unlikely given previous error
        }

        if (!parser) parser = new PDFParse(); // Retry default if catch didn't assign

        console.log("Loading buffer...");
        // Some versions use loadPDF
        if (parser.loadPDF) {
            await parser.loadPDF({ data: dataBuffer });
        } else if (parser.load) {
            await parser.load({ data: dataBuffer });
        }

        console.log("Loaded. Extracting...");
        let extractedText = "";
        for (let i = 6; i <= 29; i++) {
            try {
                // Try 1-based index
                const pageText = await parser.getPageText(i);
                extractedText += `---PAGE_${i}---\n${pageText}\n`;
            } catch (err) {
                console.log(`Page ${i} error: ${err.message}`);
            }
        }

        fs.writeFileSync('./raw_test_1.txt', extractedText);
        console.log("Success!");

    } catch (error) {
        console.error("Final Error: " + error);
        // Fallback: Check if we can use it as a function?
        // const res = await PDFParse(dataBuffer); // purely hypothetical
    }
})();
