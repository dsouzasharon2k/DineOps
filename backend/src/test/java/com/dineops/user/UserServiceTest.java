package com.dineops.user;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class UserServiceTest {

    // We mock the repository so we don't hit a real database in unit tests
    private UserRepository userRepository;
    private UserService userService;
    private BCryptPasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        // Create a fake (mock) repository before each test
        userRepository = Mockito.mock(UserRepository.class);
        passwordEncoder = new BCryptPasswordEncoder();
        userService = new UserService(userRepository, passwordEncoder);
    }

    @Test
    void createUser_shouldHashPassword() {
        // Arrange - prepare a user with no password yet
        User user = new User();
        user.setName("Sharon");
        user.setEmail("sharon@dineops.com");
        user.setRole(UserRole.TENANT_ADMIN);

        // Tell the mock: when save() is called, just return the same user back
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        // Act - call the real method we're testing
        User saved = userService.createUser(user, "plainPassword123");

        // Assert - password should now be a BCrypt hash, not plain text
        assertNotNull(saved.getPasswordHash());
        assertNotEquals("plainPassword123", saved.getPasswordHash());
        assertTrue(saved.getPasswordHash().startsWith("$2a$")); // BCrypt prefix
    }

    @Test
    void checkPassword_shouldReturnTrueForCorrectPassword() {
        // Arrange - create a user with a hashed password
        User user = new User();
        user.setEmail("sharon@dineops.com");
        user.setRole(UserRole.TENANT_ADMIN);

        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));
        User saved = userService.createUser(user, "mySecret");

        // Act + Assert - checking the correct password should return true
        assertTrue(userService.checkPassword("mySecret", saved.getPasswordHash()));
    }

    @Test
    void checkPassword_shouldReturnFalseForWrongPassword() {
        // Arrange
        User user = new User();
        user.setEmail("sharon@dineops.com");
        user.setRole(UserRole.TENANT_ADMIN);

        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));
        User saved = userService.createUser(user, "mySecret");

        // Act + Assert - wrong password should return false
        assertFalse(userService.checkPassword("wrongPassword", saved.getPasswordHash()));
    }

    @Test
    void findByEmail_shouldReturnUserWhenExists() {
        // Arrange - mock the repo to return a user for a specific email
        User user = new User();
        user.setEmail("sharon@dineops.com");
        when(userRepository.findByEmail("sharon@dineops.com")).thenReturn(Optional.of(user));

        // Act
        Optional<User> result = userService.findByEmail("sharon@dineops.com");

        // Assert
        assertTrue(result.isPresent());
        assertEquals("sharon@dineops.com", result.get().getEmail());
    }

    @Test
    void findByEmail_shouldReturnEmptyWhenNotExists() {
        // Arrange - mock the repo to return nothing
        when(userRepository.findByEmail("unknown@dineops.com")).thenReturn(Optional.empty());

        // Act
        Optional<User> result = userService.findByEmail("unknown@dineops.com");

        // Assert
        assertTrue(result.isEmpty());
    }
}