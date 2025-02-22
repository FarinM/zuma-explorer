import './scss/theme-dark.scss';

import { ClusterModal } from '@components/ClusterModal';
import { ClusterStatusBanner } from '@components/ClusterStatusButton';
import { MessageBanner } from '@components/MessageBanner';
import { Navbar } from '@components/Navbar';
import { SearchBar } from '@components/SearchBar';
import { ClusterProvider } from '@providers/cluster';
import { ScrollAnchorProvider } from '@providers/scroll-anchor';
import { Nunito } from 'next/font/google';
import { Metadata } from 'next/types';

export const metadata: Metadata = {
    description: 'Inspect transactions, accounts, blocks, and more on the Zuma SVM blockchain',
    manifest: '/manifest.json',
    title: 'Explorer  | Zuma',
    viewport: {
        initialScale: 1,
        maximumScale: 1,
        width: 'device-width',
    },
};

const font = Nunito({
    display: 'swap',
    subsets: ['latin'],
    variable: '--explorer-default-font',
    weight: ['300', '400', '700'],
});

export default function RootLayout({
    analytics,
    children,
}: {
    analytics?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className={`${font.variable}`}>
            <body>
                <ScrollAnchorProvider>
                    <ClusterProvider>
                        <ClusterModal />
                        <div className="main-content pb-4">
                            <Navbar />
                            <MessageBanner />
                            <ClusterStatusBanner />
                            <SearchBar />
                            {children}
                        </div>
                    </ClusterProvider>
                </ScrollAnchorProvider>
                {analytics}
            </body>
        </html>
    );
}
