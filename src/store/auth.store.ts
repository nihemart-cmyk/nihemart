import { create } from "zustand";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "user";

type AuthState = {
  user: User | null;
  session: Session | null;
  roles: Set<AppRole>;
  loading: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setRoles: (roles: Set<AppRole>) => void;
  setLoading: (loading: boolean) => void;
  fetchRoles: (userId: string) => Promise<void>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: string | null }>;
  signUp: (
    fullName: string,
    email: string,
    password: string,
    phone?: string
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  roles: new Set(),
  loading: true,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setRoles: (roles) => set({ roles }),
  setLoading: (loading) => set({ loading }),
  fetchRoles: async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (!error && data) {
      const r = new Set<AppRole>();
      data.forEach((row: any) => r.add(row.role as AppRole));
      set({ roles: r });
    } else {
      set({ roles: new Set() });
    }
  },
  signIn: async (email, password) => {
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { error: error.message };
    set({ user: data.user, session: data.session });
    if (data.user) await get().fetchRoles(data.user.id);
    return { error: null };
  },
  signUp: async (fullName, email, password, phone) => {
    const redirectUrl =
      typeof window !== "undefined" ? `${window.location.origin}/` : "/";
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName, phone },
      },
    });
    return { error: error?.message ?? null };
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, roles: new Set() });
  },
  hasRole: (role) => get().roles.has(role),
}));
