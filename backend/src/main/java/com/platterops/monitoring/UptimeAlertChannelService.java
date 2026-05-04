package com.platterops.monitoring;

import com.platterops.notification.EmailGatewayService;
import com.platterops.notification.SmsGatewayService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Arrays;
import java.util.List;

@Service
public class UptimeAlertChannelService {
    private static final Logger log = LoggerFactory.getLogger(UptimeAlertChannelService.class);

    private final EmailGatewayService emailGatewayService;
    private final SmsGatewayService smsGatewayService;
    private final String slackWebhookUrl;
    private final List<String> emailRecipients;
    private final List<String> whatsappRecipients;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    public UptimeAlertChannelService(
            EmailGatewayService emailGatewayService,
            SmsGatewayService smsGatewayService,
            @Value("${app.uptime.alerts.slack-webhook-url:}") String slackWebhookUrl,
            @Value("${app.uptime.alerts.email-recipients:}") String emailRecipients,
            @Value("${app.uptime.alerts.whatsapp-recipients:}") String whatsappRecipients
    ) {
        this.emailGatewayService = emailGatewayService;
        this.smsGatewayService = smsGatewayService;
        this.slackWebhookUrl = slackWebhookUrl;
        this.emailRecipients = splitRecipients(emailRecipients);
        this.whatsappRecipients = splitRecipients(whatsappRecipients);
    }

    public void sendDownAlert(String targetName, String targetUrl, String reason) {
        String title = "DineOps Uptime Alert: " + targetName + " is DOWN";
        String body = "Target: " + targetName + "\nURL: " + targetUrl + "\nReason: " + reason;
        dispatch(title, body);
    }

    public void sendRecoveryAlert(String targetName, String targetUrl) {
        String title = "DineOps Uptime Recovery: " + targetName + " is UP";
        String body = "Target: " + targetName + "\nURL: " + targetUrl + "\nStatus: recovered";
        dispatch(title, body);
    }

    private void dispatch(String title, String body) {
        for (String to : emailRecipients) {
            emailGatewayService.send(to, title, body, "uptime_alert");
        }

        for (String phone : whatsappRecipients) {
            smsGatewayService.sendWhatsAppAlert(phone, title + "\n" + body);
        }

        sendSlack(title, body);
    }

    private void sendSlack(String title, String body) {
        if (slackWebhookUrl == null || slackWebhookUrl.isBlank()) {
            return;
        }
        try {
            String payload = "{\"text\":\"" + escapeJson(title + "\n" + body) + "\"}";
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(slackWebhookUrl))
                    .timeout(Duration.ofSeconds(8))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            log.info("uptime_slack_alert_sent status={}", response.statusCode());
        } catch (Exception ex) {
            log.warn("uptime_slack_alert_failed reason={}", ex.getMessage());
        }
    }

    private List<String> splitRecipients(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(v -> !v.isBlank())
                .toList();
    }

    private String escapeJson(String text) {
        return text
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n");
    }
}
