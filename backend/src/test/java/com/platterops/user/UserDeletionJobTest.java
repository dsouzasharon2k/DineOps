package com.platterops.user;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SuppressWarnings("null")
class UserDeletionJobTest {

    private UserRepository userRepository;
    private UserDeletionJob userDeletionJob;

    @BeforeEach
    void setUp() {
        userRepository = Mockito.mock(UserRepository.class);
        userDeletionJob = new UserDeletionJob(userRepository);
    }

    @Test
    void processScheduledDeletions_anonymizesAndSoftDeletesScheduledUsers() {
        UUID userId = UUID.randomUUID();
        User user = new User();
        try {
            java.lang.reflect.Field idField = User.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(user, userId);
        } catch (ReflectiveOperationException ex) {
            throw new RuntimeException(ex);
        }
        user.setName("John Doe");
        user.setEmail("john@example.com");
        user.setPhone("+919876543210");
        user.setPasswordHash("hashed");
        user.setDeletionScheduledFor(LocalDateTime.now().minusDays(1));

        when(userRepository.findScheduledForDeletionBefore(any(LocalDateTime.class)))
                .thenReturn(List.of(user));

        userDeletionJob.processScheduledDeletions();

        ArgumentCaptor<User> savedUser = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(savedUser.capture());

        User anonymized = savedUser.getValue();
        assertEquals("Deleted User", anonymized.getName());
        assertEquals("deleted_" + userId + "@anon.local", anonymized.getEmail());
        assertNull(anonymized.getPhone());
        assertNull(anonymized.getPasswordHash());
        assertEquals(userId, anonymized.getId());
        assertNotNull(anonymized.getDeletedAt());
    }

    @Test
    void processScheduledDeletions_handlesEmptyList() {
        when(userRepository.findScheduledForDeletionBefore(any(LocalDateTime.class)))
                .thenReturn(List.of());

        userDeletionJob.processScheduledDeletions();

        verify(userRepository).findScheduledForDeletionBefore(any(LocalDateTime.class));
        verify(userRepository, Mockito.never()).save(any(User.class));
    }

    @Test
    void processScheduledDeletions_processesMultipleUsers() {
        UUID userId1 = UUID.randomUUID();
        UUID userId2 = UUID.randomUUID();
        User user1 = new User();
        User user2 = new User();
        try {
            java.lang.reflect.Field idField = User.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(user1, userId1);
            idField.set(user2, userId2);
        } catch (ReflectiveOperationException ex) {
            throw new RuntimeException(ex);
        }
        user1.setName("Alice");
        user1.setEmail("alice@example.com");
        user1.setDeletionScheduledFor(LocalDateTime.now().minusHours(1));
        user2.setName("Bob");
        user2.setEmail("bob@example.com");
        user2.setDeletionScheduledFor(LocalDateTime.now().minusHours(2));

        when(userRepository.findScheduledForDeletionBefore(any(LocalDateTime.class)))
                .thenReturn(List.of(user1, user2));

        userDeletionJob.processScheduledDeletions();

        verify(userRepository, Mockito.times(2)).save(any(User.class));
    }
}
