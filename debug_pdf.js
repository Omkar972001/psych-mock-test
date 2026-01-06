const lib = require('pdf-parse');
console.log("Keys:", Object.keys(lib));
if (lib.PDFParse) {
    console.log("PDFParse type:", typeof lib.PDFParse);
    console.log("PDFParse prototype keys:", Object.getOwnPropertyNames(lib.PDFParse.prototype));
    console.log("PDFParse static keys:", Object.getOwnPropertyNames(lib.PDFParse));
}
