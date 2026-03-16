import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Pencil } from "lucide-react";

interface InlineEditProps {
  value: string;
  onSave: (newValue: string) => Promise<void> | void;
  enabled?: boolean;
  className?: string;
  inputClassName?: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  placeholder?: string;
}

const InlineEdit = ({
  value,
  onSave,
  enabled = false,
  className = "",
  inputClassName = "",
  as: Tag = "span",
  placeholder = "ללא שם",
}: InlineEditProps) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = async () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) {
      setDraft(value);
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      setDraft(value);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        disabled={saving}
        className={`rounded border border-primary bg-background px-2 py-1 text-foreground outline-none focus:ring-2 focus:ring-primary ${inputClassName}`}
        dir="rtl"
      />
    );
  }

  return (
    <Tag
      className={`${className} ${enabled ? "cursor-pointer group/inline" : ""}`}
      onDoubleClick={() => enabled && setEditing(true)}
      title={enabled ? "לחצי פעמיים לעריכה" : undefined}
    >
      {value || placeholder}
      {enabled && (
        <Pencil
          className="mr-1.5 inline h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover/inline:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
        />
      )}
    </Tag>
  );
};

export default InlineEdit;
