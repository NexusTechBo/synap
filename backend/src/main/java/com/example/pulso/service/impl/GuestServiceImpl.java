package com.example.pulso.service.impl;

import com.example.pulso.dto.appointment.AppointmentRequest;
import com.example.pulso.dto.doctoravailability.DoctorAvailabilitySlotsResponse;
import com.example.pulso.dto.doctoravailability.DoctorUnavailableDatesResponse;
import com.example.pulso.dto.guest.GuestAppointmentRequest;
import com.example.pulso.dto.guest.GuestAppointmentResponse;
import com.example.pulso.dto.guest.GuestClinicResponse;
import com.example.pulso.dto.guest.GuestDoctorResponse;
import com.example.pulso.dto.guest.GuestNewPatientRequest;
import com.example.pulso.dto.guest.GuestPatientRequest;
import com.example.pulso.dto.patient.PatientRequest;
import com.example.pulso.exception.ApiException;
import com.example.pulso.exception.BusinessException;
import com.example.pulso.exception.MessageKeys;
import com.example.pulso.exception.ResourceNotFoundException;
import com.example.pulso.mapper.GuestMapper;
import com.example.pulso.repository.PatientRepository;
import com.example.pulso.repository.PersonalRepository;
import com.example.pulso.service.AppointmentService;
import com.example.pulso.service.DoctorAvailabilityService;
import com.example.pulso.service.GuestService;
import com.example.pulso.service.PatientService;
import com.example.pulso.util.Utils;
import java.time.LocalDate;
import java.util.List;
import java.util.function.Supplier;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GuestServiceImpl implements GuestService {
    private final CurrentClinicProvider currentClinicProvider;
    private final PersonalRepository personalRepository;
    private final PatientRepository patientRepository;
    private final PatientService patientService;
    private final AppointmentService appointmentService;
    private final DoctorAvailabilityService doctorAvailabilityService;
    private final GuestMapper guestMapper;

    @Override
    public GuestClinicResponse findCurrentClinic() {
        var clinic = currentClinicProvider.getCurrentClinic();
        return new GuestClinicResponse(clinic.getName(), clinic.getSlug());
    }

    @Override
    public List<GuestDoctorResponse> findAllActiveDoctors(Long specialtyId) {
        return guestMapper.toDoctorResponseList(personalRepository.findAllDoctorsActive(specialtyId));
    }

    @Override
    public DoctorAvailabilitySlotsResponse getDoctorAvailableSlots(Long doctorId, LocalDate date) {
        getDoctorOrThrowById(doctorId);
        return doctorAvailabilityService.getDoctorAvailableSlots(doctorId, date);
    }

    @Override
    public DoctorUnavailableDatesResponse getDoctorUnavailableDates(Long doctorId, LocalDate from, LocalDate to) {
        getDoctorOrThrowById(doctorId);
        return doctorAvailabilityService.getDoctorUnavailableDates(doctorId, from, to);
    }

    @Override
    @Transactional
    public GuestAppointmentResponse bookAppointment(GuestAppointmentRequest<GuestPatientRequest> request) {
        return book(request, () -> resolvePatientId(request.patient()));
    }

    @Override
    @Transactional
    public GuestAppointmentResponse bookAppointmentForNewPatient(GuestAppointmentRequest<GuestNewPatientRequest> request) {
        return book(request, () -> resolveNewPatientId(request.patient()));
    }

    private GuestAppointmentResponse book(GuestAppointmentRequest<?> request, Supplier<Long> patientId) {
        var appointment = appointmentService.bookGuestAppointment(
                new AppointmentRequest(request.doctorId(), patientId.get(), request.startTime())
        );
        return guestMapper.toAppointmentResponse(appointment);
    }

    private Long resolvePatientId(GuestPatientRequest patient) {
        return patientRepository.findActiveIdByPhoneNumber(Utils.normalizePhoneNumber(patient.phoneNumber()))
                .orElseThrow(() -> new BusinessException(MessageKeys.GUEST_CANNOT_BOOK));
    }

    private Long resolveNewPatientId(GuestNewPatientRequest patient) {
        var phoneNumber = Utils.normalizePhoneNumber(patient.phoneNumber());
        var email = Utils.normalizeEmail(patient.email());
        var ci = Utils.normalizeCi(patient.ci());
        if ((ci != null && patientRepository.existsByCi(ci))
                || (phoneNumber != null && patientRepository.existsByPhoneNumber(phoneNumber))
                || (email != null && patientRepository.existsByEmailIgnoreCase(email)))
            throw new BusinessException(MessageKeys.GUEST_CANNOT_BOOK);
        try {
            return patientService.createPatient(new PatientRequest(ci, patient.name(), email, phoneNumber)).id();
        } catch (ApiException | DataIntegrityViolationException e) {
            log.info(
                    "Guest patient creation rejected: {}",
                    e instanceof ApiException api
                            ? api.getMessageKey()
                            : e.getClass().getSimpleName());
            throw new BusinessException(MessageKeys.GUEST_CANNOT_BOOK);
        }
    }

    private void getDoctorOrThrowById(Long doctorId) {
        personalRepository.findActiveDoctorById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException(MessageKeys.PERSONAL_DOCTOR_NOT_FOUND, doctorId));
    }
}
