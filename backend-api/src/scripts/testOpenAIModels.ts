import { AIProviderService } from '../services/aiProviderService';

async function testOpenAIModelFetching() {
    console.log('🧪 Testing OpenAI model fetching...');
    
    // You'll need to replace this with a real OpenAI API key for testing
    const testApiKey = 'sk-test-your-api-key-here';
    
    if (testApiKey === 'sk-test-your-api-key-here') {
        console.log('❌ Please replace testApiKey with a real OpenAI API key to test');
        return;
    }
    
    try {
        const aiProviderService = AIProviderService.getInstance();
        
        console.log('📡 Fetching OpenAI models...');
        const result = await aiProviderService.fetchOpenAIModels(testApiKey);
        
        console.log('📋 Result:', JSON.stringify(result, null, 2));
        
        if (result.success) {
            console.log('✅ Successfully fetched models!');
            console.log(`📊 Found ${result.models?.length || 0} models`);
            
            if (result.models && result.models.length > 0) {
                console.log('🔍 First few models:');
                result.models.slice(0, 5).forEach((model, index) => {
                    console.log(`  ${index + 1}. ${model.id} (${model.owned_by || 'unknown owner'})`);
                });
            }
        } else {
            console.log('❌ Failed to fetch models:', result.message);
            console.log('🔍 Error:', result.error);
        }
        
    } catch (error) {
        console.error('💥 Exception occurred:', error);
    }
}

// Run the test
testOpenAIModelFetching().catch(console.error);
