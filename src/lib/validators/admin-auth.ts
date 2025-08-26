import { z } from "zod";

export const AdminSigninSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters long.",
  }),
  rememberMe: z.boolean().optional(),
});

export type TAdminSigninSchema = z.infer<typeof AdminSigninSchema>;