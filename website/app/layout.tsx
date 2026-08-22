import type { Metadata } from 'next';
import './globals.css';

const siteUrl = new URL('https://catouse.github.io/turndown-php/');

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: 'Turndown PHP — HTML to Markdown for PHP',
    template: '%s · Turndown PHP',
  },
  description:
    'A configurable HTML-to-Markdown converter for PHP 8.1+, compatible with Turndown 7.2.4 and the official GFM plugins.',
  keywords: ['PHP', 'HTML to Markdown', 'Turndown', 'CommonMark', 'GFM'],
  icons: {
    icon: [
      { url: 'favicon/favicon.svg', type: 'image/svg+xml' },
      { url: 'favicon/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: 'favicon/favicon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    shortcut: 'favicon/favicon.ico',
    apple: 'favicon/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Turndown PHP',
    title: 'Turndown PHP — HTML to Markdown for PHP',
    description:
      'A precise Turndown port for modern PHP, with configurable rules and official GFM plugins.',
    images: [
      {
        url: 'og.png',
        width: 1024,
        height: 1024,
        alt: 'Turndown PHP brand mark',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Turndown PHP — HTML to Markdown for PHP',
    description:
      'A precise Turndown port for modern PHP, with configurable rules and official GFM plugins.',
    images: ['og.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
