package com.platterops.ticket;

import com.platterops.auth.TenantContext;
import com.platterops.dto.CreateTicketRequest;
import com.platterops.dto.CreateTicketCommentRequest;
import com.platterops.dto.PageResponse;
import com.platterops.dto.TicketResponse;
import com.platterops.dto.TicketCommentResponse;
import com.platterops.dto.UpdateTicketStatusRequest;
import com.platterops.dto.UpdateTicketRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tickets")
public class TicketController {

    private final TicketService ticketService;

    public TicketController(TicketService ticketService) {
        this.ticketService = ticketService;
    }

    @PostMapping
    public ResponseEntity<TicketResponse> createTicket(
            @RequestParam(required = false) UUID tenantId,
            @RequestBody @Valid CreateTicketRequest request,
            HttpServletRequest httpRequest
    ) {
        boolean isSuperAdmin = isSuperAdmin(httpRequest);
        UUID effectiveTenantId = resolveTenantForWrite(tenantId, httpRequest, isSuperAdmin);
        String createdBy = resolveCreatedBy(httpRequest);
        return ResponseEntity.status(201).body(ticketService.create(effectiveTenantId, createdBy, request));
    }

    @GetMapping
    public ResponseEntity<PageResponse<TicketResponse>> getTickets(
            @RequestParam(required = false) UUID tenantId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            HttpServletRequest httpRequest
    ) {
        boolean isSuperAdmin = isSuperAdmin(httpRequest);
        if (isSuperAdmin && tenantId == null) {
            return ResponseEntity.ok(PageResponse.from(ticketService.listAll(PageRequest.of(page, size))));
        }
        UUID effectiveTenantId = resolveTenantForRead(tenantId, httpRequest, isSuperAdmin);
        return ResponseEntity.ok(PageResponse.from(ticketService.listByTenant(effectiveTenantId, PageRequest.of(page, size))));
    }

    @PatchMapping("/{ticketId}/status")
    public ResponseEntity<TicketResponse> updateStatus(
            @PathVariable UUID ticketId,
            @RequestBody @Valid UpdateTicketStatusRequest request,
            HttpServletRequest httpRequest
    ) {
        if (!isSuperAdmin(httpRequest) && !isTenantAdmin(httpRequest)) {
            throw new AccessDeniedException("Only tenant admin or super admin can update ticket status.");
        }
        return ResponseEntity.ok(updateStatusInternal(ticketId, request.status(), httpRequest));
    }

    @PatchMapping("/{ticketId}")
    public ResponseEntity<TicketResponse> updateTicket(
            @PathVariable UUID ticketId,
            @RequestBody @Valid UpdateTicketRequest request,
            HttpServletRequest httpRequest
    ) {
        if (!isSuperAdmin(httpRequest) && !isTenantAdmin(httpRequest)) {
            throw new AccessDeniedException("Only tenant admin or super admin can update ticket workflow.");
        }
        if (isSuperAdmin(httpRequest)) {
            return ResponseEntity.ok(ticketService.update(ticketId, request));
        }
        UUID authTenantId = TenantContext.getAuthenticatedTenantId(httpRequest)
                .orElseThrow(() -> new AccessDeniedException("Tenant context missing in token."));
        ticketService.getByIdAndTenant(ticketId, authTenantId);
        return ResponseEntity.ok(ticketService.update(ticketId, request));
    }

    @PostMapping("/{ticketId}/comments")
    public ResponseEntity<TicketCommentResponse> addComment(
            @PathVariable UUID ticketId,
            @RequestBody @Valid CreateTicketCommentRequest request,
            HttpServletRequest httpRequest
    ) {
        String author = resolveCreatedBy(httpRequest);
        if (isSuperAdmin(httpRequest)) {
            return ResponseEntity.status(201).body(ticketService.addComment(ticketId, author, request));
        }
        UUID authTenantId = TenantContext.getAuthenticatedTenantId(httpRequest)
                .orElseThrow(() -> new AccessDeniedException("Tenant context missing in token."));
        return ResponseEntity.status(201).body(ticketService.addComment(ticketId, authTenantId, author, request));
    }

    @GetMapping("/{ticketId}/comments")
    public ResponseEntity<java.util.List<TicketCommentResponse>> getComments(
            @PathVariable UUID ticketId,
            HttpServletRequest httpRequest
    ) {
        if (isSuperAdmin(httpRequest)) {
            return ResponseEntity.ok(ticketService.listComments(ticketId));
        }
        UUID authTenantId = TenantContext.getAuthenticatedTenantId(httpRequest)
                .orElseThrow(() -> new AccessDeniedException("Tenant context missing in token."));
        return ResponseEntity.ok(ticketService.listComments(ticketId, authTenantId));
    }

    private TicketResponse updateStatusInternal(UUID ticketId, TicketStatus nextStatus, HttpServletRequest request) {
        if (isSuperAdmin(request)) {
            return ticketService.updateStatus(ticketId, nextStatus);
        }
        UUID authTenantId = TenantContext.getAuthenticatedTenantId(request)
                .orElseThrow(() -> new AccessDeniedException("Tenant context missing in token."));
        ticketService.getByIdAndTenant(ticketId, authTenantId);
        return ticketService.updateStatus(ticketId, nextStatus);
    }

    private static UUID resolveTenantForWrite(UUID requestedTenantId, HttpServletRequest request, boolean isSuperAdmin) {
        if (isSuperAdmin) {
            if (requestedTenantId == null) {
                throw new IllegalArgumentException("tenantId is required for super admin ticket creation.");
            }
            return requestedTenantId;
        }
        return TenantContext.getAuthenticatedTenantId(request)
                .orElseThrow(() -> new AccessDeniedException("Tenant context missing in token."));
    }

    private static UUID resolveTenantForRead(UUID requestedTenantId, HttpServletRequest request, boolean isSuperAdmin) {
        if (isSuperAdmin) {
            return requestedTenantId;
        }
        UUID authTenantId = TenantContext.getAuthenticatedTenantId(request)
                .orElseThrow(() -> new AccessDeniedException("Tenant context missing in token."));
        if (requestedTenantId != null && !requestedTenantId.equals(authTenantId)) {
            throw new AccessDeniedException("Cannot read tickets for another tenant.");
        }
        return authTenantId;
    }

    private static boolean isSuperAdmin(HttpServletRequest request) {
        return TenantContext.getAuthenticatedRole(request)
                .map("SUPER_ADMIN"::equals)
                .orElse(false);
    }

    private static boolean isTenantAdmin(HttpServletRequest request) {
        return TenantContext.getAuthenticatedRole(request)
                .map("TENANT_ADMIN"::equals)
                .orElse(false);
    }

    private static String resolveCreatedBy(HttpServletRequest request) {
        if (request.getUserPrincipal() != null && request.getUserPrincipal().getName() != null) {
            return request.getUserPrincipal().getName();
        }
        return "unknown@user";
    }
}
