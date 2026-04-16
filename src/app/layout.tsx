import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "TheToDo",
  description: "Top-of-the-line customer project tracker",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-geist)]">
        {/* Racecar stripe */}
        <div className="stripe-bar" />

        {/* Nav */}
        <nav className="bg-gray-900 text-white">
          <div className="max-w-7xl mx-auto px-4 flex items-center h-12">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center">
                <span className="text-white font-black text-xs">T</span>
              </div>
              <span className="font-bold text-base tracking-tight">
                The<span className="text-orange-500">ToDo</span>
              </span>
            </div>
          </div>
        </nav>

        <main className="flex-1">{children}</main>

        {/* Bottom stripe */}
        <div className="stripe-bar" />
      </body>
    </html>
  );
}
