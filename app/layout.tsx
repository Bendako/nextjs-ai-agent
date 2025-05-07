import type { Metadata } from "next";
import "./globals.css";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { ClerkProvider } from "@clerk/nextjs";

const sans = GeistSans;
const mono = GeistMono;

export const metadata: Metadata = {
  title: "AI Chat App",
  description: "A modern chat application built with Next.js and Convex",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="antialiased">
        <ClerkProvider>
          <ConvexClientProvider>
            {children}
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
