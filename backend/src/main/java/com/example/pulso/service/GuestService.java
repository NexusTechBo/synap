package com.example.pulso.service;

import com.example.pulso.dto.doctoravailability.DoctorAvailabilitySlotsResponse;
import com.example.pulso.dto.doctoravailability.DoctorUnavailableDatesResponse;
import com.example.pulso.dto.guest.GuestAppointmentRequest;
import com.example.pulso.dto.guest.GuestAppointmentResponse;
import com.example.pulso.dto.guest.GuestClinicResponse;
import com.example.pulso.dto.guest.GuestDoctorResponse;
import com.example.pulso.dto.guest.GuestNewPatientRequest;
import com.example.pulso.dto.guest.GuestPatientRequest;
import java.time.LocalDate;
import java.util.List;

public interface GuestService {
    GuestClinicResponse findCurrentClinic();

    List<GuestDoctorResponse> findAllActiveDoctors(Long specialtyId);

    DoctorAvailabilitySlotsResponse getDoctorAvailableSlots(Long doctorId, LocalDate date);

    DoctorUnavailableDatesResponse getDoctorUnavailableDates(Long doctorId, LocalDate from, LocalDate to);

    GuestAppointmentResponse bookAppointment(GuestAppointmentRequest<GuestPatientRequest> request);

    GuestAppointmentResponse bookAppointmentForNewPatient(GuestAppointmentRequest<GuestNewPatientRequest> request);
}
