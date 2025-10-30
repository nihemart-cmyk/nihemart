import type { NextRequest } from "next/server";
import { buildAuthEmail } from "@/lib/email/templates";
import { sendAuthEmail } from "@/lib/email/send";

// This route handles sending auth-related emails using Supabase admin-generated
// action links and Nodemailer via SMTP. It expects a POST JSON body:
// { email: string, type: 'recovery' | 'signup' }

export async function POST(req: NextRequest) {
   try {
      const body = await req.json();
      const { email, type } = body as { email?: string; type?: string };

      if (!email || !type) {
         return new Response(
            JSON.stringify({ error: "Missing email or type" }),
            {
               status: 400,
               headers: { "Content-Type": "application/json" },
            }
         );
      }

      if (!["recovery", "signup"].includes(type)) {
         return new Response(JSON.stringify({ error: "Unsupported type" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
         });
      }

      const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!SUPABASE_URL || !SERVICE_KEY) {
         return new Response(
            JSON.stringify({ error: "Missing Supabase server env vars" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
         );
      }

      // Determine redirect targets
      const origin =
         process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "";
      const redirectTo =
         type === "recovery" ? `${origin}/reset-password` : `${origin}/signin`;

      // Call Supabase admin generate_link endpoint to create an action link
      let effectiveType: "recovery" | "signup" =
         (type as "recovery" | "signup") || "signup";

      let genRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
         method: "POST",
         headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_KEY}`,
            apikey: SERVICE_KEY,
         },
         body: JSON.stringify({
            type: effectiveType === "recovery" ? "recovery" : "signup",
            email,
            redirect_to: redirectTo,
         }),
      });

      if (!genRes.ok) {
         // Try fallback: if signup returns email_exists, send recovery instead
         let fallbackTried = false;
         let errBody: any = null;
         try {
            errBody = await genRes.json();
         } catch {}

         if (
            effectiveType === "signup" &&
            (genRes.status === 422 || genRes.status === 409) &&
            (errBody?.error_code === "email_exists" ||
               errBody?.msg?.includes("already"))
         ) {
            // Switch to recovery link so user can set password
            effectiveType = "recovery";
            genRes = await fetch(
               `${SUPABASE_URL}/auth/v1/admin/generate_link`,
               {
                  method: "POST",
                  headers: {
                     "Content-Type": "application/json",
                     Authorization: `Bearer ${SERVICE_KEY}`,
                     apikey: SERVICE_KEY,
                  },
                  body: JSON.stringify({
                     type: "recovery",
                     email,
                     redirect_to: `${origin}/reset-password`,
                  }),
               }
            );
            fallbackTried = true;
         }

         if (!genRes.ok) {
            const text = errBody
               ? JSON.stringify(errBody)
               : await genRes.text().catch(() => "");
            console.error("Failed to generate link from Supabase:", text);

            // If we tried fallback and still failed, return a softer error to UI
            if (fallbackTried) {
               return new Response(
                  JSON.stringify({
                     ok: false,
                     error: "Could not generate recovery link",
                     details: errBody || text,
                  }),
                  {
                     status: 400,
                     headers: { "Content-Type": "application/json" },
                  }
               );
            }

            return new Response(
               JSON.stringify({ error: "Failed to generate action link" }),
               { status: 502, headers: { "Content-Type": "application/json" } }
            );
         }
      }

      const genJson = await genRes.json().catch(() => ({} as any));
      // Supabase admin/generate_link returns an object with `action_link` or similar
      const actionLink =
         genJson?.action_link ||
         genJson?.link ||
         genJson?.url ||
         genJson?.data?.action_link;

      if (!actionLink) {
         console.warn("generate_link response missing action link", genJson);
      }

      // Build email and send using shared helper
      try {
         const sent = await sendAuthEmail(
            email,
            effectiveType,
            actionLink || redirectTo
         );

         if (!sent.ok) {
            return new Response(
               JSON.stringify({
                  ok: false,
                  error: sent.warning || "SMTP not configured",
               }),
               { status: 500, headers: { "Content-Type": "application/json" } }
            );
         }

         return new Response(JSON.stringify({ ok: true, info: sent.info }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
         });
      } catch (sendErr: any) {
         console.error("Failed to send email via SMTP:", sendErr);
         return new Response(
            JSON.stringify({ ok: false, error: String(sendErr) }),
            {
               status: 502,
               headers: { "Content-Type": "application/json" },
            }
         );
      }
   } catch (err: any) {
      console.error("/api/email/send error:", err);
      return new Response(
         JSON.stringify({ error: err?.message || String(err) }),
         {
            status: 500,
            headers: { "Content-Type": "application/json" },
         }
      );
   }
}
