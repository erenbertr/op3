import { SearchResult } from '../types/chat';

export interface GoogleSearchConfig {
    apiKey: string;
    searchEngineId: string;
}

export class GoogleSearchService {
    private config: GoogleSearchConfig;

    constructor(config: GoogleSearchConfig) {
        this.config = config;
    }

    /**
     * Perform a Google Custom Search
     */
    async search(query: string, numResults: number = 5): Promise<SearchResult[]> {
        if (!this.config.apiKey || !this.config.searchEngineId) {
            throw new Error('Google Search API key and Search Engine ID are required');
        }

        const url = new URL('https://www.googleapis.com/customsearch/v1');
        url.searchParams.set('key', this.config.apiKey);
        url.searchParams.set('cx', this.config.searchEngineId);
        url.searchParams.set('q', query);
        url.searchParams.set('num', Math.min(numResults, 10).toString());

        try {
            const response = await fetch(url.toString());

            if (!response.ok) {
                throw new Error(`Google Search API error: ${response.status} ${response.statusText}`);
            }

            const data: any = await response.json();

            if (!data.items || !Array.isArray(data.items)) {
                return [];
            }

            return data.items.map((item: any) => ({
                title: item.title || '',
                url: item.link || '',
                snippet: item.snippet || ''
            }));
        } catch (error) {
            console.error('Google Search error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to perform Google search: ${errorMessage}`);
        }
    }

    /**
     * Check if Google Search is configured
     */
    isConfigured(): boolean {
        return !!(this.config.apiKey && this.config.searchEngineId);
    }
}

/**
 * Create Google Search service instance from environment variables
 */
export function createGoogleSearchService(): GoogleSearchService | null {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

    if (!apiKey || !searchEngineId) {
        console.warn('Google Search not configured: Missing GOOGLE_SEARCH_API_KEY or GOOGLE_SEARCH_ENGINE_ID');
        return null;
    }

    return new GoogleSearchService({
        apiKey,
        searchEngineId
    });
}
