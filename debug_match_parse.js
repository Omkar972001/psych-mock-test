
const testString = `Match List I with List II
LIST I 	LIST II
(a) Young-Helmholtz theory 	(I) Colour perception
(b) Place theory 	(II) High pitches
(c) Touch sensations 	(III) Rubber-hand illusion
(d) Gate control theory 	(IV) Pain
Choose the correct answer from the options given below:`;

const testString2 = `Match List I with List II
LIST I 	LIST II
(a) Sigmund Freud 	(I) Genetic view
(b) B.F. Skinner 	(II) Psychoanalytic view
(c) Carl Rogers 	(III) Behavioural view
(d) Hans Eysenck 	(IV) Humanistic view
Choose the correct answer from the options given below:`;

const app = {
    parseMatchQuestion: (text) => {
        if (!text) return null;
        if (!/List\s*-?\s*I/i.test(text) || !/List\s*-?\s*II/i.test(text)) return null;

        try {
            const headerMatch = text.match(/^(.*?)List\s*-?\s*I/i);
            const header = headerMatch ? headerMatch[1].trim() : "Match List I with List II";

            const footerMatch = text.match(/(Choose the correct answer.*)$/i);
            const footer = footerMatch ? footerMatch[1].trim() : "";

            const list1 = [];
            const list2 = [];

            const cleanText = text.replace(/\s+/g, ' ');
            const parts = cleanText.split(/\(([a-e])\)/);

            console.log("Parts length:", parts.length);

            if (parts.length < 3) return null;

            for (let i = 1; i < parts.length; i += 2) {
                const label1 = parts[i];
                let contentChunk = parts[i + 1];

                const split2 = contentChunk.split(/\(([IVX]+|\d+)\)/);

                if (split2.length >= 3) {
                    const text1 = split2[0].trim();
                    const label2 = split2[1];
                    let text2 = split2.slice(2).join('(').trim();

                    if (i + 2 >= parts.length) {
                        const fIndex = text2.indexOf("Choose the correct");
                        if (fIndex > -1) text2 = text2.substring(0, fIndex).trim();
                    }

                    list1.push({ label: label1, text: text1 });
                    list2.push({ label: label2, text: text2 });
                } else {
                    console.log("Failed to split chunk:", contentChunk);
                    return null;
                }
            }

            if (list1.length === 0) return null;

            return { header, list1, list2, footer };

        } catch (e) {
            console.error("Parse Match Error", e);
            return null;
        }
    }
};

console.log("Test 1 Result:", JSON.stringify(app.parseMatchQuestion(testString), null, 2));
console.log("Test 2 Result:", JSON.stringify(app.parseMatchQuestion(testString2), null, 2));
