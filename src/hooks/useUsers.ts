"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "user";
export type SortBy =
  | "recent"
  | "oldest"
  | "most_orders"
  | "highest_spend"
  | "lowest_spend";

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

export interface UserFilters {
  sortBy?: SortBy;
  fromDate?: Date | null;
  toDate?: Date | null;
  minOrders?: number | null;
  maxOrders?: number | null;
  minSpend?: number | null;
  maxSpend?: number | null;
  search?: string;
}

export function useUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(50);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [filteredCount, setFilteredCount] = useState<number | null>(null);
  const [filters, setFilters] = useState<UserFilters>({
    sortBy: "recent",
    fromDate: null,
    toDate: null,
    minOrders: null,
    maxOrders: null,
    minSpend: null,
    maxSpend: null,
    search: "",
  });

  // Fetch all users from profiles and merge with emails from admin API
  const fetchUsers = useCallback(
    async (
      p: number = page,
      l: number = limit,
      appliedFilters: UserFilters = filters
    ) => {
      setLoading(true);
      setError(null);
      // 1. Fetch profiles
      // If `l === 0` the caller requests ALL users: fetch all profiles
      // (no range). Otherwise fetch the page window to avoid loading every
      // profile on large datasets.
      let profiles: any[] | null = null;
      let profilesError: any = null;
      if (l === 0) {
        const r = await supabase
          .from("profiles")
          .select("id, full_name, phone, created_at");
        profiles = r.data as any[];
        profilesError = r.error;
      } else {
        const start = (p - 1) * l;
        const end = start + l - 1;
        const r = await supabase
          .from("profiles")
          .select("id, full_name, phone, created_at")
          .range(start, end);
        profiles = r.data as any[];
        profilesError = r.error;
      }
      if (profilesError) {
        setError(profilesError.message);
        setLoading(false);
        return;
      }

      // 2. Fetch enriched users from API route (order aggregates + email + role)
      // with applied filters and sorting
      let enriched: any[] = [];
      let apiCount: number | null = null;
      let apiFilteredCount: number | null = null;
      try {
        const q = new URLSearchParams();
        // If l === 0 request all users from the admin API by omitting
        // the `limit` param. Otherwise pass page & limit as before.
        if (l !== 0) {
          q.set("page", String(p));
          q.set("limit", String(l));
        }

        // Add filter parameters
        if (appliedFilters.sortBy) {
          q.set("sort", appliedFilters.sortBy);
        }
        if (appliedFilters.fromDate) {
          q.set("from_date", appliedFilters.fromDate.toISOString());
        }
        if (appliedFilters.toDate) {
          q.set("to_date", appliedFilters.toDate.toISOString());
        }
        if (appliedFilters.search) {
          q.set("q", String(appliedFilters.search));
        }
        if (
          appliedFilters.minOrders !== null &&
          appliedFilters.minOrders !== undefined
        ) {
          q.set("min_orders", String(appliedFilters.minOrders));
        }
        if (
          appliedFilters.maxOrders !== null &&
          appliedFilters.maxOrders !== undefined
        ) {
          q.set("max_orders", String(appliedFilters.maxOrders));
        }
        if (
          appliedFilters.minSpend !== null &&
          appliedFilters.minSpend !== undefined
        ) {
          q.set("min_spend", String(appliedFilters.minSpend));
        }
        if (
          appliedFilters.maxSpend !== null &&
          appliedFilters.maxSpend !== undefined
        ) {
          q.set("max_spend", String(appliedFilters.maxSpend));
        }

        const qs = q.toString();
        const url = `/api/admin/list-users${qs ? `?${qs}` : ""}`;
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          enriched = json.users || [];
          apiCount =
            typeof json.total_count === "number" ? json.total_count : null;
          apiFilteredCount = typeof json.count === "number" ? json.count : null;
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
      setFilteredCount(apiFilteredCount ?? users.length);
      setLoading(false);
    },
    []
  );

  // Auto-fetch when the hook is used in a client component so multiple
  // components don't need to call fetchUsers manually. This keeps the UX
  // simpler: components that need users will mount the hook and get data.
  useEffect(() => {
    // Fetch current page when hook mounts or page/limit/filters change
    fetchUsers(page, limit, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, filters]);

  // Update sort filter
  const setSortBy = useCallback((sortBy: SortBy) => {
    setFilters((prev) => ({ ...prev, sortBy }));
    setPage(1); // Reset to first page when filter changes
  }, []);

  // Update date range filter
  const setDateRange = useCallback(
    (fromDate: Date | null, toDate: Date | null) => {
      setFilters((prev) => ({ ...prev, fromDate, toDate }));
      setPage(1);
    },
    []
  );

  // Update search filter
  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search }));
    setPage(1);
  }, []);

  // Update order count filter
  const setOrderCountFilter = useCallback(
    (minOrders: number | null, maxOrders: number | null) => {
      setFilters((prev) => ({ ...prev, minOrders, maxOrders }));
      setPage(1);
    },
    []
  );

  // Update spend filter
  const setSpendFilter = useCallback(
    (minSpend: number | null, maxSpend: number | null) => {
      setFilters((prev) => ({ ...prev, minSpend, maxSpend }));
      setPage(1);
    },
    []
  );

  // Reset all filters
  const resetFilters = useCallback(() => {
    setFilters({
      sortBy: "recent",
      fromDate: null,
      toDate: null,
      minOrders: null,
      maxOrders: null,
      minSpend: null,
      maxSpend: null,
    });
    setPage(1);
  }, []);

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
        await fetchUsers(page, limit, filters);
      } catch (err: any) {
        setError(err.message || "Failed to update role");
      } finally {
        setLoading(false);
      }
    },
    [fetchUsers, page, limit, filters]
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
        await fetchUsers(page, limit, filters);
      } catch (err: any) {
        setError(err.message || "Failed to delete user");
      } finally {
        setLoading(false);
      }
    },
    [fetchUsers, page, limit, filters]
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
    filteredCount,
    updateUserRole,
    deleteUser,
    filters,
    setSortBy,
    setDateRange,
    setOrderCountFilter,
    setSpendFilter,
    resetFilters,
    setSearch,
  };
}
