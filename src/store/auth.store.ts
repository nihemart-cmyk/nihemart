import { create } from "zustand";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "user" | "rider";

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
   initialize: () => Promise<void>;
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
      try {
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
      } catch (error) {
         console.error("Error fetching roles:", error);
         set({ roles: new Set() });
      }
   },
   signIn: async (email, password) => {
      try {
         const { error, data } = await supabase.auth.signInWithPassword({
            email,
            password,
         });

         if (error) {
            return { error: error.message };
         }

         if (data.user) {
            await get().fetchRoles(data.user.id);
            set({
               user: data.user,
               session: data.session,
            });
         }

         return { error: null };
      } catch (error) {
         return { error: "An unexpected error occurred" };
      }
   },
   signUp: async (fullName, email, password, phone) => {
      try {
         const redirectUrl =
            typeof window !== "undefined"
               ? `${window.location.origin}/signin`
               : "/signin";
         const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
               emailRedirectTo: redirectUrl,
               data: { full_name: fullName, phone },
            },
         });
         return { error: error?.message ?? null };
      } catch (error) {
         return { error: "An unexpected error occurred" };
      }
   },
   signOut: async () => {
      try {
         await supabase.auth.signOut();
         set({ user: null, session: null, roles: new Set() });
         // Clear any auth-related local storage
         localStorage.removeItem("sb-auth-token");
         // Redirect to home page
         window.location.href = "/";
      } catch (error) {
         console.error("Error signing out:", error);
         throw error;
      }
   },
   hasRole: (role) => get().roles.has(role),
   initialize: async () => {
      try {
         set({ loading: true });

         // Get current session
         const {
            data: { session },
         } = await supabase.auth.getSession();

         if (session?.user) {
            set({ user: session.user, session });
            await get().fetchRoles(session.user.id);
         } else {
            set({ user: null, session: null, roles: new Set() });
         }

         set({ loading: false });
      } catch (error) {
         console.error("Error initializing auth:", error);
         set({ loading: false });
      }
   },
}));
