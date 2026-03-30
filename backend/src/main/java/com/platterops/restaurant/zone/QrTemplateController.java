package com.platterops.restaurant.zone;

import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;
import java.util.Objects;

@RestController
@RequestMapping("/api/v1/restaurants/{tenantId}/qr-templates")
public class QrTemplateController {

    private final QrTemplateService qrTemplateService;

    public QrTemplateController(QrTemplateService qrTemplateService) {
        this.qrTemplateService = qrTemplateService;
    }

    @GetMapping
    public List<QrTemplate> getTemplates(@PathVariable UUID tenantId) {
        return qrTemplateService.getAvailableTemplates(tenantId);
    }

    @PostMapping
    public QrTemplate createTemplate(@PathVariable UUID tenantId, @RequestBody QrTemplate template) {
        template.setTenantId(tenantId);
        return qrTemplateService.createTemplate(template);
    }
}
