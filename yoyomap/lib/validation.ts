import { z } from 'zod';

// =============================================================================
// Shared field schemas
// =============================================================================

const displayNameSchema = z.string().trim().min(2).max(40)
  .regex(/^[a-zA-Z0-9 _\-.]+$/, 'Use letters, numbers, spaces, dashes, underscores, or dots only');

const emailSchema = z.string().trim().email().toLowerCase();

const citySchema = z.string().trim().min(2).max(80);

const regionSchema = z.string().trim().max(80).optional().or(z.literal(''));

const countrySchema = z.string().trim().length(2).default('US');

const bioSchema = z.string().trim().max(280).optional().or(z.literal(''));

const socialsSchema = z.object({
  instagram: z.string().trim().max(50).optional().or(z.literal('')),
  youtube: z.string().trim().max(100).optional().or(z.literal('')),
  discord: z.string().trim().max(50).optional().or(z.literal('')),
  website: z.string().trim().url().max(200).optional().or(z.literal('')),
}).optional();

const consentCheckboxes = {
  consentPrivacy: z.literal(true, { errorMap: () => ({ message: 'You must accept the privacy policy' }) }),
  consentTerms: z.literal(true, { errorMap: () => ({ message: 'You must accept the terms of service' }) }),
  consentPublic: z.literal(true, { errorMap: () => ({ message: 'You must acknowledge that your entry will be public' }) }),
};

const honeypotSchema = z.string().max(0).optional();

// =============================================================================
// Person-specific schema
// =============================================================================

const personSchema = z.object({
  entityType: z.literal('person'),
  displayName: displayNameSchema,
  email: emailSchema,
  city: citySchema,
  region: regionSchema,
  country: countrySchema,
  bio: bioSchema,
  socials: socialsSchema,
  ageBand: z.enum(['13-17', '18+']),
  // Required for under-18
  parentName: z.string().trim().max(100).optional().or(z.literal('')),
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
// Shop-specific schema
// =============================================================================

const shopSchema = z.object({
  entityType: z.literal('shop'),
  displayName: displayNameSchema,
  email: emailSchema,
  city: citySchema,
  region: regionSchema,
  country: countrySchema,
  bio: bioSchema,
  socials: socialsSchema,
  // Shop-specific fields
  addressLine: z.string().trim().min(5).max(200),
  postalCode: z.string().trim().max(20).optional().or(z.literal('')),
  hours: z.string().trim().max(500).optional().or(z.literal('')),
  contactName: z.string().trim().max(100),
  authorizedRep: z.literal(true, { 
    errorMap: () => ({ message: 'You must confirm you are authorized to list this business' }) 
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
  city: citySchema,
  region: regionSchema,
  country: countrySchema,
  bio: bioSchema,
  socials: socialsSchema,
  // Club-specific fields
  clubMeetingInfo: z.string().trim().min(10).max(500),
  clubVenuePublic: z.boolean(),
  // Only required if venue is public
  venueAddressLine: z.string().trim().max(200).optional().or(z.literal('')),
  venuePostalCode: z.string().trim().max(20).optional().or(z.literal('')),
  contactName: z.string().trim().max(100),
  authorizedRep: z.literal(true, { 
    errorMap: () => ({ message: 'You must confirm you are authorized to list this club' }) 
  }),
  ...consentCheckboxes,
  honeypot: honeypotSchema,
}).refine(
  (data) => {
    if (data.clubVenuePublic) {
      return !!(data.venueAddressLine && data.venueAddressLine.length >= 5);
    }
    return true;
  },
  { message: 'Venue address is required when venue location is public', path: ['venueAddressLine'] }
);

// =============================================================================
// Discriminated union for submit form
// =============================================================================

export const submitSchema = z.discriminatedUnion('entityType', [
  personSchema,
  shopSchema,
  clubSchema,
]);

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
  city: citySchema,
  region: regionSchema,
  country: countrySchema,
  bio: bioSchema,
  ageBand: z.enum(['13-17', '18+']),
  socials: socialsSchema,
  parentName: z.string().trim().max(100).optional().or(z.literal('')),
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
