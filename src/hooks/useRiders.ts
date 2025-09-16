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
      mutationFn: async ({ orderId, riderId, notes }: any) => {
         // Call server-side API so the service role validates order state
         const res = await fetch(`/api/admin/assign-order`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId, riderId, notes }),
         });
         if (!res.ok) {
            const json = await res.json().catch(() => ({}));
            // Server returns { error: { code, message } }
            const errObj = json.error;
            const message =
               (errObj && errObj.message) ||
               json.error ||
               "Failed to assign order";
            const err = new Error(message);
            // Attach server status / code for downstream handling
            (err as any).status = res.status;
            (err as any).serverError = errObj || json;
            throw err;
         }
         const json = await res.json();
         return json.assignment;
      },
      onSuccess: () => {
         qc.invalidateQueries({ queryKey: riderKeys.all });
      },
   });
}

export function useRespondToAssignment() {
   const qc = useQueryClient();
   return useMutation({
      mutationFn: async ({ assignmentId, status }: any) => {
         // Use server-side API route so the service role performs the update
         // (prevents RLS/permission issues when running from the browser).
         const res = await fetch(`/api/rider/respond-assignment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ assignmentId, status }),
         });
         if (!res.ok) {
            const json = await res.json().catch(() => ({}));
            const errObj = json.error;
            // If server returned structured error use its message
            throw new Error(
               (errObj && (errObj.message || errObj)) ||
                  json.error ||
                  "Failed to respond to assignment"
            );
         }
         const json = await res.json();
         return json.assignment;
      },
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
