import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Chess Legends',
  description: 'Aplikasi Catur Edu-Kompetitif',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="font-sans antialiased text-slate-100 bg-slate-950" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
