import { createBrowserClient } from '@supabase/ssr';
import type { Database } from "./types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Only use localStorage in the browser
const isBrowser = typeof window !== "undefined";

export const supabase = createBrowserClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: isBrowser ? localStorage : undefined,
      persistSession: isBrowser,
      autoRefreshToken: isBrowser,
    },
  }
);
