const fs = require('fs');
const { PDFParse } = require('pdf-parse');

const dataBuffer = fs.readFileSync('knowledge/PsychologyVOL21compressed.pdf');

// New API usage for pdf-parse v2.4.5
const parser = new PDFParse({ data: dataBuffer });

parser.getText().then(function (data) {
    // data is TextResult which has .text property?
    // Checking Type definition: getText() returns Promise<TextResult>
    // TextResult has .text
    console.log('Text Length:', data.text.length);
    fs.writeFileSync('knowledge/vol21_dump.txt', data.text);
    console.log('Dump saved to knowledge/vol21_dump.txt');

    // Quick check for keyword
    if (data.text.includes('JUNE 2024')) {
        console.log('SUCCESS: Found "JUNE 2024" in text.');
    } else {
        console.log('WARNING: "JUNE 2024" not explicitly found. Check dump.');
    }
}).catch(err => {
    console.error('Error:', err);
});
