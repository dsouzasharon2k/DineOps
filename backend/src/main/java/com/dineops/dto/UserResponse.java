package com.dineops.dto;

import com.dineops.user.UserRole;

import java.time.LocalDateTime;
import java.util.UUID;

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
