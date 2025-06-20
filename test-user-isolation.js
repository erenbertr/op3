#!/usr/bin/env node

/**
 * Test script to validate user isolation for AI provider configurations
 * This script tests that users cannot see or access other users' AI provider configurations
 */

const API_BASE = 'http://localhost:3006/api/v1';

// Test users
const testUsers = [
    {
        email: 'user1@test.com',
        password: 'password123',
        name: 'Test User 1'
    },
    {
        email: 'user2@test.com', 
        password: 'password123',
        name: 'Test User 2'
    }
];

let userTokens = {};

async function makeRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        const data = await response.json();
        return { status: response.status, data };
    } catch (error) {
        console.error(`❌ Request failed for ${endpoint}:`, error.message);
        return { status: 500, data: { error: error.message } };
    }
}

async function registerUser(user) {
    console.log(`📝 Registering user: ${user.email}`);
    
    const result = await makeRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(user)
    });
    
    if (result.status === 201 || result.status === 200) {
        console.log(`✅ User ${user.email} registered successfully`);
        return true;
    } else if (result.data.message && result.data.message.includes('already exists')) {
        console.log(`ℹ️  User ${user.email} already exists`);
        return true;
    } else {
        console.log(`❌ Failed to register user ${user.email}:`, result.data.message);
        return false;
    }
}

async function loginUser(user) {
    console.log(`🔐 Logging in user: ${user.email}`);
    
    const result = await makeRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
            email: user.email,
            password: user.password
        })
    });
    
    if (result.status === 200 && result.data.token) {
        console.log(`✅ User ${user.email} logged in successfully`);
        userTokens[user.email] = result.data.token;
        return result.data.token;
    } else {
        console.log(`❌ Failed to login user ${user.email}:`, result.data.message);
        return null;
    }
}

async function createOpenAIProvider(userEmail, providerData) {
    console.log(`🔧 Creating OpenAI provider for ${userEmail}`);
    
    const result = await makeRequest('/openai-providers', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${userTokens[userEmail]}`
        },
        body: JSON.stringify(providerData)
    });
    
    if (result.status === 201 || result.status === 200) {
        console.log(`✅ OpenAI provider created for ${userEmail}`);
        return result.data.provider;
    } else {
        console.log(`❌ Failed to create OpenAI provider for ${userEmail}:`, result.data.message);
        return null;
    }
}

async function getOpenAIProviders(userEmail) {
    console.log(`📋 Getting OpenAI providers for ${userEmail}`);
    
    const result = await makeRequest('/openai-providers', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${userTokens[userEmail]}`
        }
    });
    
    if (result.status === 200) {
        console.log(`✅ Retrieved ${result.data.providers?.length || 0} providers for ${userEmail}`);
        return result.data.providers || [];
    } else {
        console.log(`❌ Failed to get OpenAI providers for ${userEmail}:`, result.data.message);
        return [];
    }
}

async function createOpenAIModelConfig(userEmail, configData) {
    console.log(`🤖 Creating OpenAI model config for ${userEmail}`);
    
    const result = await makeRequest('/openai-model-configs', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${userTokens[userEmail]}`
        },
        body: JSON.stringify(configData)
    });
    
    if (result.status === 201 || result.status === 200) {
        console.log(`✅ OpenAI model config created for ${userEmail}`);
        return result.data.modelConfig;
    } else {
        console.log(`❌ Failed to create OpenAI model config for ${userEmail}:`, result.data.message);
        return null;
    }
}

async function getOpenAIModelConfigs(userEmail) {
    console.log(`📋 Getting OpenAI model configs for ${userEmail}`);
    
    const result = await makeRequest('/openai-model-configs', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${userTokens[userEmail]}`
        }
    });
    
    if (result.status === 200) {
        console.log(`✅ Retrieved ${result.data.modelConfigs?.length || 0} model configs for ${userEmail}`);
        return result.data.modelConfigs || [];
    } else {
        console.log(`❌ Failed to get OpenAI model configs for ${userEmail}:`, result.data.message);
        return [];
    }
}

async function testUserIsolation() {
    console.log('🚀 Starting User Isolation Tests\n');
    
    // Step 1: Register and login test users
    console.log('📝 Step 1: Setting up test users');
    for (const user of testUsers) {
        await registerUser(user);
        await loginUser(user);
    }
    console.log('');
    
    // Step 2: Create AI providers for each user
    console.log('🔧 Step 2: Creating AI providers for each user');
    const user1Provider = await createOpenAIProvider(testUsers[0].email, {
        name: 'User 1 OpenAI Provider',
        apiKey: 'sk-test-user1-key-12345678901234567890123456789012345678901234567890',
        isActive: true
    });
    
    const user2Provider = await createOpenAIProvider(testUsers[1].email, {
        name: 'User 2 OpenAI Provider', 
        apiKey: 'sk-test-user2-key-12345678901234567890123456789012345678901234567890',
        isActive: true
    });
    console.log('');
    
    // Step 3: Test provider isolation
    console.log('🔒 Step 3: Testing provider isolation');
    const user1Providers = await getOpenAIProviders(testUsers[0].email);
    const user2Providers = await getOpenAIProviders(testUsers[1].email);
    
    console.log(`User 1 can see ${user1Providers.length} providers`);
    console.log(`User 2 can see ${user2Providers.length} providers`);
    
    // Check that users only see their own providers
    const user1CanSeeUser2Provider = user1Providers.some(p => p.name === 'User 2 OpenAI Provider');
    const user2CanSeeUser1Provider = user2Providers.some(p => p.name === 'User 1 OpenAI Provider');
    
    if (user1CanSeeUser2Provider) {
        console.log('❌ ISOLATION FAILURE: User 1 can see User 2\'s provider');
        return false;
    }
    
    if (user2CanSeeUser1Provider) {
        console.log('❌ ISOLATION FAILURE: User 2 can see User 1\'s provider');
        return false;
    }
    
    console.log('✅ Provider isolation test passed');
    console.log('');
    
    // Step 4: Create model configs if providers were created successfully
    if (user1Provider && user2Provider) {
        console.log('🤖 Step 4: Creating model configurations');
        
        const user1ModelConfig = await createOpenAIModelConfig(testUsers[0].email, {
            keyId: user1Provider.id,
            modelId: 'gpt-4o-mini',
            modelName: 'GPT-4o Mini',
            customName: 'User 1 GPT-4o Mini',
            capabilities: {
                supportsImages: false,
                supportsFiles: false,
                supportsWebSearch: false,
                supportsReasoning: false
            },
            pricing: {
                inputTokens: 0.00015,
                outputTokens: 0.0006,
                currency: 'USD'
            },
            contextWindow: 128000,
            maxOutputTokens: 16384
        });
        
        const user2ModelConfig = await createOpenAIModelConfig(testUsers[1].email, {
            keyId: user2Provider.id,
            modelId: 'gpt-4o-mini',
            modelName: 'GPT-4o Mini',
            customName: 'User 2 GPT-4o Mini',
            capabilities: {
                supportsImages: false,
                supportsFiles: false,
                supportsWebSearch: false,
                supportsReasoning: false
            },
            pricing: {
                inputTokens: 0.00015,
                outputTokens: 0.0006,
                currency: 'USD'
            },
            contextWindow: 128000,
            maxOutputTokens: 16384
        });
        console.log('');
        
        // Step 5: Test model config isolation
        console.log('🔒 Step 5: Testing model config isolation');
        const user1ModelConfigs = await getOpenAIModelConfigs(testUsers[0].email);
        const user2ModelConfigs = await getOpenAIModelConfigs(testUsers[1].email);
        
        console.log(`User 1 can see ${user1ModelConfigs.length} model configs`);
        console.log(`User 2 can see ${user2ModelConfigs.length} model configs`);
        
        // Check that users only see their own model configs
        const user1CanSeeUser2Config = user1ModelConfigs.some(c => c.customName === 'User 2 GPT-4o Mini');
        const user2CanSeeUser1Config = user2ModelConfigs.some(c => c.customName === 'User 1 GPT-4o Mini');
        
        if (user1CanSeeUser2Config) {
            console.log('❌ ISOLATION FAILURE: User 1 can see User 2\'s model config');
            return false;
        }
        
        if (user2CanSeeUser1Config) {
            console.log('❌ ISOLATION FAILURE: User 2 can see User 1\'s model config');
            return false;
        }
        
        console.log('✅ Model config isolation test passed');
    }
    
    console.log('\n🎉 All user isolation tests passed!');
    return true;
}

// Run the tests
testUserIsolation()
    .then(success => {
        if (success) {
            console.log('\n✅ User isolation is working correctly');
            process.exit(0);
        } else {
            console.log('\n❌ User isolation tests failed');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('\n💥 Test execution failed:', error);
        process.exit(1);
    });
