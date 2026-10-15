import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const sans = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: { default: "Brightpaths volunteer portal", template: "%s · Brightpaths" },
  description: "Apply, pick shifts, and keep hours with Brightpaths volunteers and interns.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body>
        <a className="skip" href="#content">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
