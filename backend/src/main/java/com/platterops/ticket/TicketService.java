package com.platterops.ticket;

import com.platterops.dto.CreateTicketRequest;
import com.platterops.dto.CreateTicketCommentRequest;
import com.platterops.dto.TicketResponse;
import com.platterops.dto.TicketCommentResponse;
import com.platterops.dto.UpdateTicketRequest;
import com.platterops.exception.EntityNotFoundException;
import com.platterops.restaurant.Restaurant;
import com.platterops.restaurant.RestaurantRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class TicketService {

    private final TicketRepository ticketRepository;
    private final TicketCommentRepository ticketCommentRepository;
    private final RestaurantRepository restaurantRepository;

    public TicketService(TicketRepository ticketRepository,
                         TicketCommentRepository ticketCommentRepository,
                         RestaurantRepository restaurantRepository) {
        this.ticketRepository = ticketRepository;
        this.ticketCommentRepository = ticketCommentRepository;
        this.restaurantRepository = restaurantRepository;
    }

    public TicketResponse create(UUID tenantId, String createdByEmail, CreateTicketRequest request) {
        Restaurant tenant = restaurantRepository.findById(tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Restaurant not found"));

        Ticket ticket = new Ticket();
        ticket.setTenant(tenant);
        ticket.setCreatedByEmail(createdByEmail);
        ticket.setTitle(request.title().trim());
        ticket.setDescription(request.description().trim());
        ticket.setType(request.type());
        ticket.setPriority(request.priority());
        ticket.setStatus(TicketStatus.OPEN);
        return toResponse(ticketRepository.save(ticket));
    }

    public Page<TicketResponse> listByTenant(UUID tenantId, Pageable pageable) {
        return ticketRepository.findByTenantIdOrderByCreatedAtDesc(tenantId, pageable).map(this::toResponse);
    }

    public Page<TicketResponse> listAll(Pageable pageable) {
        return ticketRepository.findAllByOrderByCreatedAtDesc(pageable).map(this::toResponse);
    }

    public TicketResponse updateStatus(UUID ticketId, TicketStatus status) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new EntityNotFoundException("Ticket not found"));
        ticket.setStatus(status);
        return toResponse(ticketRepository.save(ticket));
    }

    public TicketResponse update(UUID ticketId, UpdateTicketRequest request) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new EntityNotFoundException("Ticket not found"));
        if (request.status() != null) {
            ticket.setStatus(request.status());
        }
        if (request.priority() != null) {
            ticket.setPriority(request.priority());
        }
        if (request.assignedToEmail() != null) {
            ticket.setAssignedToEmail(request.assignedToEmail().isBlank() ? null : request.assignedToEmail().trim());
        }
        if (request.slaDueAt() != null) {
            ticket.setSlaDueAt(request.slaDueAt());
        }
        if (request.resolutionNotes() != null) {
            ticket.setResolutionNotes(request.resolutionNotes().isBlank() ? null : request.resolutionNotes().trim());
        }
        return toResponse(ticketRepository.save(ticket));
    }

    public TicketResponse getById(UUID ticketId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new EntityNotFoundException("Ticket not found"));
        return toResponse(ticket);
    }

    public TicketResponse getByIdAndTenant(UUID ticketId, UUID tenantId) {
        Ticket ticket = ticketRepository.findByIdAndTenantId(ticketId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Ticket not found"));
        return toResponse(ticket);
    }

    public TicketCommentResponse addComment(UUID ticketId, String authorEmail, CreateTicketCommentRequest request) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new EntityNotFoundException("Ticket not found"));
        TicketComment comment = new TicketComment();
        comment.setTicket(ticket);
        comment.setAuthorEmail(authorEmail);
        comment.setBody(request.body().trim());
        return toCommentResponse(ticketCommentRepository.save(comment));
    }

    public TicketCommentResponse addComment(UUID ticketId, UUID tenantId, String authorEmail, CreateTicketCommentRequest request) {
        Ticket ticket = ticketRepository.findByIdAndTenantId(ticketId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Ticket not found"));
        TicketComment comment = new TicketComment();
        comment.setTicket(ticket);
        comment.setAuthorEmail(authorEmail);
        comment.setBody(request.body().trim());
        return toCommentResponse(ticketCommentRepository.save(comment));
    }

    public List<TicketCommentResponse> listComments(UUID ticketId) {
        return ticketCommentRepository.findByTicketIdOrderByCreatedAtAsc(ticketId).stream()
                .map(this::toCommentResponse)
                .toList();
    }

    public List<TicketCommentResponse> listComments(UUID ticketId, UUID tenantId) {
        Ticket ticket = ticketRepository.findByIdAndTenantId(ticketId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Ticket not found"));
        return ticketCommentRepository.findByTicketIdOrderByCreatedAtAsc(ticket.getId()).stream()
                .map(this::toCommentResponse)
                .toList();
    }

    private TicketResponse toResponse(Ticket ticket) {
        return new TicketResponse(
                ticket.getId(),
                ticket.getTenant().getId(),
                ticket.getCreatedByEmail(),
                ticket.getTitle(),
                ticket.getDescription(),
                ticket.getType(),
                ticket.getPriority(),
                ticket.getStatus(),
                ticket.getAssignedToEmail(),
                ticket.getSlaDueAt(),
                ticket.getResolutionNotes(),
                ticket.getCreatedAt(),
                ticket.getUpdatedAt()
        );
    }

    private TicketCommentResponse toCommentResponse(TicketComment comment) {
        return new TicketCommentResponse(
                comment.getId(),
                comment.getTicket().getId(),
                comment.getAuthorEmail(),
                comment.getBody(),
                comment.getCreatedAt(),
                comment.getUpdatedAt()
        );
    }
}
