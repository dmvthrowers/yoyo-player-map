import { z } from 'zod';

export const submitSchema = z.object({
  displayName: z.string().trim().min(2).max(40)
    .regex(/^[a-zA-Z0-9 _\-.]+$/, 'Use letters, numbers, spaces, dashes, underscores, or dots only'),
  email: z.string().trim().email().toLowerCase(),
  city: z.string().trim().min(2).max(80),
  region: z.string().trim().max(80).optional().or(z.literal('')),
  country: z.string().trim().length(2).default('US'),
  bio: z.string().trim().max(280).optional().or(z.literal('')),
  ageBand: z.enum(['13-17', '18+']),
  socials: z.object({
    instagram: z.string().trim().max(50).optional().or(z.literal('')),
    youtube: z.string().trim().max(100).optional().or(z.literal('')),
    discord: z.string().trim().max(50).optional().or(z.literal('')),
    website: z.string().trim().url().max(200).optional().or(z.literal('')),
  }).optional(),
  // Required for under-18
  parentName: z.string().trim().max(100).optional().or(z.literal('')),
  parentEmail: z.string().trim().email().toLowerCase().optional().or(z.literal('')),
  relationship: z.enum(['parent', 'legal guardian']).optional(),
  // Consent checkboxes — all must be true
  consentPrivacy: z.literal(true, { errorMap: () => ({ message: 'You must accept the privacy policy' }) }),
  consentTerms: z.literal(true, { errorMap: () => ({ message: 'You must accept the terms of service' }) }),
  consentPublic: z.literal(true, { errorMap: () => ({ message: 'You must acknowledge that your entry will be public' }) }),
  // Anti-bot
  honeypot: z.string().max(0).optional(),  // If filled, it's a bot
}).refine(
  (data) => {
    if (data.ageBand === '13-17') {
      return !!(data.parentName && data.parentEmail && data.relationship);
    }
    return true;
  },
  { message: 'Parent/guardian information is required for users under 18', path: ['parentName'] }
);

export type SubmitInput = z.infer<typeof submitSchema>;

export const reportSchema = z.object({
  entryId: z.string().uuid(),
  reason: z.enum(['spam', 'harassment', 'impersonation', 'minor_unsafe', 'other']),
  details: z.string().trim().max(1000).optional(),
  reporterEmail: z.string().trim().email().optional().or(z.literal('')),
});
