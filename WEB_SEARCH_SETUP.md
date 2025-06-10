# Web Search Setup Guide

This guide explains how to set up and use the web search functionality in OP3.

## Overview

OP3 supports two types of web search:

1. **OpenAI Built-in Web Search** - For supported OpenAI models (gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-4)
2. **Google Custom Search** - Fallback for other models or when OpenAI search is not available

## Setup Instructions

### 1. OpenAI Web Search (Recommended)

OpenAI's built-in web search works automatically with supported models. No additional configuration is required.

**Supported Models:**
- gpt-4o
- gpt-4o-mini  
- gpt-4-turbo
- gpt-4

### 2. Google Custom Search (Fallback)

For models that don't support OpenAI's built-in search, you can configure Google Custom Search.

#### Step 1: Get Google Search API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the "Custom Search API"
4. Go to "Credentials" and create an API key
5. Copy the API key

#### Step 2: Create Custom Search Engine

1. Go to [Google Custom Search Engine](https://cse.google.com/cse/)
2. Click "Add" to create a new search engine
3. Enter `*` in "Sites to search" to search the entire web
4. Click "Create"
5. Copy the Search Engine ID from the setup page

#### Step 3: Configure Environment Variables

Add the following to your `backend-api/.env` file:

```env
GOOGLE_SEARCH_API_KEY=your-google-search-api-key-here
GOOGLE_SEARCH_ENGINE_ID=your-custom-search-engine-id-here
```

## How to Use

1. **Enable Search**: Click the search icon (🔍) in the chat input area to toggle web search
2. **Send Message**: Type your question and send it
3. **View Results**: When search is enabled, you'll see:
   - Search indicator showing the search is in progress
   - Search results displayed before the AI response
   - AI response that incorporates the search results

## Features

### Search Indicators

- **Search Starting**: Shows when web search begins
- **Search Results**: Displays found results with titles, snippets, and URLs
- **Search Integration**: AI responses incorporate search results automatically

### Model Support

- **OpenAI Models**: Use built-in web search when available
- **Other Models**: Fall back to Google Custom Search
- **Automatic Detection**: The system automatically chooses the best search method

## Troubleshooting

### Search Not Working

1. **Check Environment Variables**: Ensure Google Search API credentials are set
2. **Verify API Key**: Test your Google Search API key in Google Cloud Console
3. **Check Model Support**: Verify your AI model supports web search
4. **Review Logs**: Check backend logs for search-related errors

### Common Issues

- **"Web search is not configured"**: Google Search API credentials are missing
- **Search results empty**: API quota exceeded or search engine misconfigured
- **Search timeout**: Network issues or API rate limiting

### Error Messages

- `Web search is not configured`: Add Google Search API credentials
- `Google Search API error`: Check API key and quota
- `Failed to perform Google search`: Network or configuration issue

## API Integration

The web search functionality is integrated into the chat streaming API:

```typescript
// Frontend usage
await apiClient.streamChatMessage(
    sessionId,
    {
        content: "What's the latest news about AI?",
        searchEnabled: true  // Enable web search
    },
    {
        onSearchStart: (query) => console.log('Searching:', query),
        onSearchResults: (query, results) => console.log('Results:', results),
        onChunk: (chunk) => console.log('AI response:', chunk.content)
    }
);
```

## Security Notes

- Keep your Google Search API key secure
- Use environment variables, never commit API keys to version control
- Monitor API usage to avoid unexpected charges
- Consider setting up API quotas and alerts in Google Cloud Console

## Cost Considerations

- **OpenAI Web Search**: Included in OpenAI API costs
- **Google Custom Search**: 100 free searches per day, then $5 per 1000 queries
- Monitor usage through respective provider dashboards
