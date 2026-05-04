package com.platterops.alerts;

import com.platterops.dto.DailyDigestResponse;
import com.platterops.notification.EmailGatewayService;
import com.platterops.restaurant.Restaurant;
import com.platterops.restaurant.RestaurantRepository;
import com.platterops.user.UserRepository;
import com.platterops.user.UserRole;
import org.springframework.beans.factory.annotation.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Component
@ConditionalOnProperty(name = "app.digest.schedule-enabled", havingValue = "true")
public class DigestScheduler {

    private static final Logger log = LoggerFactory.getLogger(DigestScheduler.class);

    private final RestaurantRepository restaurantRepository;
    private final DailyDigestService dailyDigestService;
    private final UserRepository userRepository;
    private final EmailGatewayService emailGatewayService;
    private final String fallbackRecipients;

    public DigestScheduler(
            RestaurantRepository restaurantRepository,
            DailyDigestService dailyDigestService,
            UserRepository userRepository,
            EmailGatewayService emailGatewayService,
            @Value("${app.digest.fallback-recipients:}") String fallbackRecipients
    ) {
        this.restaurantRepository = restaurantRepository;
        this.dailyDigestService = dailyDigestService;
        this.userRepository = userRepository;
        this.emailGatewayService = emailGatewayService;
        this.fallbackRecipients = fallbackRecipients;
    }

    @Scheduled(cron = "${app.digest.cron:0 30 23 * * *}")
    public void runDailyDigestSweep() {
        for (Restaurant tenant : restaurantRepository.findAll()) {
            try {
                DailyDigestResponse digest = dailyDigestService.generate(tenant.getId());
                String subject = "Daily Digest - " + tenant.getName() + " - " + digest.date();
                String body = buildDigestBody(tenant, digest);
                List<String> recipients = resolveRecipients(tenant.getId());
                if (recipients.isEmpty()) {
                    log.warn("daily_digest_no_recipients tenantId={} date={}", tenant.getId(), digest.date());
                }
                for (String recipient : recipients) {
                    emailGatewayService.send(recipient, subject, body, "daily_digest");
                }
                log.info(
                        "daily_digest tenantId={} date={} revenue={} profit={} expenses={} alerts={} openTickets={}",
                        tenant.getId(),
                        digest.date(),
                        digest.todaysRevenue(),
                        digest.todaysProfit(),
                        digest.todaysExpenses(),
                        digest.activeAlerts(),
                        digest.openTickets()
                );
            } catch (Exception ex) {
                log.error("daily_digest_failed tenantId={} reason={}", tenant.getId(), ex.getMessage());
            }
        }
    }

    private List<String> resolveRecipients(java.util.UUID tenantId) {
        Set<String> recipients = new LinkedHashSet<>(userRepository.findActiveEmailsByTenantAndRoles(
                tenantId,
                List.of(UserRole.TENANT_ADMIN, UserRole.SUB_ADMIN)
        ));

        if (fallbackRecipients != null && !fallbackRecipients.isBlank()) {
            for (String entry : fallbackRecipients.split(",")) {
                String trimmed = entry.trim();
                if (!trimmed.isEmpty()) {
                    recipients.add(trimmed);
                }
            }
        }

        return new ArrayList<>(recipients);
    }

    private static String buildDigestBody(Restaurant tenant, DailyDigestResponse digest) {
        StringBuilder body = new StringBuilder();
        body.append("Daily digest for ").append(tenant.getName()).append("\n");
        body.append("Date: ").append(digest.date()).append("\n\n");
        body.append("Revenue: ").append(digest.todaysRevenue()).append("\n");
        body.append("Profit: ").append(digest.todaysProfit()).append("\n");
        body.append("Wastage: ").append(digest.todaysWastage()).append("\n");
        body.append("Expenses: ").append(digest.todaysExpenses()).append("\n");
        body.append("Open Tickets: ").append(digest.openTickets()).append("\n");
        body.append("Active Alerts: ").append(digest.activeAlerts()).append("\n\n");
        body.append("Top Actions:\n");
        for (String action : digest.topActions()) {
            body.append("- ").append(action).append("\n");
        }
        return body.toString();
    }
}
