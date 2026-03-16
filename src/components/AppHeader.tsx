import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogIn, Heart, Settings, LogOut, Menu, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const AppHeader = () => {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = (profile?.display_name ?? profile?.email ?? "U")
    .slice(0, 2)
    .toUpperCase();

  const navItems = useMemo(
    () => [
      { to: "/", label: "גלריות" },
      { to: "/search", label: "חיפוש", icon: Search },
      { to: "/favorites", label: "מועדפים", icon: Heart },
      ...(isAdmin ? [{ to: "/admin", label: "ניהול", icon: Settings }] : []),
    ],
    [isAdmin],
  );

  const isActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
    setMobileOpen(false);
  };

  return (
    <header
      className="sticky top-0 z-40 border-b border-border bg-background/90 px-4 py-3 backdrop-blur-sm md:px-8"
      dir="rtl"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 md:gap-6">
          <button
            onClick={() => navigate("/")}
            className="text-lg font-bold text-foreground"
          >
            ART-AI
          </button>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Button
                key={item.to}
                variant="ghost"
                onClick={() => navigate(item.to)}
                className={cn(
                  "h-9 px-3 text-sm text-muted-foreground hover:text-foreground",
                  isActive(item.to) && "bg-secondary text-foreground",
                )}
              >
                {item.label}
              </Button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {!user ? (
            <>
              <Button
                variant="outline"
                onClick={() => navigate("/login")}
                className="hidden gap-2 border-primary text-primary hover:bg-primary/10 md:inline-flex"
              >
                <LogIn className="h-4 w-4" />
                כניסה / הרשמה
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate("/login")}
                className="gap-2 border-primary text-primary hover:bg-primary/10 md:hidden"
              >
                <LogIn className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <DropdownMenu dir="rtl">
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-secondary">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-[180px] truncate text-sm font-medium text-foreground md:inline">
                    {profile?.display_name ?? profile?.email}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem
                  onClick={() => navigate("/favorites")}
                  className="cursor-pointer gap-2"
                >
                  <Heart className="h-4 w-4" />
                  המועדפים שלי
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem
                    onClick={() => navigate("/admin")}
                    className="cursor-pointer gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    ניהול
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer gap-2 text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  התנתקי
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="תפריט">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="border-border bg-card" dir="rtl">
              <nav className="mt-8 flex flex-col gap-2">
                {navItems.map((item) => (
                  <SheetClose asChild key={item.to}>
                    <Button
                      variant="ghost"
                      onClick={() => navigate(item.to)}
                      className={cn(
                        "justify-start text-base text-muted-foreground hover:text-foreground",
                        isActive(item.to) && "bg-secondary text-foreground",
                      )}
                    >
                      {item.label}
                    </Button>
                  </SheetClose>
                ))}

                {!user ? (
                  <SheetClose asChild>
                    <Button
                      variant="outline"
                      onClick={() => navigate("/login")}
                      className="mt-2 justify-start gap-2 border-primary text-primary hover:bg-primary/10"
                    >
                      <LogIn className="h-4 w-4" />
                      כניסה / הרשמה
                    </Button>
                  </SheetClose>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handleSignOut}
                    className="mt-2 justify-start gap-2 border-destructive text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" />
                    התנתקי
                  </Button>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
