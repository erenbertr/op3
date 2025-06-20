import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Shared Message',
    description: 'Shared message from OP3',
};

export default function MessageLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
