package com.platterops.restaurant.zone;

import com.platterops.menu.MenuItemService;
import com.platterops.dto.MenuItemResponse;
import com.platterops.exception.EntityNotFoundException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/restaurants/{tenantId}/qr-codes")
public class QrCodeController {

    private final QrCodeRepository qrCodeRepository;
    private final MenuItemService menuItemService;
    private final QrCodeService qrCodeService;

    public QrCodeController(QrCodeRepository qrCodeRepository, 
                            MenuItemService menuItemService,
                            QrCodeService qrCodeService) {
        this.qrCodeRepository = qrCodeRepository;
        this.menuItemService = menuItemService;
        this.qrCodeService = qrCodeService;
    }

    @GetMapping("/{sourceIdentifier}/image")
    public ResponseEntity<byte[]> getQrImage(@PathVariable String sourceIdentifier) throws Exception {
        QrCode qrCode = qrCodeRepository.findBySourceIdentifier(sourceIdentifier)
                .orElseThrow(() -> new EntityNotFoundException("QR Code not found"));

        String url = qrCodeService.buildQrUrl(qrCode.getSourceIdentifier());
        byte[] image = qrCodeService.generateQrCodeImage(url, 300, 300);

        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_TYPE, "image/png")
                .body(image);
    }

    @GetMapping("/{sourceIdentifier}")
    public List<MenuItemResponse> getZoneAwareMenu(@PathVariable String sourceIdentifier) {
        QrCode qrCode = qrCodeRepository.findBySourceIdentifier(sourceIdentifier)
                .orElseThrow(() -> new EntityNotFoundException("QR Code not found"));

        return menuItemService.getZoneAwareItemResponses(
                qrCode.getDiningZone().getTenant().getId(),
                qrCode.getDiningZone().getId()
        );
    }
}
