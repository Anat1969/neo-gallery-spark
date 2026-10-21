import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useIsFetching } from "@tanstack/react-query";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { useTheme } from "@/contexts/ThemeContext";
import { useEditMode } from "@/contexts/EditModeContext";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import AnatLogo from "@/components/AnatLogo";
import QuickSearch from "@/components/QuickSearch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const APP_NAME = "ART-AI גלריה";
export const DEV_CHAT_URL = "https://claude.ai/code/session_01S9BWDcyE3q4wF5HXv6WniZ";

const chip =
  "inline-flex h-8 min-h-0 shrink-0 items-center rounded-full border border-border/70 bg-secondary/40 px-3 font-mono text-[11px] tracking-wide text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground";

const NAV = [
  { to: "/", label: "גלריות" },
  { to: "/favorites", label: "נבחרות" },
  { to: "/search", label: "חיפוש" },
  { to: "/admin", label: "ניהול" },
];

const AppHeader = () => {
  const { canInstall, install } = useInstallPrompt();
  const { theme, toggleTheme } = useTheme();
  const { isEditMode } = useEditMode();
  const location = useLocation();
  const fetching = useIsFetching();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => setCompact(y > 40));

  useEffect(() => setMobileOpen(false), [location.pathname]);

  const isActive = (to: string) => (to === "/" ? location.pathname === "/" || location.pathname.startsWith("/gallery") : location.pathname.startsWith(to));

  const copyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    toast.success("הקישור הועתק");
  };

  const actions = useMemo(
    () => (
      <>
        <button type="button" onClick={() => setSearchOpen(true)} className={chip} aria-label="חיפוש מהיר">
          חיפוש מהיר <span className="mr-2 hidden opacity-60 xl:inline">Ctrl K</span>
        </button>
        <button type="button" onClick={toggleTheme} className={chip} aria-label="החלפת רקע">
          {theme === "dark" ? "רקע בהיר" : "רקע כהה"}
        </button>
        <button type="button" onClick={copyLink} className={chip}>העתקת קישור</button>
        <a href={DEV_CHAT_URL} target="_blank" rel="noreferrer" className={chip}>שיחת הפיתוח</a>
        {canInstall && (
          <button type="button" onClick={install} className={cn(chip, "border-foreground/60 text-foreground")}>התקנת האפליקציה</button>
        )}
      </>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme, canInstall],
  );

  return (
    <>
      <header
        className={cn("app-header fixed inset-x-0 top-0 z-[60] border-b border-border/60", compact ? "h-14" : "h-16")}
        dir="rtl"
      >
        <div className="mx-auto grid h-full max-w-[1600px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 md:px-8">
          <div className="flex min-w-0 items-center gap-4 md:gap-8">
            <Link to="/" className="flex min-w-0 items-center gap-3" aria-label={`${APP_NAME}, דף הבית`}>
              <AnatLogo size={compact ? 26 : 30} />
              <span className="truncate text-lg font-extralight tracking-tight text-foreground md:text-xl">{APP_NAME}</span>
            </Link>

            <nav className="hidden items-center gap-1 rounded-full border border-border/50 bg-secondary/30 p-1 lg:flex">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "relative rounded-full px-4 py-1.5 text-sm transition-colors",
                    isActive(item.to) ? "text-background" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {isActive(item.to) && (
                    <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full bg-foreground" transition={{ type: "spring", stiffness: 380, damping: 32 }} />
                  )}
                  <span className="relative">{item.label}</span>
                </Link>
              ))}
            </nav>

            <AnimatePresence>
              {isEditMode && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="hidden items-center gap-2 rounded-full border border-foreground/40 px-3 py-1 font-mono text-[11px] text-foreground md:inline-flex"
                >
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground" />
                  מצב עריכה
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <div className="flex min-w-0 items-center gap-2">
            <div className="hidden items-center gap-2 md:flex">{actions}</div>

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button type="button" className={cn(chip, "lg:hidden")} aria-label="תפריט">תפריט</button>
              </SheetTrigger>
              <SheetContent side="right" className="border-border bg-card" dir="rtl">
                <SheetTitle className="font-mono text-xs font-normal text-muted-foreground">תפריט</SheetTitle>
                <SheetDescription className="sr-only">ניווט ופעולות</SheetDescription>
                <nav className="mt-6 flex flex-col gap-1">
                  {NAV.map((item) => (
                    <SheetClose asChild key={item.to}>
                      <Link
                        to={item.to}
                        className={cn(
                          "rounded-md px-3 py-3 text-lg font-light text-muted-foreground hover:bg-secondary hover:text-foreground",
                          isActive(item.to) && "bg-secondary text-foreground",
                        )}
                      >
                        {item.label}
                      </Link>
                    </SheetClose>
                  ))}
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4 md:hidden">{actions}</div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Loading line: visible whenever data is being fetched */}
        <AnimatePresence>
          {fetching > 0 && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { delay: 0.2 } }}
              className="absolute inset-x-0 -bottom-px h-px overflow-hidden"
            >
              <motion.div
                className="h-full w-1/3 bg-gradient-to-l from-transparent via-foreground to-transparent"
                animate={{ x: ["-100%", "300%"] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </header>
      <QuickSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
};

export default AppHeader;
