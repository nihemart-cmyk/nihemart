import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
   createRider,
   fetchRiders,
   assignOrderToRider,
   respondToAssignment,
   getAssignmentsForRider,
   type Rider,
} from "@/integrations/supabase/riders";

export const riderKeys = {
   all: ["riders"] as const,
   lists: () => [...riderKeys.all, "list"] as const,
   list: (activeOnly = false) =>
      [...riderKeys.lists(), { activeOnly }] as const,
   assignments: (riderId: string) =>
      [...riderKeys.all, "assignments", riderId] as const,
};

export function useRiders(activeOnly = false) {
   return useQuery({
      queryKey: riderKeys.list(activeOnly),
      queryFn: () => fetchRiders(activeOnly),
      staleTime: 1000 * 60 * 2,
   });
}

export function useCreateRider() {
   const qc = useQueryClient();
   return useMutation({
      mutationFn: async (payload: Partial<Rider>) => {
         // Call the server-side API so the service role creates the rider and we avoid RLS issues
         const res = await fetch("/api/admin/create-rider", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
         });
         if (!res.ok) {
            const json = await res.json().catch(() => ({}));
            throw new Error(json.error || "Failed to create rider");
         }
         const json = await res.json();
         qc.invalidateQueries({ queryKey: riderKeys.lists() });
         return json.rider;
      },
   });
}

export function useUpdateRider() {
   const qc = useQueryClient();
   return useMutation({
      mutationFn: async ({ riderId, updates }: any) => {
         const res = await fetch(
            `/api/rider/update?riderId=${encodeURIComponent(riderId)}`,
            {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ updates }),
            }
         );
         if (!res.ok) {
            const json = await res.json().catch(() => ({}));
            throw new Error(json.error || "Failed to update rider");
         }
         const json = await res.json();
         qc.invalidateQueries({ queryKey: riderKeys.lists() });
         return json.rider;
      },
   });
}

export function useAssignOrder() {
   const qc = useQueryClient();
   return useMutation({
      mutationFn: ({ orderId, riderId, notes }: any) =>
         assignOrderToRider(orderId, riderId, notes),
      onSuccess: () => {
         qc.invalidateQueries({ queryKey: riderKeys.all });
      },
   });
}

export function useRespondToAssignment() {
   const qc = useQueryClient();
   return useMutation({
      mutationFn: ({ assignmentId, status }: any) =>
         respondToAssignment(assignmentId, status),
      onSuccess: () => qc.invalidateQueries({ queryKey: riderKeys.all }),
   });
}

export function useRiderAssignments(riderId?: string) {
   return useQuery({
      queryKey: riderKeys.assignments(riderId || ""),
      queryFn: async () => {
         // If running in the browser prefer the server-side API route which uses the
         // service role to include joined order items even when RLS would block direct joins.
         if (typeof window !== "undefined") {
            const res = await fetch(
               `/api/rider/assignments?riderId=${encodeURIComponent(
                  riderId || ""
               )}`
            );
            if (!res.ok) {
               const json = await res.json().catch(() => ({}));
               throw new Error(json.error || "Failed to fetch assignments");
            }
            const json = await res.json();
            return json.assignments || [];
         }

         // On the server or when the API is not available, fall back to direct supabase call
         return getAssignmentsForRider(riderId || "");
      },
      enabled: !!riderId,
   });
}

export default useRiders;
