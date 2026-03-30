package com.platterops.review;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface ReviewRepository extends JpaRepository<Review, UUID> {
    boolean existsByOrderId(UUID orderId);
    Optional<Review> findByOrderId(UUID orderId);
    Page<Review> findByTenantIdOrderByCreatedAtDesc(UUID tenantId, Pageable pageable);

    @Query("select avg(r.rating) from Review r where r.tenant.id = :tenantId")
    Double getAverageRatingByTenantId(UUID tenantId);
}
