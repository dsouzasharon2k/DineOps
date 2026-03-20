package com.dineops.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record RegisterUserRequest(
        @NotBlank(message = "Name is required") String name,
        @NotBlank(message = "Email is required")
        @Email(message = "Email must be valid")
        String email,
        @NotBlank(message = "Password is required")
        @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z]).{8,}$",
                message = "Password must be at least 8 characters and include both uppercase and lowercase letters"
        )
        String password,
        @NotBlank(message = "Phone is required") String phone
) {}
