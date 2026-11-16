package com.example.pulso.mapper;

import com.example.pulso.dto.appointment.AppointmentResponse;
import com.example.pulso.dto.guest.GuestAppointmentResponse;
import com.example.pulso.dto.guest.GuestDoctorResponse;
import com.example.pulso.entity.Personal;
import java.util.List;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface GuestMapper {
    @Mapping(target = "specialtyId", source = "specialty.id")
    @Mapping(target = "specialtyName", source = "specialty.name")
    GuestDoctorResponse toDoctorResponse(Personal doctor);

    List<GuestDoctorResponse> toDoctorResponseList(List<Personal> doctors);

    @Mapping(target = "appointmentId", source = "id")
    @Mapping(target = "specialtyName", source = "doctorSpecialty")
    GuestAppointmentResponse toAppointmentResponse(AppointmentResponse appointment);
}
