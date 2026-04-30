'use server'
import { sendTransactionalEmail } from '@/lib/resend'
await sendTransactionalEmail({ to, subject: 'Welcome', react: <WelcomeEmail /> })