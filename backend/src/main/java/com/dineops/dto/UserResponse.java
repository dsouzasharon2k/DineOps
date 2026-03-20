package com.dineops.dto;

import com.dineops.user.UserRole;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;
import java.util.UUID;

@Schema(description = "User profile response payload")
public record UserResponse(
        UUID id,
        UUID tenantId,
        String name,
        String email,
        String phone,
        UserRole role,
        boolean isActive,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
