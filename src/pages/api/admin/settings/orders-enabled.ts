import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

// Ensure we prefer a server-side SUPABASE_URL but fall back to NEXT_PUBLIC_SUPABASE_URL
// so this API works in varied hosting environments (cPanel, etc.). Do not throw
// during module init; the handler will return an error if credentials are missing.
if (
   !process.env.SUPABASE_SERVICE_ROLE_KEY &&
   !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
   // no-op; handler will validate
}

const _SUPABASE_URL =
   process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabase =
   _SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createClient(_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
      : (null as any);

export default async function handler(
   req: NextApiRequest,
   res: NextApiResponse
) {
   if (!supabase) {
      return res.status(500).json({
         error: "SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL is not configured on the server.",
      });
   }

   try {
      if (req.method === "GET") {
         const { data, error } = await supabase
            .from("site_settings")
            .select("value")
            .eq("key", "orders_enabled")
            .maybeSingle();

         if (error) throw error;
         const val = data?.value;

         // some installations may store boolean directly or as jsonb true/false
         const adminHasSetting = typeof val !== "undefined" && val !== null;
         const adminEnabled = adminHasSetting
            ? val === true || String(val) === "true" || (val && val === "true")
            : null;

         // Compute Kigali local time robustly without relying on server local timezone
         // (some hosts like cPanel may not use UTC). Kigali is UTC+2 year-round.
         const KIGALI_OFFSET_HOURS = 2;
         const OFFSET_MS = KIGALI_OFFSET_HOURS * 60 * 60 * 1000;

         const nowMs = Date.now();
         const kigaliMs = nowMs + OFFSET_MS; // instant adjusted to Kigali local wall-clock
         const kigaliDate = new Date(kigaliMs);
         // Use UTC getters on the adjusted instant so we get Kigali calendar fields
         const kYear = kigaliDate.getUTCFullYear();
         const kMonth = kigaliDate.getUTCMonth();
         const kDate = kigaliDate.getUTCDate();
         const kHour = kigaliDate.getUTCHours();
         const kMinute = kigaliDate.getUTCMinutes();

         // Off-hours: 21:30 (21.5) to 09:00 (next day)
         const minuteOfDay = kHour * 60 + kMinute;
         const offStart = 21 * 60 + 30; // 1290
         const offEnd = 9 * 60; // 540

         const scheduleDisabled =
            minuteOfDay >= offStart || minuteOfDay < offEnd;

         // Compute the next toggle instant (in UTC) corresponding to the next local
         // 09:00 or 21:30 in Kigali. We construct a UTC timestamp for the Kigali local
         // clock and then subtract the offset to get the real UTC instant.
         let nextToggleAt: Date | null = null;
         if (scheduleDisabled) {
            // next local 09:00 (same day if before 09:00 local, otherwise next day)
            const addDays = minuteOfDay < offEnd ? 0 : 1;
            const nextLocalUtcMs = Date.UTC(
               kYear,
               kMonth,
               kDate + addDays,
               9,
               0,
               0,
               0
            );
            const nextToggleUtcMs = nextLocalUtcMs - OFFSET_MS; // convert local -> UTC instant
            nextToggleAt = new Date(nextToggleUtcMs);
         } else {
            // next local 21:30 (today if still before 21:30, otherwise next day)
            const addDays = minuteOfDay >= offStart ? 1 : 0;
            const nextLocalUtcMs = Date.UTC(
               kYear,
               kMonth,
               kDate + addDays,
               21,
               30,
               0,
               0
            );
            const nextToggleUtcMs = nextLocalUtcMs - OFFSET_MS;
            nextToggleAt = new Date(nextToggleUtcMs);
         }

         // Decide effective enabled flag: if admin explicitly set it, respect admin setting.
         // Otherwise use schedule default (disabled during off-hours).
         const enabled =
            adminEnabled !== null ? Boolean(adminEnabled) : !scheduleDisabled;

         // Choose message
         let message: string | null = null;
         const source: string = adminEnabled !== null ? "admin" : "schedule";
         if (!enabled) {
            if (adminEnabled === null && scheduleDisabled) {
               message =
                  "We are currently not working, please order again at 9 am";
            } else {
               message =
                  "We are currently not allowing orders, please try again later";
            }
         }

         return res.status(200).json({
            enabled: Boolean(enabled),
            adminEnabled: adminEnabled,
            scheduleDisabled: Boolean(scheduleDisabled),
            message,
            source,
            nextToggleAt: nextToggleAt ? nextToggleAt.toISOString() : null,
         });
      }

      if (req.method === "POST") {
         // Expect { enabled: boolean }
         const { enabled } = req.body || {};
         if (typeof enabled !== "boolean") {
            return res.status(400).json({ error: "enabled boolean required" });
         }

         const { error } = await supabase
            .from("site_settings")
            .upsert([{ key: "orders_enabled", value: enabled }], {
               onConflict: "key",
            });

         if (error) throw error;

         // Return explicit admin-set result and effective enabled (admin takes precedence)
         return res.status(200).json({
            enabled: Boolean(enabled),
            adminEnabled: Boolean(enabled),
            scheduleDisabled: false,
            message: enabled
               ? null
               : "We are currently not allowing orders, please try again later",
            source: "admin",
            nextToggleAt: null,
         });
      }

      res.setHeader("Allow", ["GET", "POST"]);
      res.status(405).end("Method Not Allowed");
   } catch (err: any) {
      console.error("orders-enabled handler error:", err);
      res.status(500).json({ error: err?.message || "Unknown error" });
   }
}
