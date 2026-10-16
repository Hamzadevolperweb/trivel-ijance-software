import { z } from "zod";

export const customerInput = z.object({
  customerId: z.string().uuid().optional().or(z.literal("")),
  name: z.string().trim().min(2, "Enter a customer name.").max(120),
  phone: z.string().trim().min(6, "Enter a valid phone number.").max(30),
  email: z.union([z.string().trim().email("Enter a valid email address.").max(254), z.literal("")]),
  nationality: z.string().trim().max(80),
  address: z.string().trim().max(500),
  emergencyContact: z.string().trim().max(200),
  notes: z.string().trim().max(2000),
});

export type CustomerInput = z.infer<typeof customerInput>;
