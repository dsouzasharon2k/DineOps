package com.platterops.integration;

import com.platterops.auth.JwtUtils;
import com.platterops.restaurant.Restaurant;
import com.platterops.restaurant.RestaurantRepository;
import com.platterops.ticket.TicketCommentRepository;
import com.platterops.ticket.TicketRepository;
import com.platterops.user.User;
import com.platterops.user.UserRepository;
import com.platterops.user.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@SuppressWarnings("null")
class TicketControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private RestaurantRepository restaurantRepository;

    @Autowired
    private UserRepository userRepository;

        @Autowired
        private TicketRepository ticketRepository;

        @Autowired
        private TicketCommentRepository ticketCommentRepository;

    @MockBean
    private StringRedisTemplate stringRedisTemplate;

    @MockBean
    private RedisConnectionFactory redisConnectionFactory;

    @BeforeEach
    void setUp() {
                ticketCommentRepository.deleteAll();
                ticketRepository.deleteAll();
        userRepository.deleteAll();
        restaurantRepository.deleteAll();
    }

    @Test
    void tenantAdmin_canCreateUpdateAndCommentTicket() throws Exception {
        Restaurant tenant = createRestaurant("Tenant One");
        String token = createToken("admin1@dineops.com", UserRole.TENANT_ADMIN, tenant.getId());

        String createBody = """
                {
                  "title": "Kitchen sync broken",
                  "description": "Orders are delayed in kitchen board.",
                  "type": "ORDER_SYNC",
                  "priority": "HIGH"
                }
                """;

        String ticketId = mockMvc.perform(post("/api/v1/tickets")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Kitchen sync broken"))
                .andReturn()
                .getResponse()
                .getContentAsString()
                .replaceAll(".*\"id\":\"([^\"]+)\".*", "$1");

        mockMvc.perform(patch("/api/v1/tickets/{ticketId}/status", ticketId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{" + "\"status\":\"IN_PROGRESS\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));

        mockMvc.perform(patch("/api/v1/tickets/{ticketId}", ticketId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "assignedToEmail": "ops@dineops.com",
                                  "resolutionNotes": "Investigating websocket lag"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignedToEmail").value("ops@dineops.com"));

        mockMvc.perform(post("/api/v1/tickets/{ticketId}/comments", ticketId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{" + "\"body\":\"Please prioritize dinner rush fix.\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.body").value("Please prioritize dinner rush fix."));

        mockMvc.perform(get("/api/v1/tickets/{ticketId}/comments", ticketId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].authorEmail").value("admin1@dineops.com"));
    }

    @Test
    void tenantAdmin_cannotUpdateAnotherTenantTicket() throws Exception {
        Restaurant tenantOne = createRestaurant("Tenant One");
        Restaurant tenantTwo = createRestaurant("Tenant Two");

        String tokenTenantOne = createToken("admin1@dineops.com", UserRole.TENANT_ADMIN, tenantOne.getId());
        String tokenTenantTwo = createToken("admin2@dineops.com", UserRole.TENANT_ADMIN, tenantTwo.getId());

        String createBody = """
                {
                  "title": "POS issue",
                  "description": "POS timeout in evening",
                  "type": "BUG",
                  "priority": "MEDIUM"
                }
                """;

        String ticketId = mockMvc.perform(post("/api/v1/tickets")
                        .header("Authorization", "Bearer " + tokenTenantTwo)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString()
                .replaceAll(".*\"id\":\"([^\"]+)\".*", "$1");

        mockMvc.perform(patch("/api/v1/tickets/{ticketId}/status", ticketId)
                        .header("Authorization", "Bearer " + tokenTenantOne)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{" + "\"status\":\"CLOSED\"}"))
                .andExpect(status().isNotFound());
    }

    private Restaurant createRestaurant(String name) {
        Restaurant restaurant = new Restaurant();
        restaurant.setName(name);
        restaurant.setSlug(name.toLowerCase().replace(' ', '-'));
        restaurant.setStatus(com.platterops.restaurant.RestaurantStatus.ACTIVE);
        restaurant.setDefaultPrepTimeMinutes(20);
        restaurant.setGstRateNonAcPercent(5);
        restaurant.setGstRateAcPercent(18);
        return restaurantRepository.save(restaurant);
    }

    private String createToken(String email, UserRole role, UUID tenantId) {
        User user = new User();
        user.setName(email);
        user.setEmail(email);
        user.setPasswordHash("hash");
        user.setRole(role);
        user.setActive(true);
        user.setTenant(restaurantRepository.findById(tenantId).orElse(null));
        User saved = userRepository.save(user);
        return jwtUtils.generateAccessToken(saved.getId(), saved.getEmail(), saved.getRole().name(), tenantId);
    }
}
