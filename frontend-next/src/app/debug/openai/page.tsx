import { OpenAIDebugComponent } from '@/components/debug/openai-debug';

export default function OpenAIDebugPage() {
    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto py-8">
                <h1 className="text-3xl font-bold mb-8">OpenAI Models Debug</h1>
                <OpenAIDebugComponent />
            </div>
        </div>
    );
}
