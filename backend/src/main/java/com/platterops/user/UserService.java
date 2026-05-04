package com.platterops.user;

import com.platterops.exception.EntityNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
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

    public User updateUser(User user) {
        return userRepository.save(user);
    }

    public void updatePassword(User user, String newRawPassword) {
        user.setPasswordHash(passwordEncoder.encode(newRawPassword));
        revokeAllSessions(user);
        userRepository.save(user);
    }

    public void storeRefreshToken(User user, String rawRefreshToken) {
        user.setRefreshTokenHash(sha256Hex(rawRefreshToken));
        userRepository.save(user);
    }

    public boolean isRefreshTokenCurrent(User user, String rawRefreshToken) {
        if (user.getRefreshTokenHash() == null || rawRefreshToken == null) {
            return false;
        }
        String providedHash = sha256Hex(rawRefreshToken);
        return MessageDigest.isEqual(
                user.getRefreshTokenHash().getBytes(StandardCharsets.UTF_8),
                providedHash.getBytes(StandardCharsets.UTF_8)
        );
    }

    public void revokeAllSessions(User user) {
        int current = user.getTokenVersion() == null ? 0 : user.getTokenVersion();
        user.setTokenVersion(current + 1);
        user.setRefreshTokenHash(null);
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public Optional<User> findByPhone(String phone) {
        return userRepository.findByPhone(phone);
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

    private String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}