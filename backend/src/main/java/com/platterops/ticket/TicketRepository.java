package com.platterops.ticket;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface TicketRepository extends JpaRepository<Ticket, UUID> {
    Page<Ticket> findByTenantIdOrderByCreatedAtDesc(UUID tenantId, Pageable pageable);
    Page<Ticket> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Optional<Ticket> findByIdAndTenantId(UUID id, UUID tenantId);
}
