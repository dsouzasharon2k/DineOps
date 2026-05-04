package com.platterops.alerts;

import com.platterops.dto.DailyDigestResponse;
import com.platterops.notification.EmailGatewayService;
import com.platterops.restaurant.Restaurant;
import com.platterops.restaurant.RestaurantRepository;
import com.platterops.user.UserRepository;
import com.platterops.user.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DigestSchedulerTest {

    private RestaurantRepository restaurantRepository;
    private DailyDigestService dailyDigestService;
    private UserRepository userRepository;
    private EmailGatewayService emailGatewayService;
    private DigestScheduler digestScheduler;

    @BeforeEach
    void setUp() {
        restaurantRepository = Mockito.mock(RestaurantRepository.class);
        dailyDigestService = Mockito.mock(DailyDigestService.class);
        userRepository = Mockito.mock(UserRepository.class);
        emailGatewayService = Mockito.mock(EmailGatewayService.class);
        digestScheduler = new DigestScheduler(
                restaurantRepository,
                dailyDigestService,
                userRepository,
                emailGatewayService,
                "ops@dineops.com"
        );
    }

    @Test
    void runDailyDigestSweep_shouldSendDigestToResolvedRecipients() {
        UUID tenantId = UUID.randomUUID();
        Restaurant tenant = new Restaurant();
        tenant.setName("Test Tenant");
        try {
            java.lang.reflect.Field idField = Restaurant.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(tenant, tenantId);
        } catch (ReflectiveOperationException ex) {
            throw new RuntimeException(ex);
        }

        when(restaurantRepository.findAll()).thenReturn(List.of(tenant));
        when(dailyDigestService.generate(tenantId)).thenReturn(new DailyDigestResponse(
                LocalDate.now(),
                100000,
                25000,
                5000,
                10000,
                2,
                1,
                List.of("Promote STAR items")
        ));
        when(userRepository.findActiveEmailsByTenantAndRoles(eq(tenantId), eq(List.of(UserRole.TENANT_ADMIN, UserRole.SUB_ADMIN))))
                .thenReturn(List.of("owner@dineops.com"));

        digestScheduler.runDailyDigestSweep();

        verify(emailGatewayService).send(eq("owner@dineops.com"), any(), any(), eq("daily_digest"));
        verify(emailGatewayService).send(eq("ops@dineops.com"), any(), any(), eq("daily_digest"));
    }
}
