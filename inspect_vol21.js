const fs = require('fs');
const dump = fs.readFileSync('knowledge/vol21_dump.txt', 'utf8');

const regex = /(JUNE|DECEMBER|MARCH|SEPTEMBER)[_\s]*(\d{4})[_\s]*(SHIFT\s*[I]+)?|ANSWER KEY/gi;
let match;
while ((match = regex.exec(dump)) !== null) {
    console.log(`Found '${match[0]}' at index ${match.index}`);
}
