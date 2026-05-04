package com.platterops.finance;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExpenseEntryRepository extends JpaRepository<ExpenseEntry, UUID> {
    Page<ExpenseEntry> findByTenantIdOrderByExpenseDateDescCreatedAtDesc(UUID tenantId, Pageable pageable);

    Page<ExpenseEntry> findByTenantIdAndExpenseDateBetweenOrderByExpenseDateDescCreatedAtDesc(
            UUID tenantId,
            LocalDate fromDate,
            LocalDate toDate,
            Pageable pageable
    );

    List<ExpenseEntry> findByTenantIdAndExpenseDateBetweenOrderByExpenseDateAsc(UUID tenantId, LocalDate fromDate, LocalDate toDate);

    Optional<ExpenseEntry> findByIdAndTenantId(UUID id, UUID tenantId);
}
