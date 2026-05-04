package com.platterops.order;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateOrderDisputeRequest(
        @NotBlank @Size(max = 50) String issueType,
        @NotBlank @Size(max = 2000) String details,
        @Size(max = 120) String customerName,
        @Size(max = 30) String customerPhone
) {}
