import 'server-only'
import { Resend } from 'resend'
export const resend = new Resend(process.env.RESEND_API_KEY!)
export async function sendTransactionalEmail({ to, subject, react, from }) { ... }