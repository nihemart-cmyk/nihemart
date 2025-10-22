import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

if (
   !process.env.NEXT_PUBLIC_SUPABASE_URL ||
   !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
   // do not throw during module init; handler will check
}

const supabase =
   process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createClient(
           process.env.NEXT_PUBLIC_SUPABASE_URL,
           process.env.SUPABASE_SERVICE_ROLE_KEY
        )
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

         // Kigali timezone is UTC+2 (no DST). We'll compute local Kigali time
         const now = new Date();
         // get UTC time components and apply +2 hour offset
         const utcYear = now.getUTCFullYear();
         const utcMonth = now.getUTCMonth();
         const utcDate = now.getUTCDate();
         const utcHour = now.getUTCHours();
         const utcMinute = now.getUTCMinutes();
         // Kigali offset +2
         const kigaliDate = new Date(
            Date.UTC(utcYear, utcMonth, utcDate, utcHour + 2, utcMinute)
         );
         const kHour = kigaliDate.getHours();
         const kMinute = kigaliDate.getMinutes();

         // Off-hours: 21:30 (21.5) to 09:00 (next day)
         const minuteOfDay = kHour * 60 + kMinute;
         const offStart = 21 * 60 + 30; // 1290
         const offEnd = 9 * 60; // 540

         const scheduleDisabled =
            minuteOfDay >= offStart || minuteOfDay < offEnd;

         // Determine next toggle moment (in server time). Compute next local time when schedule flips.
         let nextToggleLocal: Date;
         if (scheduleDisabled) {
            // next toggle is at 09:00 local (next day if currently after midnight)
            // construct local date for next 09:00
            nextToggleLocal = new Date(kigaliDate);
            // advance to 9:00 next day if past 9:00
            nextToggleLocal.setDate(
               nextToggleLocal.getDate() + (minuteOfDay < offEnd ? 0 : 1)
            );
            nextToggleLocal.setHours(9, 0, 0, 0);
         } else {
            // next toggle is today at 21:30 local
            nextToggleLocal = new Date(kigaliDate);
            nextToggleLocal.setHours(21, 30, 0, 0);
            // if that's already passed (shouldn't be), move to next day
            if (minuteOfDay >= offStart) {
               nextToggleLocal.setDate(nextToggleLocal.getDate() + 1);
            }
         }

         // Convert nextToggleLocal (which is Kigali local) back to UTC-based instant
         // We built nextToggleLocal using kigaliDate as base (which is UTC-based Date representing local time),
         // so nextToggleLocal currently represents the correct instant already.

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
            nextToggleAt: nextToggleLocal.toISOString(),
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
