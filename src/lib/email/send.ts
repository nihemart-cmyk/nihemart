import nodemailer from "nodemailer";
import { buildAuthEmail } from "@/lib/email/templates";

export async function sendAuthEmail(
   to: string,
   type: "recovery" | "signup",
   actionLink: string
) {
   const fromEmail = process.env.EMAIL_FROM || "nihemart@gmail.com";
   const { subject, html } = buildAuthEmail(type, actionLink, "Nihemart");

   const smtpHost = process.env.SMTP_HOST;
   const smtpPort = process.env.SMTP_PORT
      ? parseInt(process.env.SMTP_PORT, 10)
      : undefined;
   const smtpUser = process.env.SMTP_USER;
   const smtpPass = process.env.SMTP_PASS;

   if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      console.warn("SMTP env vars missing; cannot send email");
      return { ok: false, warning: "SMTP not configured" };
   }

   const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort!,
      secure: smtpPort === 465,
      auth: {
         user: smtpUser,
         pass: smtpPass,
      },
   });

   const info = await transporter.sendMail({
      from: `${fromEmail}`,
      to,
      subject,
      html,
   });

   return { ok: true, info };
}

export async function sendEmail(to: string, subject: string, html: string) {
   const fromEmail = process.env.EMAIL_FROM || "nihemart@gmail.com";

   const smtpHost = process.env.SMTP_HOST;
   const smtpPort = process.env.SMTP_PORT
      ? parseInt(process.env.SMTP_PORT, 10)
      : undefined;
   const smtpUser = process.env.SMTP_USER;
   const smtpPass = process.env.SMTP_PASS;

   if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      console.warn("SMTP env vars missing; cannot send email");
      return { ok: false, warning: "SMTP not configured" } as const;
   }

   const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort!,
      secure: smtpPort === 465,
      auth: {
         user: smtpUser,
         pass: smtpPass,
      },
   });

   const info = await transporter.sendMail({
      from: `${fromEmail}`,
      to,
      subject,
      html,
   });

   return { ok: true, info } as const;
}
