package com.example.pulso.mapper;

import com.example.pulso.dto.scheduleexception.ScheduleExceptionResponse;
import com.example.pulso.entity.ScheduleException;
import java.util.List;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ScheduleExceptionMapper {
    ScheduleExceptionResponse toResponse(ScheduleException scheduleException);

    List<ScheduleExceptionResponse> toResponseList(List<ScheduleException> scheduleException);
}
