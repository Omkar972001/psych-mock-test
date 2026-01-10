const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'psych_test_04.json');
const rawData = fs.readFileSync(filePath, 'utf8');
const data = JSON.parse(rawData);
const questions = data.questions || data; // Handle if it was already flat (unlikely now)

const Q12_FIX = {
    text: "Given below are two statements: One is labelled as Assertion (A) and the other is labelled as Reason (R).\nAssertion (A): Project Head start and other preschool quality programme boost children's chances of success in future by increasing their school readiness.\nReason (R): Genes and experience together determine cognitive and social skills.\nIn the light of the above statements, choose the most appropriate answer from the options given below:",
    options: {
        "A": "Both (A) and (R) are true and (R) is the correct explanation of (A)",
        "B": "Both (A) and (R) are true but (R) is not the correct explanation of (A)",
        "C": "(A) is true but (R) is false",
        "D": "(A) is false but (R) is true"
    }
};

const Q22_FIX = {
    text: "Given below are two statements: one is labelled as Assertion (A) and the other is labelled as Reason (R)\nAssertion (A): There are five universal human needs according to reality therapy\nReason (R): These needs are - survival, love & belonging, power, freedom and fun\nIn the light of the above statements, choose the most appropriate answer from the options given below:",
    options: {
        "A": "Both (A) and (R) are correct and (R) is the correct explanation of (A)",
        "B": "Both (A) and (R) are correct but (R) is Not the correct explanation of (A)",
        "C": "(A) is correct but (R) is not correct",
        "D": "(A) is not correct but (R) is correct"
    }
};

const Q33_FIX = {
    text: "Given below are two statements: one is labelled as Assertion (A) and the other is labelled as Reason (R). \nAssertion (A): Monozygotic twins are called fraternal twins, who share half of their genes. Both members of the twins may be males or females. \nReason (R): Dizygotic twins develop from two different eggs and share the genes like a brother and sister. One of the twins may be a male and the other one may be a female. \nIn the light of the above statements, choose the most appropriate answer from the options given below:",
    options: {
        "A": "Both (A) and (R) are correct and (R) is the correct explanation of (A)",
        "B": "Both (A) and (R) are correct but (R) is Not the correct explanation of (A)",
        "C": "(A) is correct but (R) is not correct",
        "D": "(A) is not correct but (R) is correct"
    }
};

questions.forEach(q => {
    // 1. Specific Fixes for Q12, Q22, and Q33
    if (q.id === 12) {
        q.text = Q12_FIX.text;
        q.options = Q12_FIX.options;
    } else if (q.id === 22) {
        q.text = Q22_FIX.text;
        q.options = Q22_FIX.options;
    } else if (q.id === 33) {
        q.text = Q33_FIX.text;
        q.options = Q33_FIX.options;
    }

    // 2. General Cleanup
    // SKIP Match List questions to avoid breaking the parser (which relies on newlines)
    if (q.text && (q.text.includes("Match List") || q.text.includes("List I") || q.text.includes("List-I"))) {
        // Only basic trim, do NOT remove structural newlines
        // Maybe fix " \n" to "\n"
        return;
    }

    if (q.text) {
        let text = q.text;

        // Replace newline with space
        text = text.replace(/\n/g, ' ');

        // Collapse multiple spaces
        text = text.replace(/\s+/g, ' ');

        // Re-inject newlines for specific structural markers
        // Using a replacement function to ensure we don't double-add newlines if logic changes later
        // But here we just flattened everything, so we can just replace.

        text = text.replace(/Assertion \([A]\):/gi, '\nAssertion (A):');
        text = text.replace(/Reason \([R]\):/gi, '\nReason (R):');
        text = text.replace(/Statement \(I\):|Statement I:/gi, '\nStatement I:');
        text = text.replace(/Statement \(II\):|Statement II:/gi, '\nStatement II:');

        // "In the light of..." usually follows a block, give it a newline
        text = text.replace(/In the light of the above/gi, '\nIn the light of the above');

        // Fix common typo "labelled as Reason (R)" followed by "Assertion" (if any)

        q.text = text.trim();
    }
});

fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
console.log("Updated psych_test_04.json");
