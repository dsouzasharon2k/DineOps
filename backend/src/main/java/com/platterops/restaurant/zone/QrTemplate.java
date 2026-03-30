package com.platterops.restaurant.zone;

import com.platterops.entity.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "qr_templates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QrTemplate extends AuditableEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private java.util.UUID id;

    @Column(nullable = false)
    private String name;
    
    @Column(nullable = false)
    private String htmlContent; // Handlebars or simple HTML template
    
    private String cssContent;
    
    @Builder.Default
    private boolean isPublic = false;
    
    @Column(name = "tenant_id")
    private java.util.UUID tenantId; // Custom templates for specific restaurants
}
