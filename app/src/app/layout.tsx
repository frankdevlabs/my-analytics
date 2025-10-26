import type { Metadata } from "next";
import { Ubuntu, Raleway } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/auth/session-provider";
import { ThemeProvider } from "@/components/theme";

// Configure Ubuntu font for headings
const ubuntu = Ubuntu({
  variable: "--font-ubuntu",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap", // Prevent render blocking
});

// Configure Raleway font for body text
const raleway = Raleway({
  variable: "--font-raleway",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap", // Prevent render blocking
});

export const metadata: Metadata = {
  title: "My Analytics",
  description: "Personal analytics dashboard with authentication",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to Google Fonts for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        className={`${ubuntu.variable} ${raleway.variable} antialiased`}
      >
        <ThemeProvider>
          <SessionProvider>
            {children}
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
