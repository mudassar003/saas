import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/auth/server-utils";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get initial user data server-side to prevent UI flicker
  let initialUser = null;
  try {
    initialUser = await getCurrentUser();
  } catch (error) {
    console.log('No user session found:', error);
    // This is expected for non-authenticated users
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var resolvedTheme;

                  if (theme === 'dark') {
                    resolvedTheme = 'dark';
                  } else if (theme === 'light') {
                    resolvedTheme = 'light';
                  } else {
                    // system or no preference
                    resolvedTheme = systemDark ? 'dark' : 'light';
                  }

                  document.documentElement.classList.add(resolvedTheme);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <AuthProvider initialUser={initialUser}>
            <AppShell>
              {children}
            </AppShell>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
