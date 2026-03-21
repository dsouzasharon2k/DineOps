package com.dineops.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);

    @Query("SELECT u FROM User u WHERE u.deletionScheduledFor IS NOT NULL AND u.deletionScheduledFor <= :cutoff AND u.deletedAt IS NULL")
    List<User> findScheduledForDeletionBefore(@Param("cutoff") LocalDateTime cutoff);
}