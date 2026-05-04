package com.platterops.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateVendorRequest(
        @NotBlank(message = "vendorName is required") String vendorName,
        String contactPerson,
        String phoneNumber,
        String category,
        String address,
        String notes
) {}
