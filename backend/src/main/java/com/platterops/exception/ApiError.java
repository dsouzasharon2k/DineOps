package com.dineops.exception;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiError(
        int status,
        String errorCode,
        String message,
        Instant timestamp,
        String path,
        Map<String, String> fieldErrors
) {
    public ApiError(int status, String message, Instant timestamp, String path) {
        this(status, null, message, timestamp, path, null);
    }

    public ApiError(int status, String errorCode, String message, Instant timestamp, String path) {
        this(status, errorCode, message, timestamp, path, null);
    }
}
