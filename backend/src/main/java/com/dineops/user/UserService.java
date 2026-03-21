package com.dineops.user;

import com.dineops.exception.EntityNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Service
@SuppressWarnings("null")
public class UserService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, BCryptPasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public User createUser(User user, String rawPassword) {
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        return userRepository.save(user);
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public boolean checkPassword(String rawPassword, String storedHash) {
        return passwordEncoder.matches(rawPassword, storedHash);
    }

    /**
     * Schedules user for deletion (7-day grace period). The UserDeletionJob will
     * anonymize PII and soft-delete when deletion_scheduled_for is reached.
     */
    public User deactivateAndAnonymizeByEmail(String email) {
        String safeEmail = Objects.requireNonNull(email, "email cannot be null");
        User user = userRepository.findByEmail(safeEmail)
                .orElseThrow(() -> new EntityNotFoundException("Authenticated user not found."));
        scheduleDeletion(user);
        return Objects.requireNonNull(userRepository.save(user));
    }

    /**
     * Immediately anonymizes and soft-deletes (admin action).
     */
    public User deactivateAndAnonymizeById(UUID userId) {
        UUID safeUserId = Objects.requireNonNull(userId, "userId cannot be null");
        User user = userRepository.findById(safeUserId)
                .orElseThrow(() -> new EntityNotFoundException("User not found."));
        applyImmediateDeletion(user);
        return Objects.requireNonNull(userRepository.save(user));
    }

    private void scheduleDeletion(User user) {
        LocalDateTime now = LocalDateTime.now();
        user.setActive(false);
        user.setDeletionRequestedAt(now);
        user.setDeletionScheduledFor(now.plusDays(7));
    }

    private void applyImmediateDeletion(User user) {
        LocalDateTime now = LocalDateTime.now();
        user.setActive(false);
        user.setDeletionRequestedAt(now);
        user.setDeletionScheduledFor(now);
        user.setName("Deleted User");
        user.setPhone(null);
        user.setEmail("deleted_" + user.getId() + "@anon.local");
        user.setPasswordHash(null);
        user.setDeletedAt(now);
    }
}