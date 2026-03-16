import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, X, Upload } from "lucide-react";

interface ArtworkFormData {
  id?: string;
  gallery_id: string;
  title: string;
  topic: string;
  post: string;
  image_url: string;
  tags: string[];
  style: string;
  concept: string;
  year: number;
  inspiration_url: string;
}

interface ArtworkFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  galleryId: string;
  artwork?: ArtworkFormData | null;
  onSaved: () => void;
}

const EMPTY_FORM: Omit<ArtworkFormData, "gallery_id"> = {
  title: "",
  topic: "",
  post: "",
  image_url: "",
  tags: [],
  style: "",
  concept: "",
  year: new Date().getFullYear(),
  inspiration_url: "",
};

const ArtworkFormDialog = ({
  open,
  onOpenChange,
  galleryId,
  artwork,
  onSaved,
}: ArtworkFormDialogProps) => {
  const { toast } = useToast();
  const [form, setForm] = useState<Omit<ArtworkFormData, "gallery_id">>(EMPTY_FORM);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isEditing = !!artwork?.id;

  useEffect(() => {
    if (open) {
      if (artwork) {
        setForm({
          title: artwork.title,
          topic: artwork.topic,
          post: artwork.post,
          image_url: artwork.image_url,
          tags: [...artwork.tags],
          style: artwork.style,
          concept: artwork.concept,
          year: artwork.year,
          inspiration_url: artwork.inspiration_url,
        });
      } else {
        setForm({ ...EMPTY_FORM });
      }
      setTagInput("");
    }
  }, [open, artwork]);

  const set = (key: string, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) {
      set("tags", [...form.tags, t]);
    }
    setTagInput("");
  };

  const removeTag = (tag: string) =>
    set("tags", form.tags.filter((t) => t !== tag));

  const handleUpload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${galleryId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("artwork-images")
      .upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "שגיאה בהעלאת תמונה", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("artwork-images").getPublicUrl(path);
    set("image_url", urlData.publicUrl);
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: "שגיאה", description: "שם היצירה הוא שדה חובה", variant: "destructive" });
      return;
    }
    setSaving(true);

    const payload = {
      gallery_id: galleryId,
      title: form.title,
      topic: form.topic,
      post: form.post,
      image_url: form.image_url,
      tags: form.tags,
      style: form.style,
      concept: form.concept,
      year: form.year,
      inspiration_url: form.inspiration_url,
    };

    if (isEditing && artwork?.id) {
      const { error } = await supabase
        .from("artworks")
        .update(payload)
        .eq("id", artwork.id);
      if (error) {
        toast({ title: "שגיאה", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
      toast({ title: "היצירה עודכנה" });
    } else {
      // Get max sort_order
      const { data: maxRow } = await supabase
        .from("artworks")
        .select("sort_order")
        .eq("gallery_id", galleryId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .single();
      const nextOrder = (maxRow?.sort_order ?? -1) + 1;

      const { error } = await supabase
        .from("artworks")
        .insert({ ...payload, sort_order: nextOrder });
      if (error) {
        toast({ title: "שגיאה", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
      toast({ title: "היצירה נוצרה" });
    }

    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card text-foreground sm:max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "עריכת יצירה" : "יצירה חדשה"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div>
            <Label className="text-foreground">שם *</Label>
            <Input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className="mt-1 border-muted-foreground/30 bg-secondary text-foreground"
            />
          </div>

          {/* Topic */}
          <div>
            <Label className="text-foreground">נושא</Label>
            <Input
              value={form.topic}
              onChange={(e) => set("topic", e.target.value)}
              className="mt-1 border-muted-foreground/30 bg-secondary text-foreground"
            />
          </div>

          {/* Post */}
          <div>
            <Label className="text-foreground">תיאור</Label>
            <Textarea
              value={form.post}
              onChange={(e) => set("post", e.target.value)}
              rows={3}
              className="mt-1 border-muted-foreground/30 bg-secondary text-foreground"
            />
          </div>

          {/* Image */}
          <div>
            <Label className="text-foreground">תמונה</Label>
            <div className="mt-1 flex gap-2">
              <Input
                value={form.image_url}
                onChange={(e) => set("image_url", e.target.value)}
                placeholder="URL או העלאת קובץ"
                className="flex-1 border-muted-foreground/30 bg-secondary text-foreground"
                dir="ltr"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="gap-1 border-muted-foreground/30"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                  e.target.value = "";
                }}
              />
            </div>
            {form.image_url && (
              <img src={form.image_url} alt="" className="mt-2 h-32 w-full rounded-md object-cover" />
            )}
          </div>

          {/* Tags */}
          <div>
            <Label className="text-foreground">תגיות</Label>
            <div className="mt-1 flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="הוסיפי תגית"
                className="flex-1 border-muted-foreground/30 bg-secondary text-foreground"
              />
              <Button type="button" variant="outline" onClick={addTag} className="border-muted-foreground/30">
                +
              </Button>
            </div>
            {form.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {form.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full border border-primary px-2 py-0.5 text-xs text-primary"
                  >
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Style + Concept */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-foreground">סגנון</Label>
              <Input
                value={form.style}
                onChange={(e) => set("style", e.target.value)}
                className="mt-1 border-muted-foreground/30 bg-secondary text-foreground"
              />
            </div>
            <div>
              <Label className="text-foreground">קונספט</Label>
              <Input
                value={form.concept}
                onChange={(e) => set("concept", e.target.value)}
                className="mt-1 border-muted-foreground/30 bg-secondary text-foreground"
              />
            </div>
          </div>

          {/* Year */}
          <div>
            <Label className="text-foreground">שנה</Label>
            <Input
              type="number"
              value={form.year}
              onChange={(e) => set("year", parseInt(e.target.value) || new Date().getFullYear())}
              className="mt-1 w-32 border-muted-foreground/30 bg-secondary text-foreground"
              dir="ltr"
            />
          </div>

          {/* Inspiration URL */}
          <div>
            <Label className="text-foreground">קישור השראה</Label>
            <Input
              value={form.inspiration_url}
              onChange={(e) => set("inspiration_url", e.target.value)}
              className="mt-1 border-muted-foreground/30 bg-secondary text-foreground"
              dir="ltr"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            ביטול
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            {isEditing ? "עדכון" : "צור יצירה"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ArtworkFormDialog;
