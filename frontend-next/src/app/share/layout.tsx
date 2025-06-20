import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Shared Chat',
    description: 'Shared conversation from OP3',
};

export default function ShareLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
