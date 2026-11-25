package com.example.pulso.validator.partialBlockTimes;

import com.example.pulso.dto.scheduleexception.ScheduleExceptionRequest;
import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;
import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Documented
@Constraint(validatedBy = PartialBlockTimes.PartialBlockTimesValidator.class)
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface PartialBlockTimes {
    String message() default "{validation.partialBlock.timesRequired}";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};

    class PartialBlockTimesValidator implements ConstraintValidator<PartialBlockTimes, ScheduleExceptionRequest> {
        @Override
        public boolean isValid(ScheduleExceptionRequest value, ConstraintValidatorContext context) {
            if (value == null || !Boolean.FALSE.equals(value.isFullDayBlock())) return true;
            context.disableDefaultConstraintViolation();
            var valid = true;
            if (value.startTime() == null) {
                buildViolation(context, "{validation.partialBlock.startTimeRequired}", "startTime");
                valid = false;
            }
            if (value.endTime() == null) {
                buildViolation(context, "{validation.partialBlock.endTimeRequired}", "endTime");
                valid = false;
            }
            return valid;
        }

        private void buildViolation(ConstraintValidatorContext context, String errorMessage, String node) {
            context.buildConstraintViolationWithTemplate(errorMessage)
                    .addPropertyNode(node)
                    .addConstraintViolation();
        }
    }
}
