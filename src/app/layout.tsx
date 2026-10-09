import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque/standard.css";
import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "@fontsource-variable/lexend";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/shell/app-shell";
import { SETTINGS_KEY } from "@/lib/settings-key";
import en from "@/i18n/en";

export const metadata: Metadata = {
  title: { default: "Rumbo", template: "%s | Rumbo" },
  description: en.meta.description,
  applicationName: "Rumbo",
  appleWebApp: { capable: true, title: "Rumbo", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f6f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1614" },
  ],
  width: "device-width",
  initialScale: 1,
};

// Runs before first paint so saved theme, text size, font, and language apply
// without a flash. Must stay in sync with parseSettings in lib/settings.ts.
const prePaint = `(function(){try{
var d=document.documentElement,s={};
try{s=JSON.parse(localStorage.getItem(${JSON.stringify(SETTINGS_KEY)})||"{}")||{}}catch(e){}
var t=s.theme;if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}
d.setAttribute("data-theme",t);
if(s.largeText)d.setAttribute("data-text","large");
if(s.dyslexiaFont)d.setAttribute("data-font","dyslexia");
if(s.reduceMotion)d.setAttribute("data-motion","reduce");
if(typeof s.locale==="string"&&s.locale!=="en"){d.lang=s.locale;d.setAttribute("data-pending","");
setTimeout(function(){d.removeAttribute("data-pending")},1500)}
}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: prePaint }} />
      </head>
      <body className="min-h-dvh antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
