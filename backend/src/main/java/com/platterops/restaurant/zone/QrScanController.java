package com.platterops.restaurant.zone;

import com.platterops.exception.EntityNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Public endpoint hit when a customer scans a zone-aware QR code.
 * Returns the tenant + zone context so the frontend can redirect to the correct menu URL.
 * No authentication required.
 */
@RestController
@RequestMapping("/api/v1/qr-scan")
public class QrScanController {

    private final QrCodeRepository qrCodeRepository;

    public QrScanController(QrCodeRepository qrCodeRepository) {
        this.qrCodeRepository = qrCodeRepository;
    }

    @GetMapping("/{sourceIdentifier}")
    public QrScanResponse resolve(@PathVariable String sourceIdentifier) {
        QrCode qrCode = qrCodeRepository.findBySourceIdentifier(sourceIdentifier)
                .orElseThrow(() -> new EntityNotFoundException("QR Code not found"));

        UUID tenantId = qrCode.getDiningZone().getTenant().getId();
        UUID zoneId = qrCode.getDiningZone().getId();
        Integer tableNumber = qrCode.getTableNumber();

        return new QrScanResponse(tenantId, zoneId, tableNumber);
    }

    public record QrScanResponse(UUID tenantId, UUID zoneId, Integer tableNumber) {}
}
