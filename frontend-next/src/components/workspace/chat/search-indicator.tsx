"use client"

import React from 'react';
import { Search, Globe, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResult {
    title: string;
    url: string;
    snippet: string;
    displayUrl?: string;
}

interface SearchIndicatorProps {
    isSearching?: boolean;
    searchQuery?: string;
    searchResults?: SearchResult[];
    hasError?: boolean;
    errorMessage?: string;
    className?: string;
}

export function SearchIndicator({
    isSearching = false,
    searchQuery,
    searchResults,
    hasError = false,
    errorMessage,
    className
}: SearchIndicatorProps) {
    if (!isSearching && !searchQuery && !searchResults?.length && !hasError) {
        return null;
    }

    return (
        <div className={cn(
            "flex items-start gap-3 p-3 rounded-lg border bg-muted/50",
            hasError && "border-destructive/20 bg-destructive/5",
            className
        )}>
            <div className="flex-shrink-0 mt-0.5">
                {isSearching ? (
                    <Search className="h-4 w-4 text-blue-600" />
                ) : hasError ? (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                ) : searchResults?.length ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                    <Globe className="h-4 w-4 text-muted-foreground" />
                )}
            </div>

            <div className="flex-1 min-w-0">
                {isSearching && searchQuery && (
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">
                            Searching the web...
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Query: "{searchQuery}"
                        </p>
                    </div>
                )}

                {hasError && (
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-destructive">
                            Search failed
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {errorMessage || "Unable to perform web search"}
                        </p>
                    </div>
                )}

                {searchResults && searchResults.length > 0 && !isSearching && (
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-foreground">
                            Found {searchResults.length} search result{searchResults.length !== 1 ? 's' : ''}
                            {searchQuery && ` for "${searchQuery}"`}
                        </p>
                        <div className="space-y-2">
                            {searchResults.slice(0, 3).map((result, index) => (
                                <div key={index} className="space-y-1">
                                    <div className="flex items-start gap-2">
                                        <a
                                            href={result.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline line-clamp-1"
                                        >
                                            {result.title}
                                        </a>
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                        {result.snippet}
                                    </p>
                                    <p className="text-xs text-green-600">
                                        {result.displayUrl || result.url}
                                    </p>
                                </div>
                            ))}
                            {searchResults.length > 3 && (
                                <p className="text-xs text-muted-foreground">
                                    ...and {searchResults.length - 3} more result{searchResults.length - 3 !== 1 ? 's' : ''}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
