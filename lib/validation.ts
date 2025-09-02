import { z } from 'zod';

export const leadSchema = z.object({
  name: z.string().optional(), // Not required
  company: z.string().min(1, 'Company is required'),
  businessType: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z
    .string()
    .regex(/^\+?[0-9\s\-]{7,20}$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export type LeadFormData = z.infer<typeof leadSchema>;

export const meetingSchema = z
  .object({
    title: z.string().min(1, 'Title is required'),
    clientId: z.string().min(1, 'Client is required'),
    meetingType: z.enum(['video', 'phone', 'in-person']),
    startDate: z.date(),
    endDate: z.date(),
    location: z.string().optional().or(z.literal('')),
    description: z.string().optional().or(z.literal('')),
    agenda: z.string().optional().or(z.literal('')),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'End time must be after start time',
    path: ['endDate'],
  });

export type MeetingFormData = z.infer<typeof meetingSchema>;

export const profileSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  company: z.string().optional(),
  job_title: z.string().optional(),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  industry: z.string().optional(),
  linkedin_url: z
    .string()
    .url('Invalid LinkedIn URL')
    .optional()
    .or(z.literal('')),
  address: z.string().optional(),
  timezone: z.string().optional(),
  email_signature: z.string().optional(),
  preferred_tone: z.enum(['professional', 'friendly', 'casual', 'formal']),
});

export type ProfileFormData = z.infer<typeof profileSchema>;
