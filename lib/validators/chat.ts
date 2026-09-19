import { z } from 'zod'

export const createChatThreadSchema = z.object({
  listing_id: z.string().uuid(),
  company_id: z.string().uuid(),
  recycler_id: z.string().uuid(),
})

export const sendMessageSchema = z.object({
  thread_id: z.string().uuid(),
  content: z.string().min(1, 'Pesan tidak boleh kosong'),
})
