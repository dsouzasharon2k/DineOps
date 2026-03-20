package com.dineops.review;

import com.dineops.dto.CreateReviewRequest;
import com.dineops.dto.ReviewResponse;
import com.dineops.exception.EntityNotFoundException;
import com.dineops.order.Order;
import com.dineops.order.OrderRepository;
import com.dineops.order.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final OrderRepository orderRepository;

    public ReviewService(ReviewRepository reviewRepository, OrderRepository orderRepository) {
        this.reviewRepository = reviewRepository;
        this.orderRepository = orderRepository;
    }

    public ReviewResponse createOrderReview(UUID orderId, CreateReviewRequest request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("Order not found"));

        if (order.getStatus() != OrderStatus.DELIVERED) {
            throw new IllegalArgumentException("Review can only be submitted for delivered orders.");
        }
        if (reviewRepository.existsByOrderId(orderId)) {
            throw new IllegalArgumentException("Review already submitted for this order.");
        }

        Review review = new Review();
        review.setOrder(order);
        review.setTenant(order.getTenant());
        review.setRating(request.rating());
        review.setComment(trimToNull(request.comment()));

        return toResponse(reviewRepository.save(review));
    }

    public ReviewResponse getOrderReview(UUID orderId) {
        return reviewRepository.findByOrderId(orderId)
                .map(this::toResponse)
                .orElseThrow(() -> new EntityNotFoundException("Review not found for order"));
    }

    public Page<ReviewResponse> getReviewsByTenant(UUID tenantId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Review> reviews = reviewRepository.findByTenantIdOrderByCreatedAtDesc(tenantId, pageable);
        List<ReviewResponse> content = reviews.getContent().stream().map(this::toResponse).toList();
        return new PageImpl<>(content, pageable, reviews.getTotalElements());
    }

    public double getAverageRating(UUID tenantId) {
        Double avg = reviewRepository.getAverageRatingByTenantId(tenantId);
        return avg == null ? 0.0 : avg;
    }

    private ReviewResponse toResponse(Review review) {
        return new ReviewResponse(
                review.getId(),
                review.getOrder().getId(),
                review.getTenant().getId(),
                review.getRating(),
                review.getComment(),
                review.getCreatedAt()
        );
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
