const fs = require('fs');
const pdflib = require('pdf-parse');

console.log('Type of import:', typeof pdflib);
console.log('Keys:', Object.keys(pdflib));

if (typeof pdflib === 'function') {
    console.log('It is a function');
} else {
    console.log('It is an object');
}
