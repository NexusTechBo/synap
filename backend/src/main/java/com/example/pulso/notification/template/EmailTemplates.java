package com.example.pulso.notification.template;

import com.example.pulso.notification.EmailContent;
import com.example.pulso.notification.event.AppointmentNotificationEvent;
import com.example.pulso.notification.event.ClinicActivatedEvent;
import com.example.pulso.notification.event.ClinicActivationEvent;
import com.example.pulso.notification.event.StaffCreatedEvent;
import com.example.pulso.util.Utils;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@RequiredArgsConstructor
public class EmailTemplates {
    private final NotificationTexts texts;

    public EmailContent staffCredentials(StaffCreatedEvent event) {
        var locale = event.locale();
        var clinic = texts.clinicLabel(event.clinicName(), locale);
        var subject = texts.get(locale, "notification.email.staffCredentials.subject", clinic);
        var body = """
                <p>%s</p>
                <p>%s</p>
                <table cellpadding="4">
                  %s
                  %s
                  %s
                </table>
                <p>%s</p>
                """.formatted(
                        greeting(locale, event.name()),
                        texts.get(locale, "notification.email.staffCredentials.intro", Utils.escapeHtml(clinic)),
                        row(texts.label(locale, "user"), event.username()),
                        row(texts.label(locale, "password"), event.rawPassword()),
                        row(texts.label(locale, "role"), texts.roleLabel(event.role(), locale)),
                        texts.get(locale, "notification.email.staffCredentials.advice"));
        return new EmailContent(subject, layout(body, locale));
    }

    public EmailContent clinicActivation(ClinicActivationEvent event, String frontendUrl) {
        var locale = event.locale();
        var clinic = texts.clinicLabel(event.clinicName(), locale);
        var subject = texts.get(locale, "notification.email.clinicActivation.subject", clinic);
        var link = frontendUrl + "/activar?token=" + URLEncoder.encode(event.token(), StandardCharsets.UTF_8);
        var body = """
                <p>%s</p>
                <p>%s</p>
                %s
                <p>%s<br>%s</p>
                <p>%s</p>
                """.formatted(
                        greeting(locale, event.adminName()),
                        texts.get(locale, "notification.email.clinicActivation.intro", Utils.escapeHtml(clinic)),
                        button(link, texts.get(locale, "notification.email.clinicActivation.button")),
                        texts.get(locale, "notification.email.linkFallback"),
                        anchor(link),
                        texts.get(locale, "notification.email.clinicActivation.expiry"));
        return new EmailContent(subject, layout(body, locale));
    }

    public EmailContent clinicWelcome(ClinicActivatedEvent event, String frontendUrl) {
        var locale = event.locale();
        var clinic = texts.clinicLabel(event.clinicName(), locale);
        var subject = texts.get(locale, "notification.email.clinicWelcome.subject", clinic);
        var link = frontendUrl + "/login";
        var body = """
                <p>%s</p>
                <p>%s</p>
                <table cellpadding="4">%s</table>
                %s
                <p>%s<br>%s</p>
                """.formatted(
                        greeting(locale, event.adminName()),
                        texts.get(locale, "notification.email.clinicWelcome.intro", Utils.escapeHtml(clinic)),
                        row(texts.label(locale, "user"), event.adminUsername()),
                        button(link, texts.get(locale, "notification.email.clinicWelcome.button")),
                        texts.get(locale, "notification.email.linkFallback"),
                        anchor(link));
        return new EmailContent(subject, layout(body, locale));
    }

    public EmailContent appointmentConfirmed(AppointmentNotificationEvent event, String recipientName) {
        var locale = event.locale();
        var subject = texts.get(
                locale,
                "notification.email.appointmentConfirmed.subject",
                texts.clinicLabel(event.clinicName(), locale));
        var body = """
                <p>%s</p>
                <p>%s</p>
                %s
                """.formatted(
                        greeting(locale, recipientName),
                        texts.get(locale, "notification.email.appointmentConfirmed.intro"),
                        appointmentDetails(event));
        return new EmailContent(subject, layout(body, locale));
    }

    public EmailContent appointmentCancelled(AppointmentNotificationEvent event, String recipientName) {
        var locale = event.locale();
        var subject = texts.get(
                locale,
                "notification.email.appointmentCancelled.subject",
                texts.clinicLabel(event.clinicName(), locale));
        var reason = StringUtils.hasText(event.cancellationReason())
                ? "<p><strong>" + texts.label(locale, "reason") + ":</strong> "
                        + Utils.escapeHtml(event.cancellationReason()) + "</p>"
                : "";
        var body = """
                <p>%s</p>
                <p>%s</p>
                %s
                %s
                """.formatted(
                        greeting(locale, recipientName),
                        texts.get(locale, "notification.email.appointmentCancelled.intro"),
                        appointmentDetails(event),
                        reason);
        return new EmailContent(subject, layout(body, locale));
    }

    public EmailContent appointmentRescheduled(AppointmentNotificationEvent event, String recipientName) {
        var locale = event.locale();
        var subject = texts.get(
                locale,
                "notification.email.appointmentRescheduled.subject",
                texts.clinicLabel(event.clinicName(), locale));
        var body = """
                <p>%s</p>
                <p>%s</p>
                %s
                <p>%s</p>
                """.formatted(
                        greeting(locale, recipientName),
                        texts.get(locale, "notification.email.appointmentRescheduled.intro"),
                        appointmentDetails(event),
                        texts.get(locale, "notification.email.appointmentRescheduled.pending"));
        return new EmailContent(subject, layout(body, locale));
    }

    public EmailContent doctorGuestAppointment(AppointmentNotificationEvent event) {
        var locale = event.locale();
        var subject = texts.get(
                locale,
                "notification.email.doctorGuestAppointment.subject",
                texts.clinicLabel(event.clinicName(), locale));
        var body = """
                <p>%s</p>
                <p>%s</p>
                %s
                <p>%s</p>
                """.formatted(
                        texts.get(locale, "notification.email.doctorGreeting", Utils.escapeHtml(event.doctorName())),
                        texts.get(locale, "notification.email.doctorGuestAppointment.intro"),
                        appointmentDetails(event),
                        texts.get(locale, "notification.email.doctorGuestAppointment.pending"));
        return new EmailContent(subject, layout(body, locale));
    }

    private String greeting(Locale locale, String name) {
        return texts.get(locale, "notification.email.greeting", Utils.escapeHtml(name));
    }

    private String appointmentDetails(AppointmentNotificationEvent event) {
        var locale = event.locale();
        var specialtyRow = StringUtils.hasText(event.specialtyName())
                ? row(texts.label(locale, "specialty"), event.specialtyName())
                : "";
        return "<table cellpadding=\"4\">"
                + row(texts.label(locale, "workspace"), texts.clinicLabel(event.clinicName(), locale))
                + row(texts.label(locale, "doctor"), event.doctorName())
                + specialtyRow
                + row(texts.label(locale, "patient"), event.patientName())
                + row(texts.label(locale, "date"), texts.formatDate(event.startTime(), locale))
                + row(texts.label(locale, "time"), texts.formatTimeRange(event.startTime(), event.endTime()))
                + "</table>";
    }

    private static String row(String label, String value) {
        return "<tr><td><strong>" + label + ":</strong></td><td>" + Utils.escapeHtml(value) + "</td></tr>";
    }

    private static String button(String href, String label) {
        return "<p><a href=\"" + Utils.escapeHtml(href)
                + "\" style=\"display: inline-block; padding: 10px 20px; background-color: #2563eb; "
                + "color: #ffffff; text-decoration: none; border-radius: 6px;\">" + Utils.escapeHtml(label)
                + "</a></p>";
    }

    private static String anchor(String href) {
        var url = Utils.escapeHtml(href);
        return "<a href=\"" + url + "\">" + url + "</a>";
    }

    private String layout(String body, Locale locale) {
        return """
                <!DOCTYPE html>
                <html lang="%s">
                <head><meta charset="UTF-8"></head>
                <body style="font-family: Arial, sans-serif; color: #1f2937;">
                %s
                <p style="color: #6b7280; font-size: 12px;">%s</p>
                </body>
                </html>
                """.formatted(locale.getLanguage(), body, texts.get(locale, "notification.email.footer"));
    }
}
