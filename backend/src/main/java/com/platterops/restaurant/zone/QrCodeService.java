package com.platterops.restaurant.zone;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;

@Service
public class QrCodeService {

    @Value("${app.frontend-base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    public byte[] generateQrCodeImage(String content, int width, int height) throws Exception {
        QRCodeWriter qrCodeWriter = new QRCodeWriter();
        BitMatrix bitMatrix = qrCodeWriter.encode(content, BarcodeFormat.QR_CODE, width, height);

        ByteArrayOutputStream pngOutputStream = new ByteArrayOutputStream();
        MatrixToImageWriter.writeToStream(bitMatrix, "PNG", pngOutputStream);
        return pngOutputStream.toByteArray();
    }

    /**
     * Builds the customer-facing URL encoded into the QR code.
     * The sourceIdentifier is the unique token stored in qr_codes.source_identifier.
     * Customers scanning this QR land on the public menu page with the zone context resolved server-side.
     */
    public String buildQrUrl(String sourceIdentifier) {
        String base = frontendBaseUrl.endsWith("/") ? frontendBaseUrl.substring(0, frontendBaseUrl.length() - 1) : frontendBaseUrl;
        return base + "/menu/scan/" + sourceIdentifier;
    }
}
