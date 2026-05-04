package com.platterops.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailGatewayService {

    private static final Logger log = LoggerFactory.getLogger(EmailGatewayService.class);

    private final JavaMailSender mailSender;
    private final String provider;
    private final String fromAddress;

    public EmailGatewayService(
            @Autowired(required = false) JavaMailSender mailSender,
            @Value("${app.email.provider:mock}") String provider,
            @Value("${app.email.from:no-reply@dineops.local}") String fromAddress
    ) {
        this.mailSender = mailSender;
        this.provider = provider;
        this.fromAddress = fromAddress;
    }

    public void send(String to, String subject, String body, String template) {
        if (to == null || to.isBlank()) {
            return;
        }

        try {
            if ("smtp".equalsIgnoreCase(provider) && mailSender != null) {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setFrom(fromAddress);
                message.setTo(to);
                message.setSubject(subject);
                message.setText(body);
                mailSender.send(message);
                log.info("email_sent provider=smtp to={} template={}", to, template);
                return;
            }

            log.info("email_mock provider={} to={} template={} subject={} body={} ", provider, to, template, subject, body);
        } catch (MailException ex) {
            log.error("email_send_failed provider={} to={} template={} reason={}", provider, to, template, ex.getMessage());
        }
    }
}
