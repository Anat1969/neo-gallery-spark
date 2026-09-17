import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Category {
  id: string;
  name: string;
  sort_order: number;
  project_name: string;
  app_name: string;
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, sort_order, project_name, app_name")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });
}
