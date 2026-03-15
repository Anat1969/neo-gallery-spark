import { useEditMode } from "@/contexts/EditModeContext";
import { useAuth } from "@/contexts/AuthContext";
import { Pencil, Eye } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

const EditModeToggle = () => {
  const { isEditMode, toggleEditMode } = useEditMode();
  const { isAdmin } = useAuth();

  if (!isAdmin) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={toggleEditMode}
          className={`fixed bottom-8 left-8 z-50 flex h-12 w-[120px] items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            isEditMode
              ? "bg-primary text-primary-foreground shadow-[0_0_20px_hsl(76_90%_61%/0.3)]"
              : "border border-primary bg-transparent text-primary hover:bg-primary/10"
          }`}
        >
          {isEditMode ? (
            <>
              <Eye className="h-4 w-4" />
              תצוגה
            </>
          ) : (
            <>
              <Pencil className="h-4 w-4" />
              עריכה
            </>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">
        {isEditMode ? "עברי למצב תצוגה" : "עברי למצב עריכה"}
      </TooltipContent>
    </Tooltip>
  );
};

export default EditModeToggle;
