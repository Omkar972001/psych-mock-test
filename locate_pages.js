
const fs = require('fs');
const path = require('path');

const dumpPath = path.join(__dirname, 'pdf_full_dump.txt');
const content = fs.readFileSync(dumpPath, 'utf8');
const lines = content.split('\n');

const markers = [
    '--- PAGE 73 ---', // Test 3 Key?
    '--- PAGE 74 ---', // Test 3 Key?
    '--- PAGE 106 ---', // Test 4 Key?
    '--- PAGE 107 ---', // Test 4 Key?
    '--- PAGE 50 ---', // Test 1/2 check
    '--- PAGE 29 ---'  // Test check
];

markers.forEach(marker => {
    const index = lines.findIndex(line => line.includes(marker));
    if (index !== -1) {
        console.log(`Found ${marker} at line ${index + 1}`);
        // Print next 10 lines to identify the test
        for (let i = 1; i <= 10; i++) {
            if (lines[index + i]) console.log(`${index + 1 + i}: ${lines[index + i]}`);
        }
    } else {
        console.log(`Could not find ${marker}`);
    }
});

// Also search for "Teplov" manually
const teplovLine = lines.findIndex(line => line.toLowerCase().includes('teplov'));
if (teplovLine !== -1) {
    console.log(`\nFound 'Teplov' at line ${teplovLine + 1}`);
    console.log(lines[teplovLine + 1]);
} else {
    console.log("\nCould not find 'Teplov'");
}

// Search for 'distinctive feature'
const distinctiveLine = lines.findIndex(line => line.toLowerCase().includes('distinctive feature'));
if (distinctiveLine !== -1) {
    console.log(`\nFound 'distinctive feature' at line ${distinctiveLine + 1}`);
    console.log(lines[distinctiveLine + 1]);
} else {
    console.log("\nCould not find 'distinctive feature'");
}
