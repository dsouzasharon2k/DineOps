package com.dineops.integration;

import com.dineops.auth.JwtUtils;
import com.dineops.restaurant.RestaurantRepository;
import com.dineops.user.User;
import com.dineops.user.UserRepository;
import com.dineops.user.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@SuppressWarnings("null")
class RestaurantOnboardingIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RestaurantRepository restaurantRepository;

    @MockBean
    private StringRedisTemplate stringRedisTemplate;

    @MockBean
    private RedisConnectionFactory redisConnectionFactory;

    @BeforeEach
    void setUp() {
        restaurantRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void createRestaurant_asTenantAdmin_createsRestaurantAndLinksUser() throws Exception {
        User admin = new User();
        admin.setName("Onboarding Admin");
        admin.setEmail("admin@dineops.com");
        admin.setPasswordHash("hash");
        admin.setRole(UserRole.TENANT_ADMIN);
        admin.setActive(true);
        User savedAdmin = userRepository.save(admin);

        String token = jwtUtils.generateAccessToken(
                savedAdmin.getId(),
                savedAdmin.getEmail(),
                savedAdmin.getRole().name(),
                null
        );

        mockMvc.perform(post("/api/v1/restaurants")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Spice Route",
                                  "address": "MG Road",
                                  "phone": "9999999999",
                                  "cuisineType": "Indian"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Spice Route"))
                .andExpect(jsonPath("$.slug").value("spice-route"));

        User updatedAdmin = userRepository.findByEmail("admin@dineops.com").orElseThrow();
        assertThat(updatedAdmin.getTenant()).isNotNull();
        assertThat(updatedAdmin.getTenant().getId()).isNotNull();
    }
}
