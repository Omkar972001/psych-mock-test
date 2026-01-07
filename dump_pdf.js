const fs = require('fs');
const pdf = require('pdf-parse');

const dataBuffer = fs.readFileSync('knowledge/UGCNETPSYCHOLOGYPYQBOOK.pdf');

pdf(dataBuffer).then(function (data) {
    // Save to a text file for easy inspection
    fs.writeFileSync('pdf_dump.txt', data.text);
    console.log("PDF text extracted to pdf_dump.txt");

    // Print first 2000 chars to see structure
    console.log(data.text.substring(0, 2000));
});
