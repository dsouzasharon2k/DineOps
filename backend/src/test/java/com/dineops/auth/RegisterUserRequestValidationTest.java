package com.dineops.auth;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RegisterUserRequestValidationTest {

    private Validator validator;

    @BeforeEach
    void setUp() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @Test
    void invalidEmailAndWeakPassword_shouldFailValidation() {
        RegisterUserRequest request = new RegisterUserRequest(
                "Customer",
                "not-an-email",
                "weakpass",
                "9999999999");

        Set<ConstraintViolation<RegisterUserRequest>> violations = validator.validate(request);

        assertFalse(violations.isEmpty());
        assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("email")));
        assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("password")));
    }

    @Test
    void validPayload_shouldPassValidation() {
        RegisterUserRequest request = new RegisterUserRequest(
                "Customer",
                "customer@dineops.com",
                "StrongPassA",
                "9999999999");

        Set<ConstraintViolation<RegisterUserRequest>> violations = validator.validate(request);

        assertTrue(violations.isEmpty());
    }
}
