package com.dineops.restaurant;

import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class RestaurantControllerTest {

    @Test
    void getAllRestaurants_returnsOkWithBody() {
        RestaurantService service = mock(RestaurantService.class);
        when(service.getAllRestaurants()).thenReturn(Collections.emptyList());

        RestaurantController controller = new RestaurantController(service);

        ResponseEntity<?> response = controller.getAllRestaurants();

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isInstanceOf(java.util.List.class);
    }
}