import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { ThemeProvider } from "@/lib/theme";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Automation Dashboard",
  description: "Invoice and transaction management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider>
          <header className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-6">
              <nav className="flex items-center gap-4">
                <Link 
                  href="/dashboard" 
                  className="text-sm font-medium hover:text-primary transition-colors"
                >
                  Invoices
                </Link>
                <Link 
                  href="/transactions" 
                  className="text-sm font-medium hover:text-primary transition-colors"
                >
                  Transactions
                </Link>
              </nav>
            </div>
            <ThemeToggle />
          </header>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
