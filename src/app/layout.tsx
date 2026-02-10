import { Inter } from 'next/font/google';
import { Metadata, Viewport } from 'next';
import './globals.css';
import { ServerActionErrorBoundary } from '../components/ServerActionErrorBoundary';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 0.75,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://trackademy.kz'),
  title: {
    default: 'Trackademy - Система управления учебными центрами',
    template: '%s | Trackademy'
  },
  description: 'Trackademy (Тракадеми) - современная система управления учебными центрами. Автоматизация учета студентов, расписания, платежей, аналитика. CRM для образовательных центров в Казахстане.',
  keywords: [
    'trackademy', 'тракадеми', 'система управления учебными центрами', 
    'crm для образования', 'автоматизация учебного центра',
    'учет студентов', 'расписание занятий', 'платежи студентов',
    'аналитика образования', 'управление курсами', 'казахстан',
    'астана', 'алматы', 'образовательная платформа',
    'система для школ', 'crm образование', 'учебный менеджмент'
  ],
  authors: [{ name: 'Trackademy Team' }],
  creator: 'Trackademy',
  publisher: 'Trackademy',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: 'https://trackademy.kz',
    siteName: 'Trackademy',
    title: 'Trackademy - Система управления учебными центрами',
    description: 'Современная система управления учебными центрами. Автоматизация всех процессов: учет студентов, расписание, платежи, аналитика.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Trackademy - Система управления учебными центрами',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Trackademy - Система управления учебными центрами',
    description: 'Современная система управления учебными центрами. Автоматизация всех процессов образовательного центра.',
    images: ['/og-image.jpg'],
  },
  alternates: {
    canonical: 'https://trackademy.kz',
    languages: {
      'ru-RU': 'https://trackademy.kz',
      'ru-KZ': 'https://trackademy.kz/kz',
    },
  },
  category: 'technology',
  classification: 'Education Management System',
};
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { ToastProvider } from '../contexts/ToastContext';
import LayoutContent from '../components/LayoutContent';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <meta name="google-site-verification" content="your-google-verification-code" />
        <meta name="yandex-verification" content="your-yandex-verification-code" />
        <link rel="canonical" href="https://trackademy.kz" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Trackademy",
              "applicationCategory": "Education",
              "description": "Система управления учебными центрами",
              "operatingSystem": "Web",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "KZT"
              },
              "provider": {
                "@type": "Organization",
                "name": "Trackademy",
                "url": "https://trackademy.kz"
              }
            })
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ServerActionErrorBoundary>
          <ThemeProvider>
            <AuthProvider>
              <ToastProvider>
                <LayoutContent>{children}</LayoutContent>
              </ToastProvider>
            </AuthProvider>
          </ThemeProvider>
        </ServerActionErrorBoundary>
      </body>
    </html>
  );
}
