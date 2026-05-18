import { Geist_Mono, Noto_Sans, Playfair_Display } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";

const playfairDisplayHeading = Playfair_Display({subsets:['latin'],variable:'--font-heading'});
const notoSans = Noto_Sans({subsets:['latin'],variable:'--font-sans'})
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html
      lang="ja"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", notoSans.variable, playfairDisplayHeading.variable)}
    >
      <body>
        <ThemeProvider>
          {user && (
            <header className="border-b px-6 py-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">{user.email}</span>
              <LogoutButton />
            </header>
          )}
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
