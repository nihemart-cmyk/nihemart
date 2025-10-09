import { createBrowserClient } from '@supabase/ssr';
import type { Database } from "./types";

const SUPABASE_URL = "https://rdyuozpgscgvbemnqpme.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkeXVvenBnc2NndmJlbW5xcG1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NzAwODYsImV4cCI6MjA3NTU0NjA4Nn0.OJ0bZLAJdMuUVjukOkufYGwu_iUbFomMVTlJ_zZNVDg";

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
