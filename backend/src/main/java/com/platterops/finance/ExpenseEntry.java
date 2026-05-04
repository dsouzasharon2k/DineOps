package com.platterops.finance;

import com.platterops.entity.AuditableEntity;
import com.platterops.restaurant.Restaurant;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "expense_entries")
@SQLRestriction("deleted_at IS NULL")
public class ExpenseEntry extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Restaurant tenant;

    @Column(name = "expense_date", nullable = false)
    private LocalDate expenseDate;

    @Column(name = "category", nullable = false, length = 60)
    private String category;

    @Column(name = "amount", nullable = false)
    private Long amount;

    @Column(name = "notes", length = 500)
    private String notes;

    public UUID getId() {
        return id;
    }

    public Restaurant getTenant() {
        return tenant;
    }

    public void setTenant(Restaurant tenant) {
        this.tenant = tenant;
    }

    public LocalDate getExpenseDate() {
        return expenseDate;
    }

    public void setExpenseDate(LocalDate expenseDate) {
        this.expenseDate = expenseDate;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public Long getAmount() {
        return amount;
    }

    public void setAmount(Long amount) {
        this.amount = amount;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
