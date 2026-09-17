import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "TNF Fantasy Football",
  description: "Private fantasy football for our weekly 7-a-side group.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <Navbar />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
          {children}
        </main>
        <footer className="border-t border-card-border py-4 text-center text-xs text-muted">
          <a href="/privacy" className="hover:underline">
            Privacy
          </a>{" "}
          ·{" "}
          <a href="/terms" className="hover:underline">
            Terms
          </a>
        </footer>
      </body>
    </html>
  );
}
