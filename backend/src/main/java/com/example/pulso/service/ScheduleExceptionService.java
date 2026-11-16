package com.example.pulso.service;

import com.example.pulso.dto.scheduleexception.ScheduleExceptionRequest;
import com.example.pulso.dto.scheduleexception.ScheduleExceptionResponse;
import java.time.LocalDate;
import java.util.List;

public interface ScheduleExceptionService {
    ScheduleExceptionResponse addDoctorScheduleException(Long doctorId, ScheduleExceptionRequest request);

    List<ScheduleExceptionResponse> findDoctorScheduleExceptions(Long doctorId, LocalDate from);

    void deleteDoctorScheduleExceptionById(Long scheduleExceptionId, Long doctorId);
}
