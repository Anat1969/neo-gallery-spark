import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import AnatLogo from "@/components/AnatLogo";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const APP_NAME = "ART-AI גלריה";
export const DEV_CHAT_URL = "https://claude.ai/code/session_01S9BWDcyE3q4wF5HXv6WniZ";

const chip =
  "inline-flex h-9 min-h-0 shrink-0 items-center rounded-md border border-border/70 bg-secondary/40 px-3 font-mono text-[12px] tracking-wide text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground";

const AppHeader = () => {
  const { user, profile, isAdmin, signOut } = useAuth();
  const { canInstall, install } = useInstallPrompt();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = useMemo(
    () => [
      { to: "/", label: "גלריות" },
      { to: "/search", label: "חיפוש" },
      { to: "/favorites", label: "מועדפים" },
      ...(isAdmin ? [{ to: "/admin", label: "ניהול" }] : []),
    ],
    [isAdmin],
  );

  const isActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

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

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
    setMobileOpen(false);
  };

  const actions = (
    <>
      <button type="button" onClick={copyLink} className={chip}>העתקת קישור</button>
      <a href={DEV_CHAT_URL} target="_blank" rel="noreferrer" className={chip}>שיחת הפיתוח</a>
      {canInstall && (
        <button type="button" onClick={install} className={cn(chip, "border-foreground/50 text-foreground")}>התקנת האפליקציה</button>
      )}
    </>
  );

  return (
    <header className="app-header fixed inset-x-0 top-0 z-[60] h-16 border-b border-border/60" dir="rtl">
      <div className="mx-auto grid h-full max-w-[1600px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 md:px-8">
        <div className="flex min-w-0 items-center gap-4 md:gap-8">
          <Link to="/" className="flex min-w-0 items-center gap-3" aria-label={`${APP_NAME}, דף הבית`}>
            <AnatLogo size={30} />
            <span className="truncate text-lg font-extralight tracking-tight text-foreground md:text-xl">{APP_NAME}</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "relative px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground",
                  isActive(item.to) && "text-foreground",
                )}
              >
                {item.label}
                {isActive(item.to) && (
                  <motion.span layoutId="nav-underline" className="absolute inset-x-2 -bottom-px h-px bg-foreground" />
                )}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <div className="hidden items-center gap-2 md:flex">{actions}</div>

          {!user ? (
            <Link to="/login" className={cn(chip, "hidden md:inline-flex")}>כניסה</Link>
          ) : (
            <button type="button" onClick={handleSignOut} className={cn(chip, "hidden md:inline-flex")} title={profile?.email ?? ""}>
              יציאה
            </button>
          )}

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button type="button" className={cn(chip, "lg:hidden")} aria-label="תפריט">תפריט</button>
            </SheetTrigger>
            <SheetContent side="right" className="border-border bg-card" dir="rtl">
              <SheetTitle className="font-mono text-xs font-normal text-muted-foreground">תפריט</SheetTitle>
              <SheetDescription className="sr-only">ניווט ופעולות</SheetDescription>
              <nav className="mt-6 flex flex-col gap-1">
                {navItems.map((item) => (
                  <SheetClose asChild key={item.to}>
                    <Link
                      to={item.to}
                      className={cn(
                        "rounded-md px-3 py-3 text-base text-muted-foreground hover:bg-secondary hover:text-foreground",
                        isActive(item.to) && "bg-secondary text-foreground",
                      )}
                    >
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}
                <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4 md:hidden">{actions}</div>
                <div className="mt-2 md:hidden">
                  {!user ? (
                    <SheetClose asChild>
                      <Link to="/login" className={chip}>כניסה</Link>
                    </SheetClose>
                  ) : (
                    <button type="button" onClick={handleSignOut} className={chip}>יציאה</button>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
