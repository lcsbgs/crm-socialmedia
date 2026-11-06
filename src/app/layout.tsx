import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { Toaster } from "@/components/ui/toast";
import { brand } from "@/config/brand";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["500", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: brand.name, template: `%s · ${brand.name}` },
  description: brand.description,
  applicationName: brand.name,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F4F5F7",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${figtree.variable} ${bricolage.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col overflow-x-hidden font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
