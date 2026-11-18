package com.example.pulso.security.profile;

import com.example.pulso.enums.ERole;
import java.util.Collection;
import java.util.Optional;
import java.util.Set;

public record RoleProfile(ERole primary) {
    private static final Set<String> ADMINISTRATOR = Set.of(ERole.ADMINISTRATOR.name());
    private static final Set<String> ADMINISTRATOR_AND_DOCTOR = Set.of(ERole.ADMINISTRATOR.name(), ERole.DOCTOR.name());
    private static final Set<String> DOCTOR = Set.of(ERole.DOCTOR.name());
    private static final Set<String> ASSISTANT = Set.of(ERole.ASSISTANT.name());
    private static final Set<String> GUEST = Set.of(ERole.GUEST.name());

    public static Optional<RoleProfile> fromRoles(Collection<String> roles) {
        var set = Set.copyOf(roles);
        if (set.size() != roles.size()) return Optional.empty();
        if (set.equals(ADMINISTRATOR) || set.equals(ADMINISTRATOR_AND_DOCTOR))
            return Optional.of(new RoleProfile(ERole.ADMINISTRATOR));
        if (set.equals(DOCTOR)) return Optional.of(new RoleProfile(ERole.DOCTOR));
        if (set.equals(ASSISTANT)) return Optional.of(new RoleProfile(ERole.ASSISTANT));
        if (set.equals(GUEST)) return Optional.of(new RoleProfile(ERole.GUEST));
        return Optional.empty();
    }

    public boolean isGuest() {
        return primary == ERole.GUEST;
    }
}
