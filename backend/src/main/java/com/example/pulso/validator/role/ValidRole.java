package com.example.pulso.validator.role;

import com.example.pulso.enums.ERole;
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
@Constraint(validatedBy = ValidRole.ValidRoleValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidRole {
    String message() default "{validation.role.invalid}";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};

    class ValidRoleValidator implements ConstraintValidator<ValidRole, ERole> {
        @Override
        public boolean isValid(ERole value, ConstraintValidatorContext context) {
            if (value == null) return true;
            return value == ERole.ASSISTANT || value == ERole.DOCTOR;
        }
    }
}
