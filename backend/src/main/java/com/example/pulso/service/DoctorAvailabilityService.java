package com.example.pulso.service;

import com.example.pulso.dto.doctoravailability.DoctorAvailabilityRequest;
import com.example.pulso.dto.doctoravailability.DoctorAvailabilityResponse;
import com.example.pulso.dto.doctoravailability.DoctorAvailabilitySlotsResponse;
import com.example.pulso.dto.doctoravailability.DoctorUnavailableDatesResponse;
import java.time.LocalDate;
import java.util.List;

public interface DoctorAvailabilityService {
    DoctorAvailabilityResponse addDoctorAvailability(Long doctorId, DoctorAvailabilityRequest request);

    List<DoctorAvailabilityResponse> getDoctorAvailabilities(Long doctorId);

    DoctorAvailabilitySlotsResponse getDoctorAvailableSlots(Long doctorId, LocalDate date);

    DoctorUnavailableDatesResponse getDoctorUnavailableDates(Long doctorId, LocalDate from, LocalDate to);

    void deactivateDoctorAvailabilityById(Long availabilityId, Long doctorId);
}
