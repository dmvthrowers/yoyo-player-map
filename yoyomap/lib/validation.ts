import { z } from 'zod';

// =============================================================================
// Shared field schemas
// =============================================================================

// Strips ASCII control characters (null bytes, BEL, BS, etc.) while keeping
// tab (0x09), LF (0x0A), and CR (0x0D) which are harmless in text fields.
const stripControls = (s: string) => s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

const displayNameSchema = z.string().trim().transform(stripControls).pipe(z.string().min(2).max(40));

const emailSchema = z.string().trim().email().toLowerCase();


// Normalized location schemas: use foreign keys (numbers)
const cityIdSchema = z.number({ error: 'Please select a city from the list' }).int().positive();
const regionIdSchema = z.number().int().positive().optional().or(z.literal(null));
const countryIdSchema = z.number({ error: 'Please select a country' }).int().positive();

const bioSchema = z.string().trim().max(280).transform(stripControls).optional().or(z.literal(''));

const socialsSchema = z.object({
  // Instagram handles: letters, numbers, underscores, periods, 1–30 chars.
  instagram: z.string().trim().max(30)
    .regex(/^[a-zA-Z0-9._]+$/, 'Instagram handle may only contain letters, numbers, underscores, and periods (max 30 chars)')
    .optional().or(z.literal('')),
  // YouTube channel URLs must use https.
  youtube: z.string().trim().url().max(100)
    .refine((v) => v.startsWith('https://'), 'YouTube URL must start with https://')
    .optional().or(z.literal('')),
  // Discord usernames: letters, numbers, underscores, periods, hyphens, 2–32 chars.
  discord: z.string().trim().min(2).max(32)
    .regex(/^[a-zA-Z0-9._\-#]+$/, 'Discord username may only contain letters, numbers, underscores, periods, hyphens, and # (2–32 chars)')
    .optional().or(z.literal('')),
  // Website URLs must use https.
  website: z.string().trim().url().max(200)
    .refine((v) => v.startsWith('https://'), 'Website URL must start with https://')
    .optional().or(z.literal('')),
}).optional();

const consentCheckboxes = {
  consentPrivacy: z.literal(true, { error: 'You must accept the privacy policy' }),
  consentTerms: z.literal(true, { error: 'You must accept the terms of service' }),
  consentPublic: z.literal(true, { error: 'You must acknowledge that your entry will be public' }),
};

const honeypotSchema = z.string().max(0).optional();

// =============================================================================
// Person-specific schema
// =============================================================================

const personSchema = z.object({
  entityType: z.literal('person'),
  displayName: displayNameSchema,
  email: emailSchema,
  city_id: cityIdSchema,
  region_id: regionIdSchema,
  country_id: countryIdSchema,
  bio: bioSchema,
  socials: socialsSchema,
  ageBand: z.enum(['13-17', '18+']),
  // Required for under-18
  parentName: z.string().trim().transform(stripControls).pipe(z.string().max(100))
    .optional().or(z.literal('')),
  parentEmail: z.string().trim().email().toLowerCase().optional().or(z.literal('')),
  relationship: z.enum(['parent', 'legal guardian']).optional(),
  ...consentCheckboxes,
  honeypot: honeypotSchema,
});

// =============================================================================
// Shop-specific schema
// =============================================================================

const shopSchema = z.object({
  entityType: z.literal('shop'),
  displayName: displayNameSchema,
  email: emailSchema,
  city_id: cityIdSchema,
  region_id: regionIdSchema,
  country_id: countryIdSchema,
  bio: bioSchema,
  socials: socialsSchema,
  // Shop-specific fields
  addressLine: z.string().trim().min(5).max(200),
  postalCode: z.string().trim().max(20).optional().or(z.literal('')),
  hours: z.string().trim().max(500).transform(stripControls).optional().or(z.literal('')),
  contactName: z.string().trim().transform(stripControls).pipe(z.string().max(100)),
  authorizedRep: z.literal(true, { 
    error: 'You must confirm you are authorized to list this business' 
  }),
  ...consentCheckboxes,
  honeypot: honeypotSchema,
});

// =============================================================================
// Club-specific schema
// =============================================================================

const clubSchema = z.object({
  entityType: z.literal('club'),
  displayName: displayNameSchema,
  email: emailSchema,
  city_id: cityIdSchema,
  region_id: regionIdSchema,
  country_id: countryIdSchema,
  bio: bioSchema,
  socials: socialsSchema,
  // Club-specific fields
  clubMeetingInfo: z.string().trim().min(10).max(500).transform(stripControls),
  clubVenuePublic: z.boolean(),
  // Only required if venue is public
  venueAddressLine: z.string().trim().max(200).optional().or(z.literal('')),
  venuePostalCode: z.string().trim().max(20).optional().or(z.literal('')),
  contactName: z.string().trim().transform(stripControls).pipe(z.string().max(100)),
  authorizedRep: z.literal(true, { 
    error: 'You must confirm you are authorized to list this club' 
  }),
  ...consentCheckboxes,
  honeypot: honeypotSchema,
});

// =============================================================================
// Discriminated union for submit form
// =============================================================================

export const submitSchema = z.discriminatedUnion('entityType', [
  personSchema,
  shopSchema,
  clubSchema,
]).superRefine((data, ctx) => {
  if (data.entityType === 'person' && data.ageBand === '13-17') {
    if (!(data.parentName && data.parentEmail && data.relationship)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Parent/guardian information is required for users under 18',
        path: ['parentName'],
      });
    }
  }
  if (data.entityType === 'club' && data.clubVenuePublic) {
    if (!(data.venueAddressLine && data.venueAddressLine.length >= 5)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Venue address is required when venue location is public',
        path: ['venueAddressLine'],
      });
    }
  }
});

export type SubmitInput = z.infer<typeof submitSchema>;
export type PersonInput = z.infer<typeof personSchema>;
export type ShopInput = z.infer<typeof shopSchema>;
export type ClubInput = z.infer<typeof clubSchema>;

// =============================================================================
// Legacy schema for backwards compatibility (person-only, no entityType field)
// =============================================================================

export const legacySubmitSchema = z.object({
  displayName: displayNameSchema,
  email: emailSchema,
  city_id: cityIdSchema,
  region_id: regionIdSchema,
  country_id: countryIdSchema,
  bio: bioSchema,
  ageBand: z.enum(['13-17', '18+']),
  socials: socialsSchema,
  parentName: z.string().trim().transform(stripControls).pipe(z.string().max(100))
    .optional().or(z.literal('')),
  parentEmail: z.string().trim().email().toLowerCase().optional().or(z.literal('')),
  relationship: z.enum(['parent', 'legal guardian']).optional(),
  ...consentCheckboxes,
  honeypot: honeypotSchema,
}).refine(
  (data) => {
    if (data.ageBand === '13-17') {
      return !!(data.parentName && data.parentEmail && data.relationship);
    }
    return true;
  },
  { message: 'Parent/guardian information is required for users under 18', path: ['parentName'] }
);

// =============================================================================
// Report schema (updated with new reasons)
// =============================================================================

export const reportSchema = z.object({
  entryId: z.string().uuid(),
  reason: z.enum([
    'spam',
    'harassment',
    'impersonation',
    'minor_unsafe',
    'fake_business',
    'unauthorized_listing',
    'other',
  ]),
  details: z.string().trim().max(1000).optional(),
  reporterEmail: z.string().trim().email().optional().or(z.literal('')),
});

export type ReportInput = z.infer<typeof reportSchema>;

// Reasons that trigger auto-hide
export const AUTO_HIDE_REASONS = ['impersonation', 'fake_business', 'unauthorized_listing'] as const;
