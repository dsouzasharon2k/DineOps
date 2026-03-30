package com.platterops.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Service
public class SmsGatewayService {

    private static final Logger log = LoggerFactory.getLogger(SmsGatewayService.class);

    private final String provider;
    private final String senderId;
    private final String msg91AuthKey;
    private final String msg91TemplateId;
    private final String twilioAccountSid;
    private final String twilioAuthToken;
    private final String twilioFromNumber;
    private final HttpClient httpClient = HttpClient.newHttpClient();

    public SmsGatewayService(
            @Value("${app.sms.provider:mock}") String provider,
            @Value("${app.sms.sender-id:DINEOP}") String senderId,
            @Value("${app.sms.msg91.auth-key:}") String msg91AuthKey,
            @Value("${app.sms.msg91.template-id:}") String msg91TemplateId,
            @Value("${app.sms.twilio.account-sid:}") String twilioAccountSid,
            @Value("${app.sms.twilio.auth-token:}") String twilioAuthToken,
            @Value("${app.sms.twilio.from-number:}") String twilioFromNumber
    ) {
        this.provider = provider == null ? "mock" : provider.trim().toLowerCase();
        this.senderId = senderId;
        this.msg91AuthKey = msg91AuthKey;
        this.msg91TemplateId = msg91TemplateId;
        this.twilioAccountSid = twilioAccountSid;
        this.twilioAuthToken = twilioAuthToken;
        this.twilioFromNumber = twilioFromNumber;
    }

    public void sendOtp(String phone, String otp) {
        String message = "Your DineOps OTP is " + otp + ". It is valid for 5 minutes.";
        try {
            switch (provider) {
                case "msg91" -> sendViaMsg91(phone, message, otp);
                case "twilio" -> sendViaTwilio(phone, message);
                default -> log.info("sms_mock provider=mock to={} message={}", phone, message);
            }
        } catch (Exception ex) {
            log.error("sms_send_failed provider={} to={} reason={}", provider, phone, ex.getMessage());
        }
    }

    private void sendViaMsg91(String phone, String message, String otp) throws Exception {
        if (msg91AuthKey == null || msg91AuthKey.isBlank()) {
            log.warn("msg91_not_configured_missing_auth_key");
            return;
        }
        String body;
        if (msg91TemplateId != null && !msg91TemplateId.isBlank()) {
            body = "{\"template_id\":\"" + msg91TemplateId + "\",\"short_url\":\"0\",\"recipients\":[{\"mobiles\":\"91"
                    + sanitizePhone(phone) + "\",\"OTP\":\"" + otp + "\"}]}";
        } else {
            body = "{\"sender\":\"" + senderId + "\",\"route\":\"4\",\"country\":\"91\",\"sms\":[{\"message\":\""
                    + message.replace("\"", "\\\"") + "\",\"to\":[\"" + sanitizePhone(phone) + "\"]}]}";
        }
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create("https://api.msg91.com/api/v5/flow/"))
                .header("Content-Type", "application/json")
                .header("authkey", msg91AuthKey)
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
        log.info("sms_msg91_status code={} body={}", res.statusCode(), res.body());
    }

    private void sendViaTwilio(String phone, String message) throws Exception {
        if (twilioAccountSid == null || twilioAccountSid.isBlank() || twilioAuthToken == null || twilioAuthToken.isBlank()) {
            log.warn("twilio_not_configured_missing_credentials");
            return;
        }
        String endpoint = "https://api.twilio.com/2010-04-01/Accounts/" + twilioAccountSid + "/Messages.json";
        String form = "To=" + encode(phone) + "&From=" + encode(twilioFromNumber) + "&Body=" + encode(message);
        String basic = Base64.getEncoder().encodeToString((twilioAccountSid + ":" + twilioAuthToken).getBytes(StandardCharsets.UTF_8));
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(endpoint))
                .header("Authorization", "Basic " + basic)
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(form))
                .build();
        HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
        log.info("sms_twilio_status code={} body={}", res.statusCode(), res.body());
    }

    private String sanitizePhone(String phone) {
        return phone == null ? "" : phone.replaceAll("[^0-9]", "");
    }

    private String encode(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }
}
