import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Brain, Search, FileUp, Image, FileText, Eye, Code, Calculator, Zap } from 'lucide-react';
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

    const handleClose = () => {
        setSelectedModel(null);
        setCustomName('');
        setIsSubmitting(false);
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

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add Model</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin mr-2" />
                            <span>Loading available models...</span>
                        </div>
                    ) : (
                        <>
                            {/* Model Selection */}
                            <div className="space-y-4">
                                <Label>Select Model</Label>
                                <div className="grid gap-3 max-h-64 overflow-y-auto">
                                    {availableModels.map((model) => {
                                        const capabilities = getModelCapabilities(model.id);
                                        const pricing = getModelPricing(model.id);
                                        const isSelected = selectedModel?.id === model.id;

                                        return (
                                            <Card 
                                                key={model.id} 
                                                className={`cursor-pointer transition-colors ${
                                                    isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
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
                                    })}
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
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
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
