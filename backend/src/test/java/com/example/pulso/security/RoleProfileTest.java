package com.example.pulso.security;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.pulso.enums.ERole;
import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;

class RoleProfileTest {
    @Nested
    class ValidCombinations {
        static Stream<Arguments> validCombinations() {
            return Stream.of(
                    Arguments.of(List.of("ADMINISTRATOR"), ERole.ADMINISTRATOR, false),
                    Arguments.of(List.of("ADMINISTRATOR", "DOCTOR"), ERole.ADMINISTRATOR, true),
                    Arguments.of(List.of("DOCTOR", "ADMINISTRATOR"), ERole.ADMINISTRATOR, true),
                    Arguments.of(List.of("DOCTOR"), ERole.DOCTOR, false),
                    Arguments.of(List.of("ASSISTANT"), ERole.ASSISTANT, false),
                    Arguments.of(List.of("GUEST"), ERole.GUEST, false));
        }

        @ParameterizedTest
        @MethodSource("validCombinations")
        void shouldResolveProfileWithPrimaryRoleAndDoctorFlag(
                List<String> roles, ERole primary, boolean alsoDoctor) {
            var profile = RoleProfile.fromRoles(roles);

            assertThat(profile).contains(new RoleProfile(primary, alsoDoctor));
        }
    }

    @Nested
    class InvalidCombinations {
        static Stream<List<String>> invalidCombinations() {
            return Stream.of(
                    List.of(),
                    List.of("DOCTOR", "DOCTOR"),
                    List.of("ADMINISTRATOR", "ADMINISTRATOR", "DOCTOR"),
                    List.of("administrator"),
                    List.of("Doctor"),
                    List.of("SUPERUSER"),
                    List.of("ADMINISTRATOR", "SUPERUSER"),
                    List.of("GUEST", "DOCTOR"),
                    List.of("ASSISTANT", "DOCTOR"),
                    List.of("ADMINISTRATOR", "ASSISTANT"),
                    List.of("ADMINISTRATOR", "DOCTOR", "ASSISTANT"));
        }

        @ParameterizedTest
        @MethodSource("invalidCombinations")
        void shouldReturnEmptyWhenCombinationIsNotAllowed(List<String> roles) {
            assertThat(RoleProfile.fromRoles(roles)).isEmpty();
        }
    }

    @Nested
    class IsGuest {
        @Test
        void shouldBeGuestWhenPrimaryRoleIsGuest() {
            assertThat(new RoleProfile(ERole.GUEST, false).isGuest()).isTrue();
        }

        @ParameterizedTest
        @EnumSource(value = ERole.class, names = "GUEST", mode = EnumSource.Mode.EXCLUDE)
        void shouldNotBeGuestWhenPrimaryRoleIsStaff(ERole role) {
            assertThat(new RoleProfile(role, false).isGuest()).isFalse();
        }
    }
}
