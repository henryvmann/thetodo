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
        {/* Top racing stripe */}
        <div className="stripe-bar" />

        {/* Nav — silver metallic with orange logo */}
        <nav className="bg-[#2a2d35] text-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 flex items-center h-12">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center shadow-sm">
                <span className="text-white font-black text-sm tracking-tight">T</span>
              </div>
              <span className="font-bold text-base tracking-tight text-gray-100">
                The<span className="text-orange-500">ToDo</span>
              </span>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-4 bg-orange-500 rounded-sm" />
              <div className="w-1.5 h-4 bg-orange-500 rounded-sm" />
            </div>
          </div>
        </nav>

        {/* Main content with subtle racing stripe watermark */}
        <main className="flex-1 racing-stripe-bg">
          <div className="relative z-10">{children}</div>
        </main>

        {/* Bottom racing stripe */}
        <div className="stripe-bar" />
      </body>
    </html>
  );
}
