import { createBrowserClient } from '@supabase/ssr';
import type { Database } from "./types";

const SUPABASE_URL = "https://bxsbnejbjoqxiywrerjm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4c2JuZWpiam9xeGl5d3JlcmptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NDkxMDYsImV4cCI6MjA3MDQyNTEwNn0.IR-cLuij3jc9Yl_9jaj77TmpOJfUiyi81JeGLnMvWow";

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
