package com.platterops.user;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Scheduled job that processes user data deletion requests.
 * Runs daily at 2 AM to anonymize PII and soft-delete users whose
 * deletion_scheduled_for date has passed. Supports DPDP (India's Digital
 * Personal Data Protection Act) right-to-erasure compliance.
 */
@Component
public class UserDeletionJob {

    private static final Logger log = LoggerFactory.getLogger(UserDeletionJob.class);

    private final UserRepository userRepository;

    public UserDeletionJob(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Scheduled(cron = "0 0 2 * * *") // 2 AM daily
    public void processScheduledDeletions() {
        LocalDateTime cutoff = LocalDateTime.now();
        List<User> users = userRepository.findScheduledForDeletionBefore(cutoff);

        for (User user : users) {
            user.setName("Deleted User");
            user.setEmail("deleted_" + user.getId() + "@anon.local");
            user.setPhone(null);
            user.setPasswordHash(null);
            user.setDeletedAt(cutoff);
            userRepository.save(user);
            log.info("user_deleted userId={}", user.getId());
        }
    }
}
