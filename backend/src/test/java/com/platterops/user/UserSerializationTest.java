package com.platterops.user;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class UserSerializationTest {

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @Test
    void serializeUser_doesNotExposePasswordHash() throws Exception {
        User user = new User();
        user.setName("Test User");
        user.setEmail("test@dineops.com");
        user.setPasswordHash("$2a$10$very.fake.hash.value.for.test");
        user.setRole(UserRole.CUSTOMER);

        String json = objectMapper.writeValueAsString(user);

        assertThat(json).doesNotContain("passwordHash");
        assertThat(json).doesNotContain("very.fake.hash.value.for.test");
    }
}
