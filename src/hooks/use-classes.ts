import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useWorkspace } from "@/stores/workspace";
import { useEffect } from "react";

type ClassItem = {
  id: string;
  name: string;
  enName: string | null;
  gradeLevel: string | null;
  academicYear: string | null;
  isSample: boolean;
};

export function useClasses() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["classes"],
    queryFn: () => apiClient.get<{ data: ClassItem[] }>("/classes"),
  });

  const { currentClassId, setCurrentClassId } = useWorkspace();

  useEffect(() => {
    if (data?.data?.length && !currentClassId) {
      setCurrentClassId(data.data[0].id);
    }
  }, [data, currentClassId, setCurrentClassId]);

  return { classes: data?.data ?? [], isLoading, error };
}

export function useCurrentClass() {
  const { classes, isLoading } = useClasses();
  const { currentClassId } = useWorkspace();
  const currentClass = classes.find((c) => c.id === currentClassId) ?? null;
  return { currentClass, classes, isLoading };
}

export function useCreateClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ClassItem>) => apiClient.post("/classes", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["classes"] }),
  });
}

export function useUpdateClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ClassItem> }) =>
      apiClient.patch(`/classes/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["classes"] }),
  });
}

export function useDeleteClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/classes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["classes"] }),
  });
}
