"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface DebugResult {
    step: string;
    success: boolean;
    data?: any;
    error?: string;
    timestamp: string;
}

export function OpenAIDebugComponent() {
    const [apiKey, setApiKey] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<DebugResult[]>([]);

    const addResult = (step: string, success: boolean, data?: any, error?: string) => {
        const result: DebugResult = {
            step,
            success,
            data,
            error,
            timestamp: new Date().toLocaleTimeString()
        };
        setResults(prev => [...prev, result]);
        return result;
    };

    const testOpenAIModels = async () => {
        if (!apiKey.trim()) {
            addResult('Validation', false, null, 'API key is required');
            return;
        }

        setIsLoading(true);
        setResults([]);

        try {
            // Step 1: Test direct API call to OpenAI models endpoint
            addResult('Step 1: Direct OpenAI API Call', true, 'Starting...');
            
            try {
                const directResponse = await fetch('https://api.openai.com/v1/models', {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (directResponse.ok) {
                    const directData = await directResponse.json();
                    addResult('Step 1: Direct OpenAI API Call', true, {
                        status: directResponse.status,
                        modelsCount: directData.data?.length || 0,
                        firstFewModels: directData.data?.slice(0, 3).map((m: any) => m.id) || []
                    });
                } else {
                    const errorData = await directResponse.json().catch(() => ({}));
                    addResult('Step 1: Direct OpenAI API Call', false, null, 
                        `HTTP ${directResponse.status}: ${errorData.error?.message || 'Unknown error'}`);
                }
            } catch (error) {
                addResult('Step 1: Direct OpenAI API Call', false, null, 
                    error instanceof Error ? error.message : 'Network error');
            }

            // Step 2: Test our backend API endpoint
            addResult('Step 2: Backend API Call', true, 'Starting...');
            
            try {
                const backendResponse = await apiClient.fetchOpenAIModels({ apiKey });
                addResult('Step 2: Backend API Call', backendResponse.success, {
                    success: backendResponse.success,
                    modelsCount: backendResponse.models?.length || 0,
                    message: backendResponse.message,
                    error: backendResponse.error,
                    firstFewModels: backendResponse.models?.slice(0, 3).map((m: any) => m.id) || []
                }, backendResponse.error);
            } catch (error) {
                addResult('Step 2: Backend API Call', false, null, 
                    error instanceof Error ? error.message : 'Network error');
            }

        } finally {
            setIsLoading(false);
        }
    };

    const clearResults = () => {
        setResults([]);
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>OpenAI Models Debug Tool</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="apiKey" className="text-sm font-medium">
                            OpenAI API Key
                        </label>
                        <Input
                            id="apiKey"
                            type="password"
                            placeholder="sk-..."
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex gap-2">
                        <Button 
                            onClick={testOpenAIModels} 
                            disabled={isLoading || !apiKey.trim()}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Testing...
                                </>
                            ) : (
                                'Test OpenAI Models'
                            )}
                        </Button>
                        
                        <Button 
                            variant="outline" 
                            onClick={clearResults}
                            disabled={results.length === 0}
                        >
                            Clear Results
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {results.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Debug Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {results.map((result, index) => (
                                <div key={index} className="border rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-medium">{result.step}</h3>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={result.success ? "default" : "destructive"}>
                                                {result.success ? "Success" : "Failed"}
                                            </Badge>
                                            <span className="text-sm text-muted-foreground">
                                                {result.timestamp}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {result.error && (
                                        <div className="text-sm text-red-600 mb-2">
                                            <strong>Error:</strong> {result.error}
                                        </div>
                                    )}
                                    
                                    {result.data && (
                                        <div className="text-sm">
                                            <strong>Data:</strong>
                                            <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
                                                {JSON.stringify(result.data, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
