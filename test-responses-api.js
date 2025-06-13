// Test script to verify OpenAI Responses API is working
const fetch = require('node-fetch');

async function testResponsesAPI() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
        console.error('Please set OPENAI_API_KEY environment variable');
        process.exit(1);
    }

    const requestBody = {
        model: 'gpt-4o',
        input: 'What is the current weather in New York?',
        tools: [{
            type: "web_search_preview",
            search_context_size: "medium"
        }]
    };

    console.log('Testing OpenAI Responses API...');
    console.log('Request:', JSON.stringify(requestBody, null, 2));

    try {
        const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            return;
        }

        const data = await response.json();
        console.log('Success! Response:', JSON.stringify(data, null, 2));

    } catch (error) {
        console.error('Request failed:', error);
    }
}

testResponsesAPI();
