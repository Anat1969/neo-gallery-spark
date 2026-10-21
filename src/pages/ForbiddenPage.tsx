import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const ForbiddenPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background" dir="rtl">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-foreground">403</h1>
        <p className="text-muted-foreground">אין לך הרשאה לצפות בדף זה</p>
        <Button onClick={() => navigate("/")} className="gap-2">
          חזרה לגלריות
        </Button>
      </div>
    </div>
  );
};

export default ForbiddenPage;
