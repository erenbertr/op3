// Simple test script to verify word count functionality
// Run with: node test-word-count.js

// Helper function to count words in a message (copied from chat-message.tsx)
const countWords = (text) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

// Test cases
const testCases = [
    {
        name: "Short message",
        content: "This is a short message",
        expectedWords: 5,
        expectedLongMessage: false
    },
    {
        name: "Empty message",
        content: "",
        expectedWords: 0,
        expectedLongMessage: false
    },
    {
        name: "Single word",
        content: "Hello",
        expectedWords: 1,
        expectedLongMessage: false
    },
    {
        name: "Message with extra spaces",
        content: "  This   has   extra   spaces  ",
        expectedWords: 4,
        expectedLongMessage: false
    },
    {
        name: "Exactly 500 words",
        content: "word ".repeat(500).trim(),
        expectedWords: 500,
        expectedLongMessage: true
    },
    {
        name: "499 words (just under threshold)",
        content: "word ".repeat(499).trim(),
        expectedWords: 499,
        expectedLongMessage: false
    },
    {
        name: "501 words (just over threshold)",
        content: "word ".repeat(501).trim(),
        expectedWords: 501,
        expectedLongMessage: true
    },
    {
        name: "Long message with varied words",
        content: "This is a very long message that contains many different words and should definitely exceed the 500 word threshold for displaying duplicate actions. ".repeat(10),
        expectedWords: 230, // 23 words * 10 repetitions
        expectedLongMessage: false
    },
    {
        name: "Very long message",
        content: "This is a very long message that contains many different words and should definitely exceed the 500 word threshold for displaying duplicate actions. ".repeat(25),
        expectedWords: 575, // 23 words * 25 repetitions
        expectedLongMessage: true
    }
];

// Run tests
console.log("🧪 Testing word count functionality...\n");

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
    const actualWords = countWords(testCase.content);
    const actualLongMessage = actualWords >= 500;
    
    const wordsMatch = actualWords === testCase.expectedWords;
    const longMessageMatch = actualLongMessage === testCase.expectedLongMessage;
    
    if (wordsMatch && longMessageMatch) {
        console.log(`✅ Test ${index + 1}: ${testCase.name}`);
        console.log(`   Words: ${actualWords} (expected: ${testCase.expectedWords})`);
        console.log(`   Long message: ${actualLongMessage} (expected: ${testCase.expectedLongMessage})`);
        passed++;
    } else {
        console.log(`❌ Test ${index + 1}: ${testCase.name}`);
        console.log(`   Words: ${actualWords} (expected: ${testCase.expectedWords}) ${wordsMatch ? '✓' : '✗'}`);
        console.log(`   Long message: ${actualLongMessage} (expected: ${testCase.expectedLongMessage}) ${longMessageMatch ? '✓' : '✗'}`);
        failed++;
    }
    console.log();
});

// Summary
console.log("📊 Test Results:");
console.log(`   Passed: ${passed}`);
console.log(`   Failed: ${failed}`);
console.log(`   Total: ${testCases.length}`);

if (failed === 0) {
    console.log("\n🎉 All tests passed! Word count functionality is working correctly.");
    process.exit(0);
} else {
    console.log("\n💥 Some tests failed. Please check the implementation.");
    process.exit(1);
}
