import { ModelPricing } from '../types/ai-provider';

export interface PricingSource {
    name: string;
    url: string;
    fetchPricing: (modelId: string) => Promise<ModelPricing | null>;
}

export class ModelPricingService {
    private static instance: ModelPricingService;
    private pricingSources: PricingSource[] = [];
    private pricingCache: Map<string, { pricing: ModelPricing; timestamp: number }> = new Map();
    private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

    private constructor() {
        this.initializePricingSources();
    }

    public static getInstance(): ModelPricingService {
        if (!ModelPricingService.instance) {
            ModelPricingService.instance = new ModelPricingService();
        }
        return ModelPricingService.instance;
    }

    private initializePricingSources(): void {
        // Add various pricing sources
        this.pricingSources = [
            {
                name: 'OpenAI Official',
                url: 'https://openai.com/api/pricing/',
                fetchPricing: this.fetchOpenAIOfficialPricing.bind(this)
            },
            {
                name: 'LLM Price Tracker',
                url: 'https://llmpricecheck.com/api',
                fetchPricing: this.fetchLLMPriceTrackerPricing.bind(this)
            },
            {
                name: 'AI Model Pricing API',
                url: 'https://api.aimodels.fyi',
                fetchPricing: this.fetchAIModelsPricing.bind(this)
            }
        ];
    }

    // Main method to get pricing for a model
    public async getModelPricing(modelId: string): Promise<ModelPricing> {
        // Check cache first
        const cached = this.pricingCache.get(modelId);
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return cached.pricing;
        }

        // Try to fetch from various sources
        for (const source of this.pricingSources) {
            try {
                const pricing = await source.fetchPricing(modelId);
                if (pricing && (pricing.inputTokens || pricing.outputTokens)) {
                    // Cache the result
                    this.pricingCache.set(modelId, {
                        pricing,
                        timestamp: Date.now()
                    });
                    return pricing;
                }
            } catch (error) {
                console.warn(`Failed to fetch pricing from ${source.name}:`, error);
                continue;
            }
        }

        // Fallback to static pricing
        return this.getFallbackPricing(modelId);
    }

    // Fetch pricing from OpenAI's official pricing page (web scraping)
    private async fetchOpenAIOfficialPricing(modelId: string): Promise<ModelPricing | null> {
        try {
            // Note: This would require web scraping OpenAI's pricing page
            // For now, we'll return null and rely on other sources
            return null;
        } catch (error) {
            console.warn('Error fetching OpenAI official pricing:', error);
            return null;
        }
    }

    // Fetch pricing from LLM Price Tracker (hypothetical API)
    private async fetchLLMPriceTrackerPricing(modelId: string): Promise<ModelPricing | null> {
        try {
            // This is a hypothetical API - replace with actual pricing API
            const response = await fetch(`https://api.llmpricecheck.com/v1/models/${modelId}/pricing`);
            
            if (!response.ok) {
                return null;
            }

            const data = await response.json();
            
            return {
                inputTokens: data.input_price_per_million ? `$${data.input_price_per_million}` : undefined,
                outputTokens: data.output_price_per_million ? `$${data.output_price_per_million}` : undefined,
                contextLength: data.context_length || undefined
            };
        } catch (error) {
            console.warn('Error fetching LLM Price Tracker pricing:', error);
            return null;
        }
    }

    // Fetch pricing from AI Models API (hypothetical)
    private async fetchAIModelsPricing(modelId: string): Promise<ModelPricing | null> {
        try {
            // This is a hypothetical API - replace with actual pricing API
            const response = await fetch(`https://api.aimodels.fyi/v1/pricing/${modelId}`);
            
            if (!response.ok) {
                return null;
            }

            const data = await response.json();
            
            return {
                inputTokens: data.pricing?.input_tokens ? `$${data.pricing.input_tokens}` : undefined,
                outputTokens: data.pricing?.output_tokens ? `$${data.pricing.output_tokens}` : undefined,
                contextLength: data.specs?.context_length || undefined
            };
        } catch (error) {
            console.warn('Error fetching AI Models pricing:', error);
            return null;
        }
    }

    // Fallback pricing when all sources fail
    private getFallbackPricing(modelId: string): ModelPricing {
        const pricing: ModelPricing = {};

        // Static fallback pricing (should be updated regularly)
        const pricingMap: Record<string, ModelPricing> = {
            'o1-preview': {
                inputTokens: '$15.00',
                outputTokens: '$60.00',
                contextLength: 128000
            },
            'o1-mini': {
                inputTokens: '$3.00',
                outputTokens: '$12.00',
                contextLength: 128000
            },
            'gpt-4o': {
                inputTokens: '$5.00',
                outputTokens: '$15.00',
                contextLength: 128000
            },
            'gpt-4o-mini': {
                inputTokens: '$0.15',
                outputTokens: '$0.60',
                contextLength: 128000
            },
            'gpt-4-turbo': {
                inputTokens: '$10.00',
                outputTokens: '$30.00',
                contextLength: 128000
            },
            'gpt-4': {
                inputTokens: '$30.00',
                outputTokens: '$60.00',
                contextLength: 8192
            },
            'gpt-3.5-turbo': {
                inputTokens: '$0.50',
                outputTokens: '$1.50',
                contextLength: 16385
            }
        };

        // Try exact match first
        if (pricingMap[modelId]) {
            return pricingMap[modelId];
        }

        // Try partial matches
        for (const [key, value] of Object.entries(pricingMap)) {
            if (modelId.includes(key) || key.includes(modelId)) {
                return value;
            }
        }

        // Default pricing if no match found
        return {
            inputTokens: 'Contact provider',
            outputTokens: 'Contact provider',
            contextLength: undefined
        };
    }

    // Clear cache (useful for testing or manual refresh)
    public clearCache(): void {
        this.pricingCache.clear();
    }

    // Get cache statistics
    public getCacheStats(): { size: number; entries: string[] } {
        return {
            size: this.pricingCache.size,
            entries: Array.from(this.pricingCache.keys())
        };
    }
}
