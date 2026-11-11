package com.example.scheduler.service;

import com.example.scheduler.dto.doctoravailability.DoctorAvailabilityRequest;
import com.example.scheduler.dto.doctoravailability.DoctorAvailabilityResponse;
import com.example.scheduler.dto.doctoravailability.DoctorAvailabilitySlotsResponse;
import com.example.scheduler.dto.doctoravailability.DoctorUnavailableDatesResponse;
import java.time.LocalDate;
import java.util.List;

public interface DoctorAvailabilityService {
    DoctorAvailabilityResponse addDoctorAvailability(Long doctorId, DoctorAvailabilityRequest request);

    List<DoctorAvailabilityResponse> getDoctorAvailabilities(Long doctorId);

    DoctorAvailabilitySlotsResponse getDoctorAvailableSlots(Long doctorId, LocalDate date);

    DoctorUnavailableDatesResponse getDoctorUnavailableDates(Long doctorId, LocalDate from, LocalDate to);

    void deactivateDoctorAvailabilityById(Long availabilityId, Long doctorId);
}
