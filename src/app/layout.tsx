import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import { Nav } from "@/components/Nav";
import "./globals.css";

const sans = Inter({ variable: "--font-sans-face", subsets: ["latin"] });
const serif = Fraunces({ variable: "--font-serif-face", subsets: ["latin"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "Aangan Call Desk",
  description: "Every enquiry answered, qualified and handed to a designer, day or night.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Nav />
        <main className="mx-auto w-full max-w-[1200px] px-4 pb-16 pt-6 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
