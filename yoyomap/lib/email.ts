import 'server-only';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendEmail({ to, subject, react, from = 'noreply@dmvthrowers.club' }: { to: string, subject: string, react: React.ReactElement, from?: string }) {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY missing');
  return resend.emails.send({ to, subject, react, from });
}
