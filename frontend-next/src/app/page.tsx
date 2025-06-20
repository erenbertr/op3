import { AppWrapper } from '@/components/app-wrapper';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Setup',
    description: 'OP3 Application Setup',
};

export default function Home() {
    return <AppWrapper />;
}
