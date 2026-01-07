
const fs = require('fs');
const path = require('path');

const test3Path = path.join(__dirname, 'psych_test_03.json');
const test4Path = path.join(__dirname, 'psych_test_04.json');

const test3Raw = `
1   B   51   D
2   B   52   B
3   C   53   B
4   B   54   A
5   A,B,C   55   C
6   B   56   A
7   C   57   C
8   B   58   B
9   B   59   D
10   C   60   C
11   B   61   A
12   C   62   B
13   D   63   B
14   C   64   C
15   C   65   C
16   B   66   A
17   C   67   A
18   A   68   A
19   D   69   C
20   A   70   B
21   A   71   B
22   A   72   D
23   A   73   C
24   B   74   B
25   A,B,C,D   75   B
26   B   76   C
27   A   77   B
28   B   78   A
29   B   79   C
30   A   80   D
31   C   81   D
32   A   82   D
33   A   83   C
34   C   84   B
35   B   85   A
36   C   86   C
37   B   87   C
38   A   88   A
39   B   89   A
40   D   90   D
41   B   91   D
42   B   92   B
43   B   93   A
`;

const test4Raw = `
1   A   11   D   21   D   31   C   41   A   51   C   61   C   71   C   81   D   91   A
2   B   12   D   22   D   32   D   42   D   52   D   62   D   72   A   82   C   92   C
3   A   13   A   23   D   33   B   43   B   53   B   63   B   73   C   83   B   93   A,C
4   C   14   B   24   B   34   C   44   C   54   B   64   B   74   D   84   C   94   D
5   B   15   C   25   D   35   A   45   A   55   B   65   D   75   C   85   A   95   D
6   B   16   A   26   C   36   C   46   B   56   D   66   B   76   C   86   B   96   B
7   A   17   A   27   B   37   C   47   D   57   C   67   D   77   D   87   B   97   D
8   D   18   A   28   C   38   C   48   B   58   C   68   C   78   D   88   D   98   C
9   C   19   B   29   A   39   A   49   C   59   C   69   C   79   B   89   D   99   A
10   A   20   A   30   A   40   C   50   C   60   C   70   A   80   D   90   A   100   D
`;

function parseKey(rawText) {
    const map = {};
    const lines = rawText.trim().split('\n');
    lines.forEach(line => {
        // Replace multiple spaces with single space or tab? 
        // The items are separated by spaces. Format: Q Ans Q Ans...
        // Some answers have commas: "A,B,C" or "A,C".
        // Regex to match pairs: (\d+)\s+([A-D,]+)
        // But some answers are "A,C".

        // Let's just split by whitespace and process in pairs.
        // answers can be "A", "B", "A,C", "A&C".
        // "A&C" in Test 4 content: "93 A&C".
        // "A,B,C" in Test 3 content: "5 A,B,C".

        // Normalize "A&C" to "A,C"? Or keep as is? App logic might need splitting.
        // For now, capture string.

        const tokens = line.trim().split(/\s+/);
        for (let i = 0; i < tokens.length; i += 2) {
            const qInfo = tokens[i];
            const aInfo = tokens[i + 1];

            if (qInfo && aInfo) {
                let ans = aInfo.replace('&', ','); // Normalize & to ,
                map[parseInt(qInfo)] = ans;
            }
        }
    });
    return map;
}

const key3 = parseKey(test3Raw);
const key4 = parseKey(test4Raw);

console.log("Parsed keys for Test 3:", Object.keys(key3).length);
console.log("Parsed keys for Test 4:", Object.keys(key4).length);

function updateFile(filePath, keyMap) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let updatedCount = 0;

    data.questions.forEach(q => {
        if (keyMap[q.id]) {
            // Only update if current is null or we want to overwrite?
            // Let's overwrite to ensure correctness
            q.answer = keyMap[q.id];
            updatedCount++;
        }
    });

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Updated ${updatedCount} answers in ${path.basename(filePath)}`);
}

updateFile(test3Path, key3);
updateFile(test4Path, key4);
