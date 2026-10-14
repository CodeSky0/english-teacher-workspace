import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

type ApiResponse<T> = { data: T };

export function createResourceHooks<T>(resource: string) {
  const listKey = [resource];

  function useList(classId?: string) {
    return useQuery<ApiResponse<T[]>>({
      queryKey: classId ? [...listKey, classId] : listKey,
      queryFn: () => apiClient.get<ApiResponse<T[]>>(`/${resource}${classId ? `?classId=${classId}` : ""}`),
    });
  }

  function useCreate() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (data: Partial<T>) => apiClient.post<ApiResponse<T>>(`/${resource}`, data),
      onSuccess: () => qc.invalidateQueries({ queryKey: listKey }),
    });
  }

  function useUpdate() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: ({ id, data }: { id: string; data: Partial<T> }) =>
        apiClient.patch<ApiResponse<T>>(`/${resource}/${id}`, data),
      onSuccess: () => qc.invalidateQueries({ queryKey: listKey }),
    });
  }

  function useDelete() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (id: string) => apiClient.delete<ApiResponse<T>>(`/${resource}/${id}`),
      onSuccess: () => qc.invalidateQueries({ queryKey: listKey }),
    });
  }

  return { useList, useCreate, useUpdate, useDelete };
}
