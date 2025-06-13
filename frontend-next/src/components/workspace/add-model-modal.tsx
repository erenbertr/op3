import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Brain, Search, FileUp, Image, FileText, Eye, Code, Calculator, Zap, Filter, X } from 'lucide-react';
import { ModelCapabilities, ModelPricing } from '@/lib/api/openai-model-configs';

interface OpenAIModel {
    id: string;
    object: string;
    created: number;
    owned_by: string;
}

interface AddModelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddModel: (modelId: string, customName?: string) => Promise<void>;
    availableModels: OpenAIModel[];
    isLoading?: boolean;
}

const AddModelModal: React.FC<AddModelModalProps> = ({
    isOpen,
    onClose,
    onAddModel,
    availableModels,
    isLoading = false
}) => {
    const [selectedModel, setSelectedModel] = useState<OpenAIModel | null>(null);
    const [customName, setCustomName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Search and filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [ownerFilter, setOwnerFilter] = useState<string>('all');
    const [capabilityFilters, setCapabilityFilters] = useState<string[]>([]);

    const handleClose = () => {
        setSelectedModel(null);
        setCustomName('');
        setIsSubmitting(false);
        setSearchQuery('');
        setOwnerFilter('all');
        setCapabilityFilters([]);
        onClose();
    };

    const handleSubmit = async () => {
        if (!selectedModel) return;

        setIsSubmitting(true);
        try {
            await onAddModel(selectedModel.id, customName.trim() || undefined);
            handleClose();
        } catch (error) {
            console.error('Error adding model:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getModelCapabilities = (modelId: string): ModelCapabilities => {
        const capabilities: ModelCapabilities = {};

        // GPT-4o models
        if (modelId.includes('gpt-4o')) {
            capabilities.reasoning = true;
            capabilities.vision = true;
            capabilities.image = true;
            capabilities.pdf = true;
            capabilities.functionCalling = true;
            capabilities.codeInterpreter = true;
            capabilities.fileUpload = true;
        }
        // GPT-4 Turbo models
        else if (modelId.includes('gpt-4-turbo') || modelId.includes('gpt-4-1106') || modelId.includes('gpt-4-0125')) {
            capabilities.reasoning = true;
            capabilities.vision = modelId.includes('vision');
            capabilities.image = modelId.includes('vision');
            capabilities.functionCalling = true;
            capabilities.codeInterpreter = true;
            capabilities.fileUpload = true;
        }
        // GPT-4 models
        else if (modelId.includes('gpt-4')) {
            capabilities.reasoning = true;
            capabilities.functionCalling = true;
            capabilities.codeInterpreter = true;
        }
        // GPT-3.5 Turbo models
        else if (modelId.includes('gpt-3.5-turbo')) {
            capabilities.functionCalling = true;
        }

        return capabilities;
    };

    const getModelPricing = (modelId: string): ModelPricing => {
        const pricing: ModelPricing = {};

        // GPT-4o models
        if (modelId === 'gpt-4o') {
            pricing.inputTokens = '$5.00';
            pricing.outputTokens = '$15.00';
            pricing.contextLength = 128000;
        }
        else if (modelId === 'gpt-4o-mini') {
            pricing.inputTokens = '$0.15';
            pricing.outputTokens = '$0.60';
            pricing.contextLength = 128000;
        }
        // GPT-4 Turbo models
        else if (modelId === 'gpt-4-turbo' || modelId === 'gpt-4-turbo-2024-04-09') {
            pricing.inputTokens = '$10.00';
            pricing.outputTokens = '$30.00';
            pricing.contextLength = 128000;
        }
        // GPT-4 models
        else if (modelId === 'gpt-4') {
            pricing.inputTokens = '$30.00';
            pricing.outputTokens = '$60.00';
            pricing.contextLength = 8192;
        }
        // GPT-3.5 Turbo models
        else if (modelId === 'gpt-3.5-turbo') {
            pricing.inputTokens = '$0.50';
            pricing.outputTokens = '$1.50';
            pricing.contextLength = 16385;
        }

        return pricing;
    };

    const getCapabilityIcon = (capability: string) => {
        switch (capability) {
            case 'reasoning': return <Brain className="h-4 w-4" />;
            case 'search': return <Search className="h-4 w-4" />;
            case 'fileUpload': return <FileUp className="h-4 w-4" />;
            case 'image': return <Image className="h-4 w-4" />;
            case 'pdf': return <FileText className="h-4 w-4" />;
            case 'vision': return <Eye className="h-4 w-4" />;
            case 'functionCalling': return <Code className="h-4 w-4" />;
            case 'codeInterpreter': return <Calculator className="h-4 w-4" />;
            default: return <Zap className="h-4 w-4" />;
        }
    };

    const getCapabilityLabel = (capability: string) => {
        switch (capability) {
            case 'reasoning': return 'Reasoning';
            case 'search': return 'Search';
            case 'fileUpload': return 'File Upload';
            case 'image': return 'Image';
            case 'pdf': return 'PDF';
            case 'vision': return 'Vision';
            case 'functionCalling': return 'Function Calling';
            case 'codeInterpreter': return 'Code Interpreter';
            default: return capability;
        }
    };

    // Get unique owners for filter dropdown
    const uniqueOwners = useMemo(() => {
        const owners = [...new Set(availableModels.map(model => model.owned_by))];
        return owners.sort();
    }, [availableModels]);

    // Get all available capabilities for filter checkboxes
    const allCapabilities = useMemo(() => {
        const capabilitySet = new Set<string>();
        availableModels.forEach(model => {
            const capabilities = getModelCapabilities(model.id);
            Object.entries(capabilities).forEach(([key, value]) => {
                if (value) capabilitySet.add(key);
            });
        });
        return Array.from(capabilitySet).sort();
    }, [availableModels]);

    // Filter and search models
    const filteredModels = useMemo(() => {
        return availableModels.filter(model => {
            // Search filter
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const matchesSearch = model.id.toLowerCase().includes(query) ||
                    model.owned_by.toLowerCase().includes(query);
                if (!matchesSearch) return false;
            }

            // Owner filter
            if (ownerFilter !== 'all' && model.owned_by !== ownerFilter) {
                return false;
            }

            // Capability filters
            if (capabilityFilters.length > 0) {
                const modelCapabilities = getModelCapabilities(model.id);
                const hasAllCapabilities = capabilityFilters.every(capability =>
                    modelCapabilities[capability as keyof ModelCapabilities]
                );
                if (!hasAllCapabilities) return false;
            }

            return true;
        });
    }, [availableModels, searchQuery, ownerFilter, capabilityFilters]);

    // Handle capability filter toggle
    const handleCapabilityFilterToggle = (capability: string) => {
        setCapabilityFilters(prev =>
            prev.includes(capability)
                ? prev.filter(c => c !== capability)
                : [...prev, capability]
        );
    };

    // Clear all filters
    const clearAllFilters = () => {
        setSearchQuery('');
        setOwnerFilter('all');
        setCapabilityFilters([]);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-[80vw] max-h-[80vh] w-[80vw] h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Add Model</DialogTitle>
                </DialogHeader>

                <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin" />
                            <span>Loading available models...</span>
                        </div>
                    ) : (
                        <>
                            {/* Search and Filters */}
                            <div className="space-y-4 border-b pb-4">
                                {/* Search Bar */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search models by name or owner..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>

                                {/* Filters Row */}
                                <div className="flex flex-wrap gap-4 items-center">
                                    {/* Owner Filter */}
                                    <div className="flex items-center gap-2">
                                        <Label className="text-sm font-medium">Owner:</Label>
                                        <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                                            <SelectTrigger className="w-40">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Owners</SelectItem>
                                                {uniqueOwners.map(owner => (
                                                    <SelectItem key={owner} value={owner}>
                                                        {owner}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Capability Filters */}
                                    <div className="flex items-center gap-2">
                                        <Label className="text-sm font-medium">Capabilities:</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {allCapabilities.map(capability => (
                                                <Button
                                                    key={capability}
                                                    variant={capabilityFilters.includes(capability) ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => handleCapabilityFilterToggle(capability)}
                                                    className="h-8 text-xs"
                                                >
                                                    {getCapabilityIcon(capability)}
                                                    {getCapabilityLabel(capability)}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Clear Filters */}
                                    {(searchQuery || ownerFilter !== 'all' || capabilityFilters.length > 0) && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={clearAllFilters}
                                            className="ml-auto"
                                        >
                                            <X className="h-4 w-4" />
                                            Clear Filters
                                        </Button>
                                    )}
                                </div>

                                {/* Results Count */}
                                <div className="text-sm text-muted-foreground">
                                    Showing {filteredModels.length} of {availableModels.length} models
                                </div>
                            </div>

                            {/* Model Selection */}
                            <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
                                <Label>Select Model</Label>
                                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                                    {filteredModels.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                            <p>No models match your current filters</p>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={clearAllFilters}
                                                className="mt-2"
                                            >
                                                Clear Filters
                                            </Button>
                                        </div>
                                    ) : (
                                        filteredModels.map((model) => {
                                            const capabilities = getModelCapabilities(model.id);
                                            const pricing = getModelPricing(model.id);
                                            const isSelected = selectedModel?.id === model.id;

                                            return (
                                                <Card
                                                    key={model.id}
                                                    className={`cursor-pointer transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                                                        }`}
                                                    onClick={() => setSelectedModel(model)}
                                                >
                                                    <CardHeader className="pb-3">
                                                        <div className="flex items-center justify-between">
                                                            <CardTitle className="text-base">{model.id}</CardTitle>
                                                            <Badge variant="outline">{model.owned_by}</Badge>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="pt-0">
                                                        {/* Capabilities */}
                                                        {Object.keys(capabilities).length > 0 && (
                                                            <div className="mb-3">
                                                                <div className="text-sm font-medium mb-2">Capabilities</div>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {Object.entries(capabilities).map(([key, value]) =>
                                                                        value && (
                                                                            <Badge key={key} variant="secondary" className="text-xs">
                                                                                {getCapabilityIcon(key)}
                                                                                <span className="ml-1">{getCapabilityLabel(key)}</span>
                                                                            </Badge>
                                                                        )
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Pricing */}
                                                        {(pricing.inputTokens || pricing.outputTokens || pricing.contextLength) && (
                                                            <div>
                                                                <div className="text-sm font-medium mb-2">Pricing & Limits</div>
                                                                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                                                    {pricing.inputTokens && (
                                                                        <span>Input: {pricing.inputTokens}/1M tokens</span>
                                                                    )}
                                                                    {pricing.outputTokens && (
                                                                        <span>Output: {pricing.outputTokens}/1M tokens</span>
                                                                    )}
                                                                    {pricing.contextLength && (
                                                                        <span>Context: {pricing.contextLength.toLocaleString()} tokens</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Custom Name */}
                            {selectedModel && (
                                <div className="space-y-2">
                                    <Label htmlFor="customName">Custom Name (Optional)</Label>
                                    <Input
                                        id="customName"
                                        placeholder="Enter a custom name for this model"
                                        value={customName}
                                        onChange={(e) => setCustomName(e.target.value)}
                                    />
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex justify-end gap-3">
                                <Button variant="outline" onClick={handleClose}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={!selectedModel || isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Adding...
                                        </>
                                    ) : (
                                        'Add Model'
                                    )}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AddModelModal;
