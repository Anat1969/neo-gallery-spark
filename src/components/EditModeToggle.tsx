import { motion, AnimatePresence } from "framer-motion";
import { useEditMode } from "@/contexts/EditModeContext";
import { useAuth } from "@/contexts/AuthContext";

/** Floating edit bar, admin only. */
const EditModeToggle = () => {
  const { isEditMode, toggleEditMode } = useEditMode();
  const { isAdmin } = useAuth();

  return (
    <AnimatePresence>
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          className="fixed bottom-6 left-6 z-50 flex items-center gap-3 rounded-full border border-border/70 bg-card/90 py-1.5 pe-1.5 ps-4 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)] backdrop-blur"
          dir="rtl"
        >
          <span className="font-mono text-[11px] text-muted-foreground">{isEditMode ? "מצב עריכה" : "מצב תצוגה"}</span>
          <button
            type="button"
            onClick={toggleEditMode}
            className={`h-9 min-h-0 rounded-full px-4 text-sm transition-colors ${
              isEditMode ? "bg-foreground text-background" : "border border-foreground/40 text-foreground hover:bg-secondary"
            }`}
          >
            {isEditMode ? "סיום עריכה" : "עריכה"}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EditModeToggle;
