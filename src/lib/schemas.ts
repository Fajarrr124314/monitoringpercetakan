import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().trim().min(1, "Nama pelanggan wajib diisi").max(120),
  address: z.string().trim().max(300).default(""),
  city: z.string().trim().max(80).default(""),
  province: z.string().trim().max(80).default(""),
  phone: z.string().trim().max(40).default(""),
});
