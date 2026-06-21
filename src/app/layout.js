import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import DeviceGate from "@/components/DeviceGate";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "AI Admissions Coach | Practice Micro-Presentations & Personal Interviews",
  description:
    "Practice college micro-presentation and personal interview rounds with real-time AI analysis of your speech, facial expressions, and body language. Free AI-powered admissions coach for Indian undergraduate Management admissions.",
  keywords: [
    "micro presentation",
    "personal interview",
    "Management admission",
    "presentation practice",
    "AI coach",
    "speech analysis",
    "interview practice",
  ],
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <DeviceGate>{children}</DeviceGate>
      </body>
    </html>
  );
}
