import { AnimatePresence, motion } from "framer-motion";
import { useEditMode } from "@/contexts/EditModeContext";
import { useDock } from "@/contexts/DockContext";
import { cn } from "@/lib/utils";

/**
 * Every editing control lives here: the mode switch plus the actions the current page offers
 * (upload, new gallery, new room...). Per-work actions sit in each work's single "פעולות" menu.
 */
const EditDock = () => {
  const { isEditMode, toggleEditMode } = useEditMode();
  const { actions } = useDock();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-border/70 bg-card/85 p-1.5 shadow-deep backdrop-blur-xl"
      dir="rtl"
      role="toolbar"
      aria-label="פס עריכה"
    >
      <button
        type="button"
        onClick={toggleEditMode}
        aria-pressed={isEditMode}
        className={cn(
          "h-10 min-h-0 shrink-0 rounded-full px-5 text-sm transition-colors",
          isEditMode ? "bg-foreground text-background" : "text-foreground hover:bg-secondary",
        )}
      >
        {isEditMode ? "סיום עריכה" : "עריכה"}
      </button>
      <AnimatePresence initial={false}>
        {isEditMode &&
          actions.map((a, i) => (
            <motion.button
              key={a.id}
              type="button"
              onClick={a.onClick}
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto", transition: { delay: i * 0.04 } }}
              exit={{ opacity: 0, width: 0 }}
              className={cn(
                "h-10 min-h-0 shrink-0 overflow-hidden whitespace-nowrap rounded-full px-4 text-sm",
                a.primary ? "border border-foreground/50 text-foreground hover:bg-secondary" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {a.label}
            </motion.button>
          ))}
      </AnimatePresence>
    </motion.div>
    </div>
  );
};

export default EditDock;
