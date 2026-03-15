import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogIn, Heart, Settings, LogOut } from "lucide-react";

const AppHeader = () => {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const initials = (profile?.display_name ?? profile?.email ?? "U")
    .slice(0, 2)
    .toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between bg-background/80 px-4 py-3 backdrop-blur-sm md:px-8" dir="rtl">
      <button onClick={() => navigate("/")} className="text-lg font-bold text-foreground">
        ART-AI
      </button>

      {!user ? (
        <Button variant="outline" onClick={() => navigate("/login")} className="gap-2 border-primary text-primary hover:bg-primary/10">
          <LogIn className="h-4 w-4" />
          כניסה / הרשמה
        </Button>
      ) : (
        <DropdownMenu dir="rtl">
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-secondary">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium text-foreground md:inline">
                {profile?.display_name ?? profile?.email}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate("/favorites")} className="gap-2 cursor-pointer">
              <Heart className="h-4 w-4" />
              המועדפים שלי
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem onClick={() => navigate("/admin")} className="gap-2 cursor-pointer">
                <Settings className="h-4 w-4" />
                ניהול
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="gap-2 cursor-pointer text-destructive">
              <LogOut className="h-4 w-4" />
              התנתקי
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  );
};

export default AppHeader;
