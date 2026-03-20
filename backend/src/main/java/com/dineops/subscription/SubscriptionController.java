package com.dineops.subscription;

import com.dineops.dto.StartSubscriptionRequest;
import com.dineops.dto.SubscriptionResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/subscriptions")
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    public SubscriptionController(SubscriptionService subscriptionService) {
        this.subscriptionService = subscriptionService;
    }

    @GetMapping
    public ResponseEntity<SubscriptionResponse> getCurrent(@RequestParam UUID tenantId) {
        SubscriptionResponse response = subscriptionService.getCurrentByTenant(tenantId);
        if (response == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/checkout")
    public ResponseEntity<SubscriptionResponse> startSubscription(
            @RequestBody @Valid StartSubscriptionRequest request
    ) {
        return ResponseEntity.status(201).body(subscriptionService.startSubscription(request));
    }
}
