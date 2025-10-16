"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "user";
export interface UserRow {
   id: string;
   email: string;
   full_name?: string;
   phone?: string;
   created_at?: string;
   role?: AppRole;
   orderCount?: number;
   totalSpend?: number;
}

export function useUsers() {
   const [users, setUsers] = useState<UserRow[]>([]);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [page, setPage] = useState<number>(1);
   const [limit, setLimit] = useState<number>(50);
   const [totalCount, setTotalCount] = useState<number | null>(null);

   // Fetch all users from profiles and merge with emails from admin API
   const fetchUsers = useCallback(async (p: number = page, l: number = limit) => {
      setLoading(true);
      setError(null);
      // 1. Fetch profiles
      // Fetch profiles for the current page range. We still fetch profiles for
      // the requested page window to avoid loading every profile on large
      // datasets. The admin API will return a paginated union of auth/profiles
      // and aggregates that we merge with the profile rows we fetched.
      const start = (p - 1) * l;
      const end = start + l - 1;
      const { data: profiles, error: profilesError } = await supabase
         .from("profiles")
         .select("id, full_name, phone, created_at")
         .range(start, end);
      if (profilesError) {
         setError(profilesError.message);
         setLoading(false);
         return;
      }
      // 2. Fetch enriched users from API route (order aggregates + email + role)
      let enriched: any[] = [];
      let apiCount: number | null = null;
      try {
         const q = new URLSearchParams();
         q.set("page", String(p));
         q.set("limit", String(l));
         const res = await fetch(`/api/admin/list-users?${q.toString()}`);
         if (res.ok) {
            const json = await res.json();
            enriched = json.users || [];
            apiCount = typeof json.count === "number" ? json.count : null;
         }
      } catch (e) {
         // ignore, fallback to profiles only
      }

      // 3. Merge by id to produce UserRow[] with aggregates.
      // Also include any users returned by the enriched API that don't have a
      // corresponding profile row (enriched-only). This ensures we show all
      // users available to the admin API.
   const profilesArr: any[] = (profiles as any[]) || [];
      const mergedById: Record<string, UserRow> = {};

      // Start with profiles
      for (const p of profilesArr) {
         mergedById[p.id] = {
            id: p.id,
            email: "",
            full_name: p.full_name,
            phone: p.phone,
            created_at: p.created_at,
            role: "user",
            orderCount: 0,
            totalSpend: 0,
         };
      }

      // Merge/enrich with API data
      for (const e of enriched) {
         if (!e || !e.id) continue;
         const existing = mergedById[e.id];
         mergedById[e.id] = {
            id: e.id,
            email: e.email || existing?.email || "",
            full_name: existing?.full_name || e.full_name || "",
            phone: existing?.phone || e.phone || "",
            created_at: existing?.created_at || e.created_at || undefined,
            role: (e.role as AppRole) || existing?.role || "user",
            orderCount: Number(e.order_count || existing?.orderCount || 0),
            totalSpend: Number(e.total_spend || existing?.totalSpend || 0),
         };
      }

      const users: UserRow[] = Object.values(mergedById);
      setUsers(users);
      setTotalCount(apiCount ?? users.length);
      setLoading(false);
   }, []);

   // Auto-fetch when the hook is used in a client component so multiple
   // components don't need to call fetchUsers manually. This keeps the UX
   // simpler: components that need users will mount the hook and get data.
   useEffect(() => {
      // Fetch current page when hook mounts or page/limit changes
      fetchUsers(page, limit);
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [page, limit]);

   // Update user role
   const updateUserRole = useCallback(
      async (userId: string, role: AppRole) => {
         setLoading(true);
         setError(null);
         try {
            const res = await fetch("/api/admin/update-user-role", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ userId, role }),
            });
            if (!res.ok) {
               const json = await res.json();
               throw new Error(json.error || "Failed to update role");
            }
            await fetchUsers();
         } catch (err: any) {
            setError(err.message || "Failed to update role");
         } finally {
            setLoading(false);
         }
      },
      [fetchUsers]
   );

   // Delete user (soft delete by disabling or hard delete)
   const deleteUser = useCallback(
      async (userId: string, hardDelete = false) => {
         setLoading(true);
         setError(null);
         try {
            const res = await fetch("/api/admin/delete-user", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ userId, hardDelete }),
            });
            if (!res.ok) {
               const json = await res.json();
               throw new Error(json.error || "Failed to delete user");
            }
            await fetchUsers();
         } catch (err: any) {
            setError(err.message || "Failed to delete user");
         } finally {
            setLoading(false);
         }
      },
      [fetchUsers]
   );

   return {
      users,
      loading,
      error,
        fetchUsers,
        page,
        limit,
        setPage,
        setLimit,
        totalCount,
      updateUserRole,
      deleteUser,
   };
}
