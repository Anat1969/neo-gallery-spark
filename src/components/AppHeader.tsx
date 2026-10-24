import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useIsFetching } from "@tanstack/react-query";
import { useEditMode } from "@/contexts/EditModeContext";
import { useDock } from "@/contexts/DockContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import AnatLogo from "@/components/AnatLogo";
import QuickSearch from "@/components/QuickSearch";
import { cn } from "@/lib/utils";

export const APP_NAME = "ART-AI גלריה";
export const DEV_CHAT_URL = "https://claude.ai/code/session_01S9BWDcyE3q4wF5HXv6WniZ";

const chip = "arch-btn shrink-0";

interface MenuElement extends HTMLElement {
  items: { label: string; hint?: string; pressed?: boolean; onSelect: () => unknown }[];
  status: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "ai-menu": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { chat?: string; research?: string };
    }
  }
}

const NAV = [
  { to: "/", label: "גלריות" },
  { to: "/favorites", label: "נבחרות" },
  { to: "/search", label: "חיפוש" },
  { to: "/admin", label: "ניהול" },
];

const AppHeader = () => {
  const { isEditMode, toggleEditMode } = useEditMode();
  const { actions: dockActions } = useDock();
  const menuRef = useRef<MenuElement>(null);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const fetching = useIsFetching();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => setCompact(y > 40));

  useEffect(() => setMobileOpen(false), [location.pathname]);

  const isActive = (to: string) => (to === "/" ? location.pathname === "/" || location.pathname.startsWith("/gallery") : location.pathname.startsWith(to));

  // A&I logo button (https://appofapp-gh.vercel.app/ai-menu.js): copy link, dev chat and install come from it;
  // the edit mode switch and the actions the current page registers (useDockActions) are its items.
  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    el.items = [
      { label: isEditMode ? "סיום עריכה" : "מצב עריכה", hint: "CTRL E", pressed: isEditMode, onSelect: toggleEditMode },
      ...(isEditMode ? dockActions.map((a) => ({ label: a.label, onSelect: a.onClick })) : []),
    ];
    el.status = isEditMode ? "מצב עריכה" : "";
  }, [isEditMode, toggleEditMode, dockActions]);

  const primary = useMemo(
    () => (
      <>
        <button type="button" onClick={() => setSearchOpen(true)} className={chip} aria-label="חיפוש מהיר">
          חיפוש <span aria-hidden className="arch-num hidden 2xl:inline">CTRL K</span>
        </button>
        <button type="button" onClick={toggleTheme} className={chip} aria-label="החלפת רקע">
          {theme === "dark" ? "רקע בהיר" : "רקע כהה"}
        </button>
      </>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme],
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

            <nav className="hidden items-stretch self-stretch border-x border-border/60 lg:flex" aria-label="ניווט ראשי">
              {NAV.map((item, i) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "group relative flex items-center gap-2 border-l border-border/60 px-5 text-sm font-light transition-colors last:border-l-0",
                    isActive(item.to) ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span aria-hidden className="arch-num">{String(i + 1).padStart(2, "0")}</span>
                  <span>{item.label}</span>
                  <span className="absolute inset-x-5 bottom-0 h-px origin-right scale-x-0 bg-foreground/50 transition-transform duration-500 group-hover:scale-x-100" />
                  {isActive(item.to) && (
                    <motion.span layoutId="nav-rule" className="absolute inset-x-0 bottom-0 h-[2px] bg-foreground" transition={{ type: "spring", stiffness: 380, damping: 34 }} />
                  )}
                </Link>
              ))}
            </nav>


          </div>

          <div className="flex min-w-0 items-center gap-2">
            <div className="hidden items-center gap-2 md:flex">{primary}</div>

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button type="button" className={cn(chip, "lg:hidden")} aria-label="תפריט">תפריט</button>
              </SheetTrigger>
              <SheetContent side="right" className="border-border bg-card" dir="rtl">
                <SheetTitle className="font-mono text-xs font-normal text-muted-foreground">תפריט</SheetTitle>
                <SheetDescription className="sr-only">ניווט ופעולות</SheetDescription>
                <nav className="mt-6 flex flex-col">
                  {NAV.map((item) => (
                    <SheetClose asChild key={item.to}>
                      <Link
                        to={item.to}
                        className={cn(
                          "flex items-baseline gap-3 border-b border-border/60 px-1 py-4 text-2xl font-extralight text-muted-foreground hover:text-foreground",
                          isActive(item.to) && "text-foreground",
                        )}
                      >
                        <span aria-hidden className="arch-num">{String(NAV.indexOf(item) + 1).padStart(2, "0")}</span>
                        {item.label}
                      </Link>
                    </SheetClose>
                  ))}
                  <div className="mt-6 flex flex-wrap gap-2 md:hidden">{primary}</div>
                </nav>
              </SheetContent>
            </Sheet>
            <ai-menu ref={menuRef} chat={DEV_CHAT_URL} />
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
