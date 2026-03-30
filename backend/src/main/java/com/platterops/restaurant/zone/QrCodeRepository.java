package com.platterops.restaurant.zone;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface QrCodeRepository extends JpaRepository<QrCode, UUID> {
    Optional<QrCode> findBySourceIdentifier(String sourceIdentifier);
}
