package com.dineops.restaurant;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

class RestaurantServiceTest {

    @Test
    void getAllRestaurants_returnsListFromRepository() {
        RestaurantRepository repo = Mockito.mock(RestaurantRepository.class);
        com.dineops.user.UserRepository userRepository = Mockito.mock(com.dineops.user.UserRepository.class);
        RestaurantService service = new RestaurantService(repo, userRepository);

        when(repo.findAll()).thenReturn(Collections.emptyList());

        assertThat(service.getAllRestaurants()).isEmpty();
    }
}