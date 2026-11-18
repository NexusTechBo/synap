package com.example.pulso.notification.template;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.pulso.config.LocaleConfig;
import com.example.pulso.enums.AppointmentStatus;
import com.example.pulso.enums.ERole;
import com.example.pulso.notification.event.AppointmentNotificationEvent;
import com.example.pulso.notification.event.AppointmentNotificationType;
import com.example.pulso.notification.event.ClinicActivatedEvent;
import com.example.pulso.notification.event.ClinicActivationEvent;
import com.example.pulso.notification.event.StaffCreatedEvent;
import java.time.LocalDateTime;
import java.util.Locale;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

@DisplayName("Plantillas de notificación por idioma")
class TemplatesLocalizationTest {
    private static final String FRONTEND = "https://app.example.com";
    private static final Locale ES = LocaleConfig.SPANISH;
    private static final Locale EN = LocaleConfig.ENGLISH;
    private static final NotificationTexts TEXTS = new NotificationTexts(new LocaleConfig().messageSource());
    private static final EmailTemplates EMAIL = new EmailTemplates(TEXTS);
    private static final WhatsappTemplates WHATSAPP = new WhatsappTemplates(TEXTS);

    private static AppointmentNotificationEvent appointment(Locale locale, String cancellationReason) {
        return appointment(locale, "Norte", cancellationReason, LocalDateTime.of(2030, 1, 15, 10, 30));
    }

    private static AppointmentNotificationEvent appointment(
            Locale locale, String clinicName, String cancellationReason, LocalDateTime endTime) {
        return new AppointmentNotificationEvent(
                AppointmentNotificationType.CONFIRMED,
                AppointmentStatus.CONFIRMED,
                1L,
                clinicName,
                "norte",
                "Dr. House",
                "doc@example.com",
                "Cardiology",
                "Juan Lopez",
                "juan@example.com",
                "+59170000000",
                LocalDateTime.of(2030, 1, 15, 10, 0),
                endTime,
                cancellationReason,
                AppointmentNotificationEvent.ALL_CHANNELS,
                locale);
    }

    @Nested
    @DisplayName("Email en inglés")
    class EnglishEmail {
        @Test
        void shouldRenderConfirmedAppointment() {
            var content = EMAIL.appointmentConfirmed(appointment(EN, null), "Juan");

            assertThat(content.subject()).isEqualTo("Appointment confirmed - Norte");
            assertThat(content.html())
                    .contains("<html lang=\"en\">")
                    .contains("Hello Juan,")
                    .contains("was <strong>confirmed</strong>")
                    .contains("<strong>Workspace:</strong>")
                    .contains("<strong>Date:</strong></td><td>Tuesday, January 15, 2030")
                    .contains("<strong>Time:</strong></td><td>10:00 - 10:30")
                    .contains("This is an automated message");
        }

        @Test
        void shouldRenderCancelledAppointmentWithReason() {
            var content = EMAIL.appointmentCancelled(appointment(EN, "Doctor unavailable"), "Juan");

            assertThat(content.subject()).isEqualTo("Appointment cancelled - Norte");
            assertThat(content.html())
                    .contains("was <strong>cancelled</strong>")
                    .contains("<strong>Reason:</strong> Doctor unavailable")
                    .contains("Tuesday, January 15, 2030");
        }

        @Test
        void shouldOmitReasonWhenCancellationReasonIsBlank() {
            var content = EMAIL.appointmentCancelled(appointment(EN, "  "), "Juan");

            assertThat(content.html()).doesNotContain("Reason:");
        }

        @Test
        void shouldRenderRescheduledAppointment() {
            var content = EMAIL.appointmentRescheduled(appointment(EN, null), "Juan");

            assertThat(content.subject()).isEqualTo("Appointment rescheduled - Norte");
            assertThat(content.html())
                    .contains("<strong>rescheduled</strong>")
                    .contains("<strong>pending confirmation</strong>")
                    .contains("Tuesday, January 15, 2030");
        }

        @Test
        void shouldRenderGuestBookedDoctorEmail() {
            var content = EMAIL.doctorGuestAppointment(appointment(EN, null));

            assertThat(content.subject()).isEqualTo("New appointment booked - Norte");
            assertThat(content.html())
                    .contains("Hello Dr. Dr. House,")
                    .contains("booked a new appointment from the public portal")
                    .contains("<strong>pending confirmation</strong>");
        }

        @Test
        void shouldRenderStaffCredentials() {
            var content = EMAIL.staffCredentials(new StaffCreatedEvent(
                    "a@example.com", "Ana", "ana@norte.com", "pw123", ERole.ASSISTANT, "Norte", EN));

            assertThat(content.subject()).isEqualTo("Your account at Norte");
            assertThat(content.html())
                    .contains("Hello Ana,")
                    .contains("Your account was created at <strong>Norte</strong>")
                    .contains("<strong>User:</strong></td><td>ana@norte.com")
                    .contains("<strong>Password:</strong></td><td>pw123")
                    .contains("<strong>Role:</strong></td><td>Assistant")
                    .contains("We recommend changing your password");
        }

        @Test
        void shouldRenderClinicActivation() {
            var content = EMAIL.clinicActivation(
                    new ClinicActivationEvent(1L, "Norte", "Ana", "ana@example.com", "tok", LocalDateTime.now(), EN),
                    FRONTEND);

            assertThat(content.subject()).isEqualTo("Activate your workspace Norte");
            assertThat(content.html())
                    .contains("Activate workspace")
                    .contains("This link expires in 48 hours")
                    .contains(FRONTEND + "/activar?token=tok")
                    .contains("copy and paste this link");
        }

        @Test
        void shouldRenderClinicWelcome() {
            var content = EMAIL.clinicWelcome(
                    new ClinicActivatedEvent(1L, "Norte", "Ana", "ana@example.com", "ana", EN), FRONTEND);

            assertThat(content.subject()).isEqualTo("Your workspace Norte is active");
            assertThat(content.html())
                    .contains("is now active")
                    .contains("Sign in")
                    .contains(FRONTEND + "/login");
        }

        @Test
        void shouldFallbackToEnglishWorkspaceLabelWhenClinicNameIsBlank() {
            var content = EMAIL.appointmentConfirmed(appointment(EN, " ", null, null), "Juan");

            assertThat(content.subject()).isEqualTo("Appointment confirmed - the workspace");
            assertThat(content.html()).contains("<strong>Time:</strong></td><td>10:00<");
        }
    }

    @Nested
    @DisplayName("Email en español")
    class SpanishEmail {
        @Test
        void shouldRenderConfirmedAppointment() {
            var content = EMAIL.appointmentConfirmed(appointment(ES, null), "Juan");

            assertThat(content.subject()).isEqualTo("Cita confirmada - Norte");
            assertThat(content.html())
                    .contains("<html lang=\"es\">")
                    .contains("Hola Juan,")
                    .contains("fue <strong>confirmada</strong>")
                    .contains("<strong>Fecha:</strong></td><td>martes 15 de enero de 2030")
                    .contains("<strong>Hora:</strong></td><td>10:00 - 10:30")
                    .contains("mensaje automático");
        }

        @Test
        void shouldRenderCancelledAppointmentWithReason() {
            var content = EMAIL.appointmentCancelled(appointment(ES, "Doctor no disponible"), "Juan");

            assertThat(content.subject()).isEqualTo("Cita cancelada - Norte");
            assertThat(content.html())
                    .contains("fue <strong>cancelada</strong>")
                    .contains("<strong>Motivo:</strong> Doctor no disponible");
        }

        @Test
        void shouldRenderRescheduledAppointment() {
            var content = EMAIL.appointmentRescheduled(appointment(ES, null), "Juan");

            assertThat(content.subject()).isEqualTo("Cita reprogramada - Norte");
            assertThat(content.html()).contains("<strong>pendiente de confirmación</strong>");
        }

        @Test
        void shouldRenderGuestBookedDoctorEmail() {
            var content = EMAIL.doctorGuestAppointment(appointment(ES, null));

            assertThat(content.subject()).isEqualTo("Nueva cita agendada - Norte");
            assertThat(content.html())
                    .contains("Hola Dr./Dra. Dr. House,")
                    .contains("desde el portal público");
        }

        @Test
        void shouldRenderStaffCredentials() {
            var content = EMAIL.staffCredentials(new StaffCreatedEvent(
                    "a@example.com", "Ana", "ana@norte.com", "pw123", ERole.ASSISTANT, "Norte", ES));

            assertThat(content.subject()).isEqualTo("Tu cuenta en Norte");
            assertThat(content.html())
                    .contains("Se creó tu cuenta en <strong>Norte</strong>")
                    .contains("<strong>Usuario:</strong>")
                    .contains("<strong>Contraseña:</strong>")
                    .contains("<strong>Rol:</strong></td><td>Asistente");
        }

        @Test
        void shouldRenderClinicActivationAndWelcome() {
            var activation = EMAIL.clinicActivation(
                    new ClinicActivationEvent(1L, "Norte", "Ana", "ana@example.com", "tok", LocalDateTime.now(), ES),
                    FRONTEND);
            var welcome = EMAIL.clinicWelcome(
                    new ClinicActivatedEvent(1L, "Norte", "Ana", "ana@example.com", "ana", ES), FRONTEND);

            assertThat(activation.subject()).isEqualTo("Activa tu espacio de trabajo Norte");
            assertThat(activation.html()).contains("Este enlace vence en 48 horas");
            assertThat(welcome.subject()).isEqualTo("Tu espacio de trabajo Norte está activo");
            assertThat(welcome.html()).contains("Iniciar sesión");
        }
    }

    @Nested
    @DisplayName("WhatsApp")
    class Whatsapp {
        @Test
        void shouldRenderConfirmedMessageInEnglish() {
            var text = WHATSAPP.appointmentConfirmed(appointment(EN, null));

            assertThat(text)
                    .startsWith("Hello Juan Lopez, your appointment at *Norte* was *confirmed*.")
                    .contains("Doctor: Dr. House")
                    .contains("Specialty: Cardiology")
                    .contains("Date: Tuesday, January 15, 2030")
                    .contains("Time: 10:00 - 10:30");
        }

        @Test
        void shouldRenderConfirmedMessageInSpanish() {
            var text = WHATSAPP.appointmentConfirmed(appointment(ES, null));

            assertThat(text)
                    .startsWith("Hola Juan Lopez, tu cita en *Norte* fue *confirmada*.")
                    .contains("Especialidad: Cardiology")
                    .contains("Fecha: martes 15 de enero de 2030")
                    .contains("Hora: 10:00 - 10:30");
        }

        @Test
        void shouldRenderCancelledMessageWithReasonInEnglish() {
            var text = WHATSAPP.appointmentCancelled(appointment(EN, "Doctor unavailable"));

            assertThat(text).contains("was *cancelled*.").endsWith("Reason: Doctor unavailable");
        }

        @Test
        void shouldRenderCancelledMessageWithReasonInSpanish() {
            var text = WHATSAPP.appointmentCancelled(appointment(ES, "Doctor no disponible"));

            assertThat(text).contains("fue *cancelada*.").endsWith("Motivo: Doctor no disponible");
        }

        @Test
        void shouldRenderRescheduledMessageInBothLanguages() {
            assertThat(WHATSAPP.appointmentRescheduled(appointment(EN, null)))
                    .contains("was *rescheduled*.")
                    .contains("*pending confirmation*");
            assertThat(WHATSAPP.appointmentRescheduled(appointment(ES, null)))
                    .contains("fue *reprogramada*.")
                    .contains("*pendiente de confirmación*");
        }

        @Test
        void shouldUseEnglishWorkspaceFallbackWhenClinicNameIsNull() {
            var text = WHATSAPP.appointmentConfirmed(appointment(EN, null, null, null));

            assertThat(text).contains("your appointment at *the workspace*");
        }
    }
}
