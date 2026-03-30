package com.platterops.restaurant;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

class RestaurantServiceTest {

    @Test
    void getAllRestaurants_returnsListFromRepository() {
        RestaurantRepository repo = Mockito.mock(RestaurantRepository.class);
        com.platterops.user.UserRepository userRepository = Mockito.mock(com.platterops.user.UserRepository.class);
        com.platterops.review.ReviewService reviewService = Mockito.mock(com.platterops.review.ReviewService.class);
        RestaurantService service = new RestaurantService(repo, userRepository, reviewService);

        when(repo.findAll()).thenReturn(Collections.emptyList());

        assertThat(service.getAllRestaurants()).isEmpty();
    }
}