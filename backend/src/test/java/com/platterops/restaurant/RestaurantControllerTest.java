package com.platterops.restaurant;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@SuppressWarnings("null")
class RestaurantControllerTest {

    @Test
    void getAllRestaurants_returnsOkWithBody() {
        RestaurantService service = mock(RestaurantService.class);
        Page<com.platterops.dto.RestaurantResponse> emptyPage =
                new PageImpl<>(Collections.emptyList(), PageRequest.of(0, 20), 0);
        when(service.getRestaurantResponsePage(0, 20)).thenReturn(emptyPage);

        RestaurantController controller = new RestaurantController(service);

        ResponseEntity<?> response = controller.getAllRestaurants(0, 20);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isInstanceOf(com.platterops.dto.PageResponse.class);
    }
}