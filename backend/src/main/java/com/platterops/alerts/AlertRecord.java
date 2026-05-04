package com.platterops.alerts;

import com.platterops.entity.AuditableEntity;
import com.platterops.restaurant.Restaurant;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "alerts")
@SQLRestriction("deleted_at IS NULL")
public class AlertRecord extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Restaurant tenant;

    @Column(nullable = false, length = 20)
    private String severity;

    @Column(nullable = false, length = 100)
    private String type;

    @Column(nullable = false)
    private String title;

    @Column(name = "message", nullable = false)
    private String message;

    @Column(name = "action_hint", nullable = false)
    private String actionHint;

    @Column(name = "is_read", nullable = false)
    private boolean isRead = false;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    public UUID getId() {
        return id;
    }

    public Restaurant getTenant() {
        return tenant;
    }

    public void setTenant(Restaurant tenant) {
        this.tenant = tenant;
    }

    public String getSeverity() {
        return severity;
    }

    public void setSeverity(String severity) {
        this.severity = severity;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getActionHint() {
        return actionHint;
    }

    public void setActionHint(String actionHint) {
        this.actionHint = actionHint;
    }

    public boolean isRead() {
        return isRead;
    }

    public void setRead(boolean read) {
        isRead = read;
    }

    public LocalDateTime getReadAt() {
        return readAt;
    }

    public void setReadAt(LocalDateTime readAt) {
        this.readAt = readAt;
    }
}
