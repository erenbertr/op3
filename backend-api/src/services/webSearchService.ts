import { tool } from 'ai';
import { z } from 'zod';

export interface SearchResult {
    title: string;
    url: string;
    snippet: string;
    source?: string;
}

export interface WebSearchResponse {
    success: boolean;
    results: SearchResult[];
    query: string;
    error?: string;
}

/**
 * Web Search Service for non-OpenAI providers
 * Provides web search capabilities using various search APIs
 */
export class WebSearchService {
    private static instance: WebSearchService;

    private constructor() { }

    public static getInstance(): WebSearchService {
        if (!WebSearchService.instance) {
            WebSearchService.instance = new WebSearchService();
        }
        return WebSearchService.instance;
    }

    /**
     * Create a web search tool for use with Vercel AI SDK
     */
    public createWebSearchTool() {
        return tool({
            description: 'Search the web for current information',
            parameters: z.object({
                query: z.string().describe('The search query'),
                maxResults: z.number().optional().default(5).describe('Maximum number of results to return')
            }),
            execute: async ({ query, maxResults = 5 }) => {
                const searchResult = await this.searchWeb(query, maxResults);
                return {
                    query,
                    results: searchResult.results,
                    success: searchResult.success,
                    error: searchResult.error
                };
            }
        });
    }

    /**
     * Search the web using available search APIs
     */
    public async searchWeb(query: string, maxResults: number = 5): Promise<WebSearchResponse> {
        try {
            // Try different search methods in order of preference

            // 1. Try DuckDuckGo search (free, no API key required)
            const duckDuckGoResult = await this.searchDuckDuckGo(query, maxResults);
            if (duckDuckGoResult.success && duckDuckGoResult.results.length > 0) {
                return duckDuckGoResult;
            }

            // 2. Try Bing search if API key is available
            const bingResult = await this.searchBing(query, maxResults);
            if (bingResult.success && bingResult.results.length > 0) {
                return bingResult;
            }

            // 3. Try Google Custom Search if API key is available
            const googleResult = await this.searchGoogle(query, maxResults);
            if (googleResult.success && googleResult.results.length > 0) {
                return googleResult;
            }

            return {
                success: false,
                results: [],
                query,
                error: 'No search results found from any provider'
            };

        } catch (error) {
            console.error('Error in web search:', error);
            return {
                success: false,
                results: [],
                query,
                error: error instanceof Error ? error.message : 'Unknown search error'
            };
        }
    }

    /**
     * Search using DuckDuckGo (free, no API key required)
     */
    private async searchDuckDuckGo(query: string, maxResults: number): Promise<WebSearchResponse> {
        try {
            // Use DuckDuckGo Instant Answer API
            const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);

            if (!response.ok) {
                throw new Error(`DuckDuckGo API error: ${response.status}`);
            }

            const data = await response.json() as any;
            const results: SearchResult[] = [];

            // Process related topics
            if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
                for (const topic of data.RelatedTopics.slice(0, maxResults)) {
                    if (topic.Text && topic.FirstURL) {
                        results.push({
                            title: topic.Text.split(' - ')[0] || topic.Text,
                            url: topic.FirstURL,
                            snippet: topic.Text,
                            source: 'DuckDuckGo'
                        });
                    }
                }
            }

            // Add abstract if available
            if (data.Abstract && data.AbstractURL && results.length < maxResults) {
                results.unshift({
                    title: data.Heading || 'DuckDuckGo Result',
                    url: data.AbstractURL,
                    snippet: data.Abstract,
                    source: 'DuckDuckGo'
                });
            }

            return {
                success: results.length > 0,
                results: results.slice(0, maxResults),
                query
            };

        } catch (error) {
            console.error('DuckDuckGo search error:', error);
            return {
                success: false,
                results: [],
                query,
                error: error instanceof Error ? error.message : 'DuckDuckGo search failed'
            };
        }
    }

    /**
     * Search using Bing Search API (requires API key)
     */
    private async searchBing(query: string, maxResults: number): Promise<WebSearchResponse> {
        const apiKey = process.env.BING_SEARCH_API_KEY;

        if (!apiKey) {
            return {
                success: false,
                results: [],
                query,
                error: 'Bing Search API key not configured'
            };
        }

        try {
            const response = await fetch(`https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=${maxResults}`, {
                headers: {
                    'Ocp-Apim-Subscription-Key': apiKey
                }
            });

            if (!response.ok) {
                throw new Error(`Bing API error: ${response.status}`);
            }

            const data = await response.json() as any;
            const results: SearchResult[] = [];

            if (data.webPages && data.webPages.value) {
                for (const item of data.webPages.value) {
                    results.push({
                        title: item.name,
                        url: item.url,
                        snippet: item.snippet || '',
                        source: 'Bing'
                    });
                }
            }

            return {
                success: results.length > 0,
                results,
                query
            };

        } catch (error) {
            console.error('Bing search error:', error);
            return {
                success: false,
                results: [],
                query,
                error: error instanceof Error ? error.message : 'Bing search failed'
            };
        }
    }

    /**
     * Search using Google Custom Search API (requires API key and search engine ID)
     */
    private async searchGoogle(query: string, maxResults: number): Promise<WebSearchResponse> {
        const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
        const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

        if (!apiKey || !searchEngineId) {
            return {
                success: false,
                results: [],
                query,
                error: 'Google Search API key or search engine ID not configured'
            };
        }

        try {
            const response = await fetch(
                `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=${Math.min(maxResults, 10)}`
            );

            if (!response.ok) {
                throw new Error(`Google Search API error: ${response.status}`);
            }

            const data = await response.json() as any;
            const results: SearchResult[] = [];

            if (data.items) {
                for (const item of data.items) {
                    results.push({
                        title: item.title,
                        url: item.link,
                        snippet: item.snippet || '',
                        source: 'Google'
                    });
                }
            }

            return {
                success: results.length > 0,
                results,
                query
            };

        } catch (error) {
            console.error('Google search error:', error);
            return {
                success: false,
                results: [],
                query,
                error: error instanceof Error ? error.message : 'Google search failed'
            };
        }
    }

    /**
     * Format search results for display in chat
     */
    public formatSearchResults(results: SearchResult[], query: string): string {
        if (results.length === 0) {
            return `No search results found for "${query}".`;
        }

        let formatted = `Search results for "${query}":\n\n`;

        results.forEach((result, index) => {
            formatted += `${index + 1}. **${result.title}**\n`;
            formatted += `   ${result.snippet}\n`;
            formatted += `   Source: ${result.url}\n\n`;
        });

        return formatted;
    }
}
