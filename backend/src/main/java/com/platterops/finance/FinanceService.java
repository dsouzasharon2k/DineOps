package com.platterops.finance;

import com.platterops.dto.CreateExpenseEntryRequest;
import com.platterops.dto.ExpenseEntryResponse;
import com.platterops.dto.FinanceSummaryResponse;
import com.platterops.dto.UpdateExpenseEntryRequest;
import com.platterops.exception.EntityNotFoundException;
import com.platterops.restaurant.Restaurant;
import com.platterops.restaurant.RestaurantRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class FinanceService {

    private final ExpenseEntryRepository expenseEntryRepository;
    private final RestaurantRepository restaurantRepository;

    public FinanceService(ExpenseEntryRepository expenseEntryRepository, RestaurantRepository restaurantRepository) {
        this.expenseEntryRepository = expenseEntryRepository;
        this.restaurantRepository = restaurantRepository;
    }

    public ExpenseEntryResponse createExpense(CreateExpenseEntryRequest request) {
        Restaurant tenant = restaurantRepository.findById(request.tenantId())
                .orElseThrow(() -> new EntityNotFoundException("Restaurant not found"));

        ExpenseEntry entry = new ExpenseEntry();
        entry.setTenant(tenant);
        entry.setExpenseDate(request.expenseDate());
        entry.setCategory(request.category().trim());
        entry.setAmount(request.amount());
        entry.setNotes(trimToNull(request.notes()));
        return toResponse(expenseEntryRepository.save(entry));
    }

    public Page<ExpenseEntryResponse> listExpenses(UUID tenantId, LocalDate fromDate, LocalDate toDate, Pageable pageable) {
        Page<ExpenseEntry> page;
        if (fromDate != null && toDate != null) {
            page = expenseEntryRepository.findByTenantIdAndExpenseDateBetweenOrderByExpenseDateDescCreatedAtDesc(
                    tenantId,
                    fromDate,
                    toDate,
                    pageable
            );
        } else {
            page = expenseEntryRepository.findByTenantIdOrderByExpenseDateDescCreatedAtDesc(tenantId, pageable);
        }
        return page.map(this::toResponse);
    }

    public ExpenseEntryResponse updateExpense(UUID expenseId, UUID tenantId, UpdateExpenseEntryRequest request) {
        ExpenseEntry entry = expenseEntryRepository.findByIdAndTenantId(expenseId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense not found"));

        entry.setExpenseDate(request.expenseDate());
        entry.setCategory(request.category().trim());
        entry.setAmount(request.amount());
        entry.setNotes(trimToNull(request.notes()));
        return toResponse(expenseEntryRepository.save(entry));
    }

    public void deleteExpense(UUID expenseId, UUID tenantId) {
        ExpenseEntry entry = expenseEntryRepository.findByIdAndTenantId(expenseId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Expense not found"));
        entry.setDeletedAt(java.time.LocalDateTime.now());
        expenseEntryRepository.save(entry);
    }

    public FinanceSummaryResponse getSummary(UUID tenantId, LocalDate fromDate, LocalDate toDate) {
        LocalDate from = fromDate != null ? fromDate : LocalDate.now().minusDays(29);
        LocalDate to = toDate != null ? toDate : LocalDate.now();
        if (to.isBefore(from)) {
            throw new IllegalArgumentException("toDate must be on or after fromDate");
        }

        List<ExpenseEntry> entries = expenseEntryRepository
                .findByTenantIdAndExpenseDateBetweenOrderByExpenseDateAsc(tenantId, from, to);

        long total = 0L;
        Map<LocalDate, Long> byDay = new HashMap<>();
        Map<String, Long> byCategory = new HashMap<>();

        LocalDate current = from;
        while (!current.isAfter(to)) {
            byDay.put(current, 0L);
            current = current.plusDays(1);
        }

        for (ExpenseEntry entry : entries) {
            long amount = entry.getAmount() == null ? 0L : entry.getAmount();
            total += amount;
            byDay.put(entry.getExpenseDate(), byDay.getOrDefault(entry.getExpenseDate(), 0L) + amount);
            String category = entry.getCategory() == null || entry.getCategory().isBlank()
                    ? "OTHER"
                    : entry.getCategory().trim();
            byCategory.put(category, byCategory.getOrDefault(category, 0L) + amount);
        }

        List<FinanceSummaryResponse.DailyExpenseTotal> daily = byDay.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> new FinanceSummaryResponse.DailyExpenseTotal(e.getKey(), e.getValue()))
                .toList();

        List<FinanceSummaryResponse.CategoryExpenseTotal> categories = byCategory.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .map(e -> new FinanceSummaryResponse.CategoryExpenseTotal(e.getKey(), e.getValue()))
                .toList();

        return new FinanceSummaryResponse(total, daily, categories);
    }

    private ExpenseEntryResponse toResponse(ExpenseEntry entry) {
        return new ExpenseEntryResponse(
                entry.getId(),
                entry.getTenant().getId(),
                entry.getExpenseDate(),
                entry.getCategory(),
                entry.getAmount(),
                entry.getNotes(),
                entry.getCreatedAt(),
                entry.getUpdatedAt()
        );
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
