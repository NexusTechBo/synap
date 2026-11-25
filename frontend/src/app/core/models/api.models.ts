export type Role = 'ADMINISTRATOR' | 'DOCTOR' | 'ASSISTANT';

export type CountryCode = 'BO' | 'BR';

export type ClinicLanguage = 'es' | 'en' | 'pt-BR';

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export type DayOfWeek =
  'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export type WhatsappSessionStatus =
  'IDLE' | 'INITIALIZING' | 'QR_PENDING' | 'PAIRING_PENDING' | 'READY' | 'DISCONNECTED';

export interface Page<T> {
  content: T[];
  page: {
    size: number;
    number: number;
    totalElements: number;
    totalPages: number;
  };
}

export interface PageQuery {
  page?: number;
  size?: number;
  sort?: string;
}

export interface ApiError {
  status: number;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  errors?: { field: string; message: string }[] | null;
}

export type ActiveAppointmentStatus = Exclude<AppointmentStatus, 'CANCELLED'>;

export interface PatientActiveAppointmentConflict {
  appointmentId?: number;
  startTime: string;
  status: ActiveAppointmentStatus;
}

export interface StaffActiveAppointmentConflict extends PatientActiveAppointmentConflict {
  appointmentId: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

export interface TokenPayload {
  sub: string;
  roles?: string[];
  clinicId: number;
  clinicName: string;
  clinicSlug: string;
  username: string;
  country?: CountryCode;
  timezone?: string;
  defaultLanguage?: ClinicLanguage;
  exp: number;
}

export interface ProfileUpdateRequest {
  name: string;
  email: string;
  phoneNumber?: string | null;
  currentPassword?: string | null;
  newPassword?: string | null;
}

export interface ClinicRequest {
  name: string;
  slug: string;
  phoneNumber: string;
  adminName: string;
  adminUsername: string;
  adminEmail: string;
  adminPassword: string;
  adminDocument?: string | null;
  country?: CountryCode;
  timezone?: string;
  defaultLanguage?: ClinicLanguage;
}

export interface RegionCountry {
  code: CountryCode;
  defaultTimezone: string;
  timezones: string[];
  defaultLanguage: ClinicLanguage;
  phonePlaceholder: string;
}

export interface RegionCatalog {
  countries: RegionCountry[];
  languages: ClinicLanguage[];
}

export interface ClinicRegionalSettings {
  country: CountryCode;
  timezone: string;
  defaultLanguage: ClinicLanguage;
}

export interface ClinicCreatedResponse {
  id: number;
  name: string;
  phoneNumber: string;
  slug: string;
  adminUsername: string;
  adminEmail: string;
}

export interface ActivateClinicRequest {
  token: string;
}

export interface ClinicActivatedResponse {
  clinicName: string;
  adminUsername: string;
}

export interface ResendActivationRequest {
  email: string;
}

export interface AppointmentRequest {
  doctorId: number;
  patientId: number;
  startTime: string;
}

export interface RescheduleAppointmentRequest {
  startTime: string;
}

export interface CancelAppointmentRequest {
  reason: string;
}

export interface AppointmentResponse {
  id: number;
  startTime: string;
  endTime: string;
  doctorId: number;
  doctorName: string;
  doctorSpecialty: string | null;
  doctorEmail: string;
  patientId: number;
  patientName: string;
  patientEmail: string | null;
  status: AppointmentStatus;
  cancellationReason: string | null;
}

export interface AppointmentSummaryItem {
  id: number;
  clientName: string;
  doctorName: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  doctorId: number;
  patientId: number;
}

export type AppointmentBoard = Record<AppointmentStatus, AppointmentSummaryItem[]>;

export type AppointmentCalendar = Record<string, AppointmentSummaryItem[]>;

export interface AppointmentFilters extends PageQuery {
  doctorId?: number;
  patientId?: number;
  status?: AppointmentStatus;
}

export interface AppointmentBoardQuery {
  from: string;
  to: string;
  doctorId?: number;
  patientId?: number;
}

export interface AppointmentCalendarQuery {
  month: number;
  year: number;
  doctorId?: number;
  patientId?: number;
}

export interface Patient {
  id: number;
  document: string | null;
  name: string;
  email: string | null;
  phoneNumber: string;
  active: boolean;
}

export interface PatientRequest {
  document?: string | null;
  name: string;
  phoneNumber: string;
  email?: string | null;
}

export interface Staff {
  id: number;
  username: string;
  document: string | null;
  name: string;
  email: string;
  phoneNumber: string | null;
  active: boolean;
  alsoDoctor: boolean;
  role: Role;
  specialtyId: number | null;
  specialtyName: string | null;
}

export interface StaffRegisterRequest {
  name: string;
  email: string;
  phoneNumber?: string | null;
  document?: string | null;
  username: string;
  password: string;
  role: Role;
  specialtyId: number | null;
}

export interface StaffUpdateRequest {
  name: string;
  email: string;
  phoneNumber?: string | null;
  password?: string | null;
  role: Role;
  specialtyId: number | null;
}

export interface DoctorModeRequest {
  enabled: boolean;
  specialtyId: number | null;
  cancelAppointments?: boolean;
  cancellationReason?: string;
}

export interface PatientFilters extends PageQuery {
  search?: string;
  isActive?: boolean;
}

export interface DoctorFilters extends PageQuery {
  specialtyId?: number;
  isActive?: boolean;
}

export interface StaffFilters extends PageQuery {
  specialtyId?: number;
  isActive?: boolean;
  role?: Role;
}

export interface AssignPatientRequest {
  patientId: number;
  doctorId: number;
}

export interface Specialty {
  id: number;
  name: string;
}

export interface SpecialtyRequest {
  name: string;
}

export interface AvailabilityRequest {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
}

export interface Availability extends AvailabilityRequest {
  id: number;
  active: boolean;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
}

export interface AvailableSlots {
  date: string;
  doctorId: number;
  availableSlots: TimeSlot[];
}

export interface UnavailableDates {
  doctorId: number;
  from: string;
  to: string;
  unavailableDates: string[];
}

export interface ScheduleExceptionRequest {
  date: string;
  startTime: string | null;
  endTime: string | null;
  isFullDayBlock: boolean;
  reason: string | null;
  cancelAppointments?: boolean;
}

export interface ScheduleException extends Omit<ScheduleExceptionRequest, 'cancelAppointments'> {
  id: number;
}

export interface GuestTokenPayload {
  sub: string;
  roles?: string[];
  clinicId: number;
  clinicName: string;
  clinicSlug: string;
  country?: CountryCode;
  timezone?: string;
  exp: number;
}

export interface GuestSessionRequest {
  slug: string;
}

export interface GuestClinic {
  name: string;
  slug: string;
  country?: CountryCode;
  timezone?: string;
  defaultLanguage?: ClinicLanguage;
}

export interface GuestDoctor {
  id: number;
  name: string;
  specialtyId: number | null;
  specialtyName: string | null;
}

export interface GuestPatientRequest {
  phoneNumber: string;
}

export interface GuestNewPatientRequest extends GuestPatientRequest {
  document?: string | null;
  name: string;
  email?: string | null;
}

export type GuestBookingPatient = GuestPatientRequest &
  Partial<Pick<GuestNewPatientRequest, 'document' | 'name' | 'email'>>;

export interface GuestAppointmentRequest<P extends GuestBookingPatient = GuestBookingPatient> {
  doctorId: number;
  startTime: string;
  patient: P;
}

export interface GuestAppointmentResponse {
  appointmentId: number;
  doctorName: string;
  specialtyName: string | null;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
}

export interface WhatsappSessionStatusResponse {
  id: string;
  status: WhatsappSessionStatus;
  clinicPhoneNumber: string | null;
  linkedPhoneNumber: string | null;
}

export interface WhatsappPairingCodeResponse {
  status: WhatsappSessionStatus;
  code: string;
}
