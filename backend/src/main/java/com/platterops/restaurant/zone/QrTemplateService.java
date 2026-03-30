package com.platterops.restaurant.zone;

import com.platterops.exception.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class QrTemplateService {

    private final QrTemplateRepository qrTemplateRepository;

    public QrTemplateService(QrTemplateRepository qrTemplateRepository) {
        this.qrTemplateRepository = qrTemplateRepository;
    }

    public List<QrTemplate> getAvailableTemplates(UUID tenantId) {
        return qrTemplateRepository.findAvailableTemplates(tenantId);
    }

    public QrTemplate getTemplate(UUID templateId) {
        return qrTemplateRepository.findById(templateId)
                .orElseThrow(() -> new EntityNotFoundException("Template not found"));
    }

    @Transactional
    public QrTemplate createTemplate(QrTemplate template) {
        return qrTemplateRepository.save(template);
    }
}
