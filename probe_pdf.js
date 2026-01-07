const fs = require('fs');
const pdfLib = require('pdf-parse');

const dataBuffer = fs.readFileSync('knowledge/UGCNETPSYCHOLOGYPYQBOOK.pdf');

// Based on previous debug, maybe pdfLib.PDFParse is the function?
// Or maybe I should try importing it differently.
// Let's try calling the likely candidate.

try {
    if (pdfLib.PDFParse) {
        console.log("Found PDFParse, attempting to use it...");
        // Usually pdf-parse takes buffer and options
        // But if this is a different lib, signature might differ.
        // Let's try instantiation if it's a class or calling if function.

        // checking if constructor
        try {
            const parser = new pdfLib.PDFParse();
            console.log("Instantiated PDFParse class");
        } catch (e) {
            console.log("Not a class or failed ctor:", e.message);
        }
    } else {
        console.log("PDFParse key not found?");
    }
} catch (e) {
    console.log("Error:", e);
}
