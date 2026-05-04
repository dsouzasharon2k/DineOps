package com.platterops.monitoring;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class UptimeMonitorService {
    private static final Logger log = LoggerFactory.getLogger(UptimeMonitorService.class);

    private final boolean enabled;
    private final String backendHealthUrl;
    private final String frontendUrl;
    private final long cooldownMinutes;
    private final UptimeAlertChannelService alertChannelService;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    private final Map<String, Boolean> downState = new LinkedHashMap<>();
    private final Map<String, Instant> lastAlertAt = new LinkedHashMap<>();

    public UptimeMonitorService(
            UptimeAlertChannelService alertChannelService,
            @Value("${app.uptime.enabled:false}") boolean enabled,
            @Value("${app.uptime.targets.backend-health-url:http://localhost:8080/actuator/health}") String backendHealthUrl,
            @Value("${app.uptime.targets.frontend-url:http://localhost:5173/}") String frontendUrl,
            @Value("${app.uptime.alerts.cooldown-minutes:30}") long cooldownMinutes
    ) {
        this.alertChannelService = alertChannelService;
        this.enabled = enabled;
        this.backendHealthUrl = backendHealthUrl;
        this.frontendUrl = frontendUrl;
        this.cooldownMinutes = Math.max(1L, cooldownMinutes);
    }

    @Scheduled(cron = "${app.uptime.check-cron:0 */5 * * * *}")
    public void runChecks() {
        if (!enabled) {
            return;
        }
        checkTarget("backend-health", backendHealthUrl, true);
        checkTarget("frontend", frontendUrl, false);
    }

    private void checkTarget(String name, String url, boolean requireUpInBody) {
        HealthResult result = ping(url, requireUpInBody);
        boolean wasDown = downState.getOrDefault(name, false);

        if (!result.ok()) {
            downState.put(name, true);
            if (!wasDown && isCooldownElapsed(name)) {
                lastAlertAt.put(name, Instant.now());
                alertChannelService.sendDownAlert(name, url, result.reason());
            }
            log.warn("uptime_check_failed target={} url={} reason={}", name, url, result.reason());
            return;
        }

        downState.put(name, false);
        if (wasDown) {
            alertChannelService.sendRecoveryAlert(name, url);
        }
        log.info("uptime_check_ok target={} url={}", name, url);
    }

    private HealthResult ping(String url, boolean requireUpInBody) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(8))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() < 200 || response.statusCode() >= 400) {
                return new HealthResult(false, "HTTP " + response.statusCode());
            }
            if (requireUpInBody && (response.body() == null || !response.body().contains("\"UP\""))) {
                return new HealthResult(false, "Health payload does not contain UP.");
            }
            return new HealthResult(true, "ok");
        } catch (Exception ex) {
            return new HealthResult(false, ex.getMessage() == null ? "Unknown error" : ex.getMessage());
        }
    }

    private boolean isCooldownElapsed(String name) {
        Instant last = lastAlertAt.get(name);
        if (last == null) {
            return true;
        }
        return last.plus(Duration.ofMinutes(cooldownMinutes)).isBefore(Instant.now());
    }

    private record HealthResult(boolean ok, String reason) {}
}
