export type GuestBookingStep = (typeof GUEST_BOOKING_STEPS)[number];

export const GUEST_BOOKING_STEPS = ['doctor', 'slot', 'patient', 'summary', 'done'] as const;

export const STEP_TITLE_KEYS: Record<GuestBookingStep, string> = {
  doctor: 'guestBooking.steps.doctor',
  slot: 'guestBooking.steps.slot',
  patient: 'guestBooking.steps.patient',
  summary: 'guestBooking.steps.summary',
  done: 'guestBooking.steps.done',
};
