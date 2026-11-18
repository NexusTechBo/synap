package com.example.pulso.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.pulso.repository.ClinicRepository;
import com.example.pulso.security.cache.ClinicSettingsVersionCache;
import com.example.pulso.websocket.event.SessionRefreshEvent;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ClinicSettingsVersionCacheTest {
    @Mock
    private ClinicRepository clinicRepository;

    @InjectMocks
    private ClinicSettingsVersionCache cache;

    @Test
    void shouldLoadFromRepositoryOnlyOnceWhileCached() {
        when(clinicRepository.findSettingsVersionById(7L)).thenReturn(Optional.of(3));

        assertThat(cache.get(7L)).contains(3);
        assertThat(cache.get(7L)).contains(3);

        verify(clinicRepository, times(1)).findSettingsVersionById(7L);
    }

    @Test
    void shouldReturnEmptyAndNotCacheWhenClinicDoesNotExist() {
        when(clinicRepository.findSettingsVersionById(7L)).thenReturn(Optional.empty());

        assertThat(cache.get(7L)).isEmpty();
        assertThat(cache.get(7L)).isEmpty();

        verify(clinicRepository, times(2)).findSettingsVersionById(7L);
    }

    @Test
    void shouldReloadAfterSessionRefreshEventInvalidatesTheClinic() {
        when(clinicRepository.findSettingsVersionById(7L)).thenReturn(Optional.of(3), Optional.of(4));
        assertThat(cache.get(7L)).contains(3);

        cache.onSessionRefresh(new SessionRefreshEvent(7L));

        assertThat(cache.get(7L)).contains(4);
    }

    @Test
    void shouldKeepOtherClinicsCachedWhenOneIsInvalidated() {
        when(clinicRepository.findSettingsVersionById(7L)).thenReturn(Optional.of(3));
        when(clinicRepository.findSettingsVersionById(8L)).thenReturn(Optional.of(9));
        cache.get(7L);
        cache.get(8L);

        cache.onSessionRefresh(new SessionRefreshEvent(7L));
        cache.get(8L);

        verify(clinicRepository, times(1)).findSettingsVersionById(8L);
    }
}
