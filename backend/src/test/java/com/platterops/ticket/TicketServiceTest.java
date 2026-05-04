package com.platterops.ticket;

import com.platterops.dto.CreateTicketCommentRequest;
import com.platterops.dto.CreateTicketRequest;
import com.platterops.dto.TicketCommentResponse;
import com.platterops.dto.TicketResponse;
import com.platterops.dto.UpdateTicketRequest;
import com.platterops.restaurant.Restaurant;
import com.platterops.restaurant.RestaurantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class TicketServiceTest {

    private TicketRepository ticketRepository;
    private TicketCommentRepository ticketCommentRepository;
    private RestaurantRepository restaurantRepository;
    private TicketService ticketService;

    @BeforeEach
    void setUp() {
        ticketRepository = Mockito.mock(TicketRepository.class);
        ticketCommentRepository = Mockito.mock(TicketCommentRepository.class);
        restaurantRepository = Mockito.mock(RestaurantRepository.class);
        ticketService = new TicketService(ticketRepository, ticketCommentRepository, restaurantRepository);
    }

    @Test
    void updateTicket_updatesAssignmentAndSla() {
        UUID ticketId = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();

        Restaurant tenant = new Restaurant();
        tenant.setName("Tenant");
        tenant.setSlug("tenant");

        Ticket ticket = new Ticket();
        ticket.setTenant(tenant);
        ticket.setTitle("Issue");
        ticket.setDescription("Description");
        ticket.setType(TicketType.BUG);
        ticket.setPriority(TicketPriority.MEDIUM);
        ticket.setStatus(TicketStatus.OPEN);

        when(ticketRepository.findById(ticketId)).thenReturn(Optional.of(ticket));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LocalDateTime dueAt = LocalDateTime.now().plusHours(4);
        TicketResponse updated = ticketService.update(ticketId, new UpdateTicketRequest(
                TicketStatus.IN_PROGRESS,
                TicketPriority.HIGH,
                "owner@dineops.com",
                dueAt,
                "Working on fix"
        ));

        assertEquals(TicketStatus.IN_PROGRESS, updated.status());
        assertEquals(TicketPriority.HIGH, updated.priority());
        assertEquals("owner@dineops.com", updated.assignedToEmail());
        assertNotNull(updated.slaDueAt());
        assertEquals("Working on fix", updated.resolutionNotes());
    }

    @Test
    void addComment_returnsPersistedComment() {
        UUID ticketId = UUID.randomUUID();
        Ticket ticket = new Ticket();
        ticket.setTitle("Issue");
        ticket.setDescription("Description");
        ticket.setType(TicketType.BUG);
        ticket.setPriority(TicketPriority.LOW);
        ticket.setStatus(TicketStatus.OPEN);

        when(ticketRepository.findById(ticketId)).thenReturn(Optional.of(ticket));
        when(ticketCommentRepository.save(any(TicketComment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(ticketCommentRepository.findByTicketIdOrderByCreatedAtAsc(ticketId)).thenReturn(List.of());

        TicketCommentResponse response = ticketService.addComment(ticketId, "staff@dineops.com", new CreateTicketCommentRequest("Investigating"));

        assertEquals("staff@dineops.com", response.authorEmail());
        assertEquals("Investigating", response.body());
    }

    @Test
    void createTicket_persistsOpenTicket() {
        UUID tenantId = UUID.randomUUID();
        Restaurant tenant = new Restaurant();
        tenant.setName("Tenant");
        tenant.setSlug("tenant");

        when(restaurantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TicketResponse response = ticketService.create(tenantId, "owner@dineops.com", new CreateTicketRequest(
                "Broken sync",
                "Kitchen board delayed",
                TicketType.ORDER_SYNC,
                TicketPriority.CRITICAL
        ));

        assertEquals(TicketStatus.OPEN, response.status());
        assertEquals("owner@dineops.com", response.createdByEmail());
        assertEquals("Broken sync", response.title());
    }
}
