import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nala Chatbot — Terminal Belajar AI untuk Siswa SMP Budi Mulia Karawang",
  description:
    "Nala Chatbot membantu siswa SMP Budi Mulia Karawang belajar kecerdasan buatan (AI) dengan bahasa Indonesia yang mudah dan seru, dalam tampilan terminal bergaya retro CRT.",
  keywords: ["Nala", "chatbot", "belajar AI", "siswa SMP", "Budi Mulia Karawang", "kecerdasan buatan", "terminal", "edukasi"],
  authors: [{ name: "Nala Chatbot" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Nala Chatbot — Terminal Belajar AI",
    description: "Belajar AI bareng Nala, teman cerdas siswa SMP",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
