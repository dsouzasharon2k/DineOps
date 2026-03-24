# CDAC Interview Questions — Answered Using DineOps

> Every answer below is tied directly to real code in this project.
> Topics: Core Java · Spring Boot · SQL/DB · React · DevOps · HR

---

## Table of Contents

1. [Core Java — OOP Concepts](#1-core-java--oop-concepts)
2. [Core Java — Classes & Interfaces](#2-core-java--classes--interfaces)
3. [Core Java — Keywords & Basics](#3-core-java--keywords--basics)
4. [Core Java — Exception Handling](#4-core-java--exception-handling)
5. [Core Java — Collections](#5-core-java--collections)
6. [Core Java — Design Patterns & Misc](#6-core-java--design-patterns--misc)
7. [Spring Boot — Core Concepts](#7-spring-boot--core-concepts)
8. [Spring Boot — Annotations](#8-spring-boot--annotations)
9. [Spring Boot — REST API & HTTP](#9-spring-boot--rest-api--http)
10. [Spring Boot — Security & JWT](#10-spring-boot--security--jwt)
11. [Spring Boot — Microservices & Scalability](#11-spring-boot--microservices--scalability)
12. [SQL & Database](#12-sql--database)
13. [React & Frontend](#13-react--frontend)
14. [OS · Networking · Git · DevOps](#14-os--networking--git--devops)
15. [HR & Behavioral Questions](#15-hr--behavioral-questions)

---

## 1. Core Java — OOP Concepts

---

### Q: What are the four pillars of OOP? Explain with examples from your project.

The four pillars are **Encapsulation, Inheritance, Polymorphism, and Abstraction**.

**1. Encapsulation — hiding internal data**

Every entity in DineOps (like `MenuItem`, `Order`, `User`) uses private fields with public getters/setters via Lombok's `@Getter` and `@Setter`. No external class can directly touch the field — they go through controlled methods.

```java
// MenuItem.java
@Entity
public class MenuItem extends AuditableEntity {
    private String name;        // private — hidden
    private int price;          // stored in paise — internal detail hidden from callers
    private boolean isAvailable;

    // external code uses getPrice(), setPrice() — not the field directly
}
```

The fact that price is in **paise** is an internal implementation detail. The outside world just calls `getPrice()` and the service layer handles the divide-by-100 for display.

**2. Inheritance — reusing common fields**

All entities (`Order`, `User`, `Restaurant`, `MenuItem`, etc.) extend `AuditableEntity`:

```java
@MappedSuperclass
public abstract class AuditableEntity {
    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    private LocalDateTime deletedAt;
}
```

Every entity automatically gets `createdAt`, `updatedAt`, `deletedAt` without repeating code. This is inheritance — child classes get the parent's fields for free.

**3. Polymorphism — same method, different behavior**

The `NotificationService` has a `notify()` method that works for different channels (email, SMS). At runtime, Spring injects the right implementation.

Also, Spring Security's filter chain is polymorphic — `JwtAuthFilter`, `TenantAuthorizationFilter`, and `RequestContextFilter` all extend `OncePerRequestFilter` but each `doFilterInternal()` behaves differently.

**4. Abstraction — hiding "how", exposing "what"**

`OrderRepository` extends `JpaRepository<Order, UUID>`. The controller and service never know *how* SQL is generated — they just call `orderRepository.findById(id)`. The implementation is abstracted away by Spring Data JPA.

---

### Q: Explain SOLID principles. Where and how did you apply each in your project?

**S — Single Responsibility Principle**
Every class has one job. `OrderController` only handles HTTP requests. `OrderService` only runs business logic. `OrderRepository` only talks to the database. They never do each other's job.

**O — Open/Closed Principle**
`AuditableEntity` is open for extension (any entity can extend it) but closed for modification (you don't edit it to add new entity fields). Similarly, the order state machine uses a `Map` — adding a new allowed transition is one line, not a code change inside a condition.

**L — Liskov Substitution Principle**
`JwtAuthFilter`, `TenantAuthorizationFilter`, and `RequestContextFilter` all extend `OncePerRequestFilter`. Anywhere Spring expects a `Filter`, any of these can be used without breaking anything.

**I — Interface Segregation Principle**
`JpaRepository` is split into smaller interfaces (`CrudRepository`, `PagingAndSortingRepository`). Our repositories extend only what they need. `NotificationService` has separate methods for email and SMS — callers use only what they need.

**D — Dependency Inversion Principle**
Controllers depend on service interfaces, not concrete implementations. `OrderService` uses `InventoryService` via Spring's DI — if you swap the `InventoryService` implementation, `OrderService` doesn't change. Spring's IoC container wires everything.

---

### Q: What is Runtime vs Compile-time polymorphism? Example from your project.

**Compile-time polymorphism = Method Overloading** — same method name, different parameters. Resolved at compile time.

**Runtime polymorphism = Method Overriding** — child class overrides parent's method. Resolved at runtime based on actual object type.

In DineOps, every Filter overrides `doFilterInternal()` from `OncePerRequestFilter`. At runtime, Spring decides which filter to call based on the actual object in the chain:

```java
// Parent defines the contract
abstract class OncePerRequestFilter {
    protected abstract void doFilterInternal(...);
}

// Each child overrides it with different behavior
class JwtAuthFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(...) { /* validate JWT */ }
}

class TenantAuthorizationFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(...) { /* check tenant match */ }
}
```

---

### Q: What is Aggregation and Composition?

**Composition** = "has-a" relationship where the child **cannot exist without the parent**. If the parent is destroyed, the child is too.

In DineOps: `Order` and `OrderItem` — an `OrderItem` only makes sense inside an `Order`. If the order is deleted (soft-deleted), the items are meaningless without it. This is composition.

```java
@Entity
public class Order extends AuditableEntity {
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items;  // Composition — items die with the order
}
```

`orphanRemoval = true` and `CascadeType.ALL` enforce composition in JPA.

**Aggregation** = "has-a" but the child **can exist independently**.

In DineOps: `Restaurant` and `User`. A `User` (staff member) belongs to a restaurant, but the `User` entity exists independently — if the restaurant closes, the user account could still exist. The `User` holds a `tenantId` reference but isn't destroyed with the restaurant.

---

## 2. Core Java — Classes & Interfaces

---

### Q: What is the difference between an abstract class and an interface?

| Feature | Abstract Class | Interface |
|---|---|---|
| Methods | Can have both abstract and concrete methods | All methods abstract by default (Java 8+ allows default/static) |
| Variables | Can have instance variables | Only `public static final` constants |
| Constructor | Yes | No |
| Extends | A class can extend only ONE abstract class | A class can implement MULTIPLE interfaces |
| "Is-a" vs "Can-do" | Represents a **base type** (is-a) | Represents a **capability** (can-do) |

**In DineOps:**

`AuditableEntity` is an abstract class — it's a real base type that all entities "are". It has instance variables (`createdAt`, `updatedAt`, `deletedAt`) and shared behavior.

`JpaRepository` is an interface — it defines capabilities (`save`, `findById`, `delete`) that the repository "can do". Our `OrderRepository` implements it.

---

### Q: What is a Functional Interface?

A **Functional Interface** has exactly ONE abstract method. It can be implemented using a lambda expression.

In DineOps, lambda expressions (which implement functional interfaces) are used throughout:

```java
// Predicate<T> — functional interface with test()
List<OrderItem> vegItems = items.stream()
    .filter(item -> item.isVegetarian())  // lambda implements Predicate<OrderItem>
    .collect(Collectors.toList());

// Runnable — functional interface with run()
@Scheduled(cron = "0 0 2 * * *")
public void runDeletionJob() { ... }
```

Why only one abstract method? Because a lambda is an anonymous implementation — there's no way to tell the compiler which method the lambda is for if there are multiple abstract methods.

---

### Q: What is a Singleton class? Where is it used in your project?

A Singleton ensures only **one instance** of a class exists in the JVM.

In DineOps, Spring beans are singletons by default. When Spring creates `OrderService`, it creates it once and reuses that same instance for every request:

```java
@Service  // Spring creates ONE instance and shares it
public class OrderService {
    // Used by all threads — must be stateless (no instance variables that change per request)
}
```

Also, `CacheConfig` defines a single `RedisCacheManager` bean — one cache manager for the whole application.

**Real-world analogy:** The principal of a school — there's only one, and everyone refers to the same person.

---

### Q: What is Serialization?

Serialization is converting a Java object into a byte stream (to store or transmit it). Deserialization is the reverse.

In DineOps, Redis serializes Java objects to JSON when caching:

```java
// CacheConfig.java
GenericJackson2JsonRedisSerializer serializer = new GenericJackson2JsonRedisSerializer(objectMapper);
// When Spring caches an OrderResponse, it serializes it to JSON bytes and stores in Redis
// When reading from cache, it deserializes JSON bytes back to OrderResponse
```

This is why `Page<RestaurantResponse>` cannot be cached — `PageImpl` doesn't deserialize cleanly back from JSON. The Jackson serializer writes it as `LinkedHashMap`, which can't be cast back to `Page`.

---

## 3. Core Java — Keywords & Basics

---

### Q: Why are Strings immutable in Java?

**Three reasons:**

1. **String Pool (memory efficiency):** Java keeps a pool of String literals. If Strings were mutable, changing one reference could affect others pointing to the same pool entry.
2. **Thread safety:** Immutable objects are inherently thread-safe — multiple threads can read the same String without synchronization.
3. **Security:** Strings are used in class loading, file paths, URLs, and database queries. If they were mutable, a malicious class could change a class name after security checks pass.

**In DineOps:** JWT secret, database URLs, Redis host — all stored as String configuration. Their immutability means no code can accidentally mutate them after they're set.

---

### Q: Difference between `final`, `finally`, and `finalize`

| Keyword | What It Does |
|---|---|
| `final` | Makes a variable constant, a method non-overridable, or a class non-inheritable |
| `finally` | Block that always runs after try-catch, regardless of exception |
| `finalize` | Method called by GC before an object is destroyed (deprecated in Java 9+) |

**In DineOps:**

```java
// final — constant map, cannot be reassigned
private static final Map<OrderStatus, Set<OrderStatus>> ALLOWED_TRANSITIONS = Map.of(...);

// finally — not used explicitly because Spring's @Transactional handles rollback automatically
// But conceptually, @Transactional's commit/rollback works like try-finally internally

// AuditableEntity has final-like behavior via @CreationTimestamp — createdAt is set once
```

---

### Q: Difference between String, StringBuffer, and StringBuilder

| Feature | String | StringBuffer | StringBuilder |
|---|---|---|---|
| Mutable? | No | Yes | Yes |
| Thread-safe? | Yes (immutable) | Yes (synchronized) | No |
| Performance | Slowest for concatenation | Medium | Fastest |

**In DineOps:** `InvoicePdfGenerator` builds invoice text dynamically:

```java
// StringBuilder used for building invoice content — single thread, performance matters
StringBuilder invoice = new StringBuilder();
invoice.append("DineOps Invoice\n");
invoice.append("Order #").append(order.getId()).append("\n");
// ...
```

String concatenation in a loop uses StringBuilder internally (Java compiler optimizes it).

---

### Q: What is the difference between `==` and `.equals()`?

- `==` compares **memory addresses** (are they the same object?)
- `.equals()` compares **content** (do they have the same value?)

**In DineOps:**

```java
// UUID comparison — must use .equals()
if (order.getTenantId().equals(user.getTenantId())) {
    // correct — compares UUID content
}

// WRONG:
if (order.getTenantId() == user.getTenantId()) {
    // wrong — compares object references, may return false even for same UUID value
}

// OrderStatus enum comparison — can use == safely (enums are singletons)
if (order.getStatus() == OrderStatus.PENDING) {
    // safe for enums — each enum constant is a single instance
}
```

---

### Q: What is boxing and unboxing?

**Boxing** = converting a primitive (`int`) to its wrapper class (`Integer`).
**Unboxing** = the reverse.

**In DineOps:**

```java
// MenuItem.price is int (primitive) — stored in DB as INTEGER
private int price;

// When used in a Map or Stream, Java auto-boxes it:
Map<String, Integer> priceMap = new HashMap<>();
priceMap.put("Burger", menuItem.getPrice());  // auto-boxing: int → Integer

// Unboxing happens when extracting:
int price = priceMap.get("Burger");  // auto-unboxing: Integer → int
```

**Warning:** Unboxing a `null` `Integer` causes a `NullPointerException`. This is why DineOps stores `price` as primitive `int` (can never be null) rather than `Integer`.

---

## 4. Core Java — Exception Handling

---

### Q: What are checked vs unchecked exceptions?

**Checked exceptions:** Must be handled at compile time (`try-catch` or `throws`). The compiler forces you to handle them. Example: `IOException`, `SQLException`.

**Unchecked exceptions:** Subclass of `RuntimeException`. Compiler doesn't force handling. Example: `NullPointerException`, `IllegalArgumentException`.

**In DineOps:**

```java
// EntityNotFoundException — custom unchecked exception
public class EntityNotFoundException extends RuntimeException {
    public EntityNotFoundException(String message) {
        super(message);
    }
}

// Usage in OrderService — no try-catch needed at call site
Order order = orderRepository.findById(id)
    .orElseThrow(() -> new EntityNotFoundException("Order not found: " + id));

// GlobalExceptionHandler catches it centrally
@ExceptionHandler(EntityNotFoundException.class)
public ResponseEntity<ApiError> handleNotFound(EntityNotFoundException ex) {
    return ResponseEntity.status(404).body(new ApiError(404, ex.getMessage()));
}
```

Using unchecked exceptions keeps service methods clean — no `throws` declarations polluting method signatures.

---

### Q: How are multiple exceptions handled? Can one `try` have multiple `catch` blocks?

Yes — DineOps's `GlobalExceptionHandler` is essentially a set of catch blocks for the whole application:

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ApiError> handleNotFound(...) { return 404; }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> handleBadRequest(...) { return 400; }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> handleForbidden(...) { return 403; }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(...) { return 422; }

    @ExceptionHandler(Exception.class)  // catch-all — always last
    public ResponseEntity<ApiError> handleGeneric(...) { return 500; }
}
```

Order matters — more specific exceptions first, generic `Exception` last. Same rule applies to regular `catch` blocks.

---

### Q: When does the `finally` block NOT execute?

In three situations:
1. `System.exit()` is called
2. JVM crashes
3. The thread is forcefully killed

In normal exception scenarios (even if exception is thrown and not caught), `finally` always runs.

**In DineOps:** `@Transactional` is the equivalent of finally for database work. Even if an exception is thrown inside `placeOrder()`, Spring rolls back the transaction — it's like a built-in finally that cleans up database state.

---

## 5. Core Java — Collections

---

### Q: What collections did you use in your project?

| Collection | Where Used in DineOps | Why |
|---|---|---|
| `List<T>` | `Order.items`, `MenuCategory.items`, API responses | Ordered collection, duplicates allowed |
| `Map<K,V>` | `ALLOWED_TRANSITIONS`, `PLAN_LIMITS`, Redis operations | Key-value lookup, O(1) access |
| `Set<OrderStatus>` | Values in `ALLOWED_TRANSITIONS` map | No duplicates, fast `.contains()` check |
| `EnumMap` | (could be used for `ALLOWED_TRANSITIONS`) | Faster than `HashMap` for enum keys |

```java
// OrderService.java — ALLOWED_TRANSITIONS
private static final Map<OrderStatus, Set<OrderStatus>> ALLOWED_TRANSITIONS = Map.of(
    OrderStatus.PENDING,   Set.of(OrderStatus.CONFIRMED, OrderStatus.CANCELLED),
    OrderStatus.CONFIRMED, Set.of(OrderStatus.PREPARING, OrderStatus.CANCELLED),
    OrderStatus.PREPARING, Set.of(OrderStatus.READY,     OrderStatus.CANCELLED),
    OrderStatus.READY,     Set.of(OrderStatus.DELIVERED, OrderStatus.CANCELLED)
);

// SubscriptionService.java — PLAN_LIMITS
private static final Map<SubscriptionPlan, Integer> PLAN_LIMITS = Map.of(
    SubscriptionPlan.STARTER,    300,
    SubscriptionPlan.GROWTH,     2000,
    SubscriptionPlan.ENTERPRISE, Integer.MAX_VALUE
);
```

---

### Q: What is the internal working of HashMap?

HashMap stores data in an array of **buckets**. Each bucket is a linked list (or tree for Java 8+).

**Steps for `put(key, value)`:**
1. Compute `key.hashCode()`
2. Apply a bit-mixing function to reduce collisions
3. `index = hash & (capacity - 1)` to find the bucket
4. If bucket is empty → store directly
5. If collision (same bucket) → add to linked list, using `equals()` to check for same key
6. If list length > 8 → convert to a Red-Black Tree (O(log n))
7. If load factor > 0.75 → resize (double the array, rehash everything)

**In DineOps:**
```java
// ALLOWED_TRANSITIONS lookup — HashMap O(1) average
Set<OrderStatus> allowed = ALLOWED_TRANSITIONS.get(currentStatus);
// hash(PENDING) → bucket → get Set immediately
```

**Why this matters for your project:** The order state machine relies on O(1) lookups. If you used a series of `if-else` statements instead, it would be O(n) and harder to maintain.

---

### Q: What is the difference between HashMap and Hashtable?

| Feature | HashMap | Hashtable |
|---|---|---|
| Thread-safe? | No | Yes (synchronized) |
| Null keys/values | Allows one null key | No null keys or values |
| Performance | Faster | Slower (lock overhead) |
| Introduced | Java 1.2 | Java 1.0 (legacy) |

**In DineOps:** `HashMap` is used everywhere because:
1. Most service methods are `@Transactional` — they don't need thread-safe collections internally
2. Static `final` maps like `ALLOWED_TRANSITIONS` are read-only after initialization — thread-safe naturally
3. For concurrent scenarios, `ConcurrentHashMap` is preferred over `Hashtable`

---

### Q: What is Comparable vs Comparator?

**Comparable** — the class itself defines its natural ordering by implementing `compareTo()`.

**Comparator** — an external class defines custom ordering.

**In DineOps:** When sorting menu items by `displayOrder`:

```java
// MenuItemService — sorting items for display
List<MenuItemResponse> items = menuItems.stream()
    .sorted(Comparator.comparingInt(MenuItem::getDisplayOrder))  // Comparator — external ordering
    .map(this::toResponse)
    .collect(Collectors.toList());
```

If `MenuItem` implemented `Comparable<MenuItem>`, `compareTo()` would define the natural order. Using `Comparator` lets you sort the same list in different ways (by price, by name, by display order) without changing the `MenuItem` class.

---

### Q: Explain Streams — intermediate vs terminal operations.

**Intermediate operations** return a new Stream (lazy — nothing happens until a terminal op is called):
`filter()`, `map()`, `sorted()`, `distinct()`, `limit()`, `flatMap()`

**Terminal operations** trigger the pipeline and produce a result:
`collect()`, `count()`, `forEach()`, `findFirst()`, `reduce()`, `toList()`

**In DineOps — AnalyticsService:**

```java
// Intermediate: filter, map | Terminal: collect
List<OrderItemResponse> topItems = orders.stream()
    .filter(o -> o.getStatus() == OrderStatus.DELIVERED)   // intermediate — filter
    .flatMap(o -> o.getItems().stream())                    // intermediate — flatten
    .collect(Collectors.groupingBy(                        // terminal — group and count
        OrderItem::getMenuItemName,
        Collectors.summingInt(OrderItem::getQuantity)
    ))
    .entrySet().stream()
    .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
    .limit(5)                                              // intermediate — top 5
    .map(e -> new ItemCount(e.getKey(), e.getValue()))     // intermediate — transform
    .collect(Collectors.toList());                         // terminal — final result
```

---

## 6. Core Java — Design Patterns & Misc

---

### Q: What is Dependency Injection? What is IoC? Why loose coupling?

**IoC (Inversion of Control):** Normally your class creates its own dependencies (`new OrderRepository()`). With IoC, you "invert" this — you let a framework (Spring) create and inject the dependencies for you.

**Dependency Injection:** The mechanism IoC uses. Spring sees `@Autowired` and provides the correct bean.

**Loose coupling:** Your class depends on an interface, not a concrete class. You can swap implementations without changing the dependent class.

**In DineOps:**

```java
// OrderService depends on OrderRepository — but doesn't create it
@Service
public class OrderService {
    private final OrderRepository orderRepository;       // interface
    private final InventoryService inventoryService;     // interface
    private final SubscriptionService subscriptionService;

    // Spring injects all three at startup — OrderService never calls "new"
    public OrderService(OrderRepository orderRepository,
                        InventoryService inventoryService,
                        SubscriptionService subscriptionService) {
        this.orderRepository = orderRepository;
        this.inventoryService = inventoryService;
        this.subscriptionService = subscriptionService;
    }
}
```

**Why loose coupling matters:** If you want to swap PostgreSQL for MongoDB, you change only the `OrderRepository` implementation. `OrderService` doesn't need to change at all.

---

### Q: What is the N+1 Query problem in Spring?

**N+1 problem:** You fetch N parent records, then for each parent you make 1 more query to fetch its children. So you make N+1 total queries instead of 1.

**In DineOps — the classic trap:**

```java
// BAD: Fetching orders then their items separately
List<Order> orders = orderRepository.findAll(); // 1 query — fetches 100 orders
for (Order order : orders) {
    List<OrderItem> items = order.getItems();   // 100 queries — one per order = N+1!
}
```

**How DineOps avoids it:**

1. Using `JOIN FETCH` in JPQL queries when items are needed with orders
2. Using `@EntityGraph` annotations to eagerly fetch only when needed
3. DTOs that select exactly the needed columns (avoiding unnecessary fetches)
4. The `OrderResponse` DTO maps items during the initial query, not in a loop

**Lazy vs Eager loading:**
- `FetchType.LAZY` = don't load children until accessed (default for `@OneToMany`) — avoids N+1 if you never access children
- `FetchType.EAGER` = always load children — can cause N+1 if not careful

---

### Q: What is `@SpringBootApplication`? What does it combine?

`@SpringBootApplication` is a convenience annotation combining three annotations:

```java
@SpringBootConfiguration   // = @Configuration — this class is a Spring config class
@EnableAutoConfiguration   // Spring Boot auto-configures beans based on classpath
@ComponentScan             // Scans current package and sub-packages for @Component, @Service, etc.
```

**In DineOps:**

```java
@SpringBootApplication
public class DineopsBackendApplication {
    public static void main(String[] args) {
        SpringApplication.run(DineopsBackendApplication.class, args);
    }
}
```

When this runs: Spring Boot scans all packages under `com.dineops`, auto-configures PostgreSQL (seeing HikariCP on classpath), auto-configures Redis (seeing spring-data-redis), sets up Flyway, starts the embedded Tomcat server on port 8080.

---

## 7. Spring Boot — Core Concepts

---

### Q: What is Spring Boot? What is the difference between Spring and Spring Boot?

**Spring Framework:** A large, powerful framework for building Java applications. But configuring it requires a lot of XML or Java config boilerplate — datasource, transaction manager, dispatcher servlet, etc.

**Spring Boot:** Built on top of Spring. It **auto-configures** everything based on what's on the classpath. It comes with an **embedded Tomcat server** — no need to deploy to an external server.

| Feature | Spring | Spring Boot |
|---|---|---|
| Configuration | Manual XML/Java config | Auto-configured |
| Server | Deploy to external Tomcat | Embedded Tomcat (runs as a JAR) |
| Starter setup | Hours | Minutes |
| Production-ready | Manual setup | Actuator built-in |

**In DineOps:** `application.yml` has ~30 lines. Spring Boot auto-configures: HikariCP connection pool, Flyway migrations, Redis cache, JPA/Hibernate, Spring Security, and Tomcat — all from those few lines.

---

### Q: What is AutoConfiguration in Spring Boot?

Spring Boot looks at what's on your classpath and automatically creates beans you'd otherwise have to configure manually.

**Example in DineOps:**
- `spring-boot-starter-data-jpa` on classpath → Spring Boot auto-creates `EntityManagerFactory`, `TransactionManager`, `DataSource`
- `spring-boot-starter-data-redis` on classpath → Auto-creates `RedisTemplate`, `RedisConnectionFactory`
- `spring-boot-starter-security` on classpath → Auto-creates security filter chain

You can override any auto-configuration by defining your own bean. In DineOps, `SecurityConfig` and `CacheConfig` override the defaults with custom behavior.

---

### Q: What is lazy vs eager loading?

**Eager loading:** Load the related data immediately when the parent is loaded.
**Lazy loading:** Load the related data only when it's first accessed (proxy object used until then).

```java
// Order.java
@OneToMany(mappedBy = "order", fetch = FetchType.LAZY)  // default for collections
private List<OrderItem> items;

@ManyToOne(fetch = FetchType.LAZY)
private DiningTable table;
```

**When DineOps accesses `order.getItems()` outside a transaction → LazyInitializationException!**

This is why `OrderService` always loads orders within a `@Transactional` method — the Hibernate session is open, so lazy loading works fine.

**DTOs solve this:** By mapping to `OrderResponse` inside the transaction, the items are loaded while the session is still open. Once the DTO is returned, the session closes — but we don't need it anymore.

---

### Q: What is Spring Boot Actuator?

Actuator exposes production-ready endpoints for monitoring your application.

**In DineOps `application.yml`:**

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health, prometheus, info
  endpoint:
    health:
      show-details: when-authorized  # only SUPER_ADMIN sees full health details
```

- `/actuator/health` → Is the app up? Is the database connected? Is Redis connected?
- `/actuator/prometheus` → Metrics in Prometheus format, scraped by the monitoring stack
- `/actuator/info` → App version, build info

**Why it matters:** In production, Kubernetes uses `/actuator/health` as a readiness probe — if it returns unhealthy, Kubernetes stops routing traffic to that pod.

---

## 8. Spring Boot — Annotations

---

### Q: Explain all Spring Boot annotations used in your project.

| Annotation | Where Used | What It Does |
|---|---|---|
| `@SpringBootApplication` | `DineopsBackendApplication` | Entry point — enables auto-config + component scan |
| `@RestController` | All controllers | = `@Controller` + `@ResponseBody` — returns JSON directly |
| `@Service` | All services | Marks as business logic layer bean |
| `@Repository` | All repositories | Marks as data layer; translates SQL exceptions to Spring exceptions |
| `@Component` | Filters, utilities | Generic Spring-managed bean |
| `@Configuration` | `SecurityConfig`, `CacheConfig`, `WebSocketConfig` | Config class — defines beans via `@Bean` methods |
| `@Bean` | Inside `@Configuration` classes | Declares a Spring-managed bean |
| `@Autowired` | Dependency injection | Injects beans (constructor injection preferred in DineOps) |
| `@Entity` | All JPA entities | Marks Java class as a database table |
| `@Table` | Entities | Specifies table name |
| `@Id` | Entity primary key | Marks the primary key field |
| `@GeneratedValue` | Entity IDs | Auto-generates UUID |
| `@Column` | Entity fields | Maps field to DB column, sets nullable/unique |
| `@ManyToOne` / `@OneToMany` | Relationships | JPA relationship mappings |
| `@MappedSuperclass` | `AuditableEntity` | Parent class whose fields are inherited by child entity tables |
| `@SQLRestriction` | All entities | Appends `WHERE deleted_at IS NULL` to every query |
| `@Transactional` | Service methods | Wraps method in a DB transaction — all-or-nothing |
| `@Cacheable` | Service read methods | Cache result in Redis |
| `@CacheEvict` | Service write methods | Remove stale cache entries from Redis |
| `@Scheduled` | `UserDeletionJob` | Runs method on a cron schedule |
| `@Aspect` | `AuditLogAspect` | Marks class as AOP aspect |
| `@Around` | Audit advice | Intercepts method execution before and after |
| `@PreAuthorize` | Controller methods | Role-based access control using SpEL expressions |
| `@RequestMapping` | Controllers | Base URL mapping |
| `@GetMapping`, `@PostMapping`, etc. | Controller methods | HTTP method-specific URL mapping |
| `@PathVariable` | Method params | Extracts `{id}` from URL path |
| `@RequestBody` | Method params | Deserializes JSON body to Java object |
| `@Valid` | Method params | Triggers Bean Validation on the parameter |
| `@NotNull`, `@Min`, `@Size` | DTO/request fields | Validation constraints |
| `@RestControllerAdvice` | `GlobalExceptionHandler` | Global error handling for all controllers |
| `@ExceptionHandler` | Methods in handler | Handles specific exception type |
| `@Value` | Config fields | Injects value from `application.yml` |
| `@EnableWebSecurity` | `SecurityConfig` | Enables Spring Security |
| `@EnableCaching` | `CacheConfig` | Enables Spring's caching abstraction |

---

### Q: Difference between `@Component`, `@Service`, `@Repository`?

All three create a Spring-managed bean (they're all specializations of `@Component`). The difference is semantic — they tell other developers and Spring what the bean's role is:

| Annotation | Role | Extra behavior |
|---|---|---|
| `@Component` | Generic bean | None |
| `@Service` | Business logic | None (but convention: should hold business logic) |
| `@Repository` | Data access | Spring translates persistence exceptions (e.g., `DataIntegrityViolationException`) |

In DineOps, `TenantAuthorizationFilter` is a `@Component` — it's not a service or repository, just a Spring-managed filter.

---

### Q: What is `@Transactional`?

Annotating a method with `@Transactional` means:
1. A database transaction starts before the method runs
2. If the method completes normally → **commit** (save all changes)
3. If a `RuntimeException` is thrown → **rollback** (undo all changes)

**In DineOps — `OrderService.placeOrder()`:**

```java
@Transactional
public OrderResponse placeOrder(PlaceOrderRequest request, UUID tenantId) {
    // Step 1: validate subscription
    // Step 2: fetch menu items
    // Step 3: create Order
    // Step 4: create OrderItems
    // Step 5: deduct inventory  ← if THIS fails, steps 3 and 4 are also rolled back
    // Step 6: save order
    // All steps succeed or all fail together
}
```

Without `@Transactional`: if inventory deduction fails, you'd have an Order and OrderItems saved with no inventory deducted — corrupted data.

---

### Q: What is `@PreAuthorize`? Explain with example from your project.

`@PreAuthorize` evaluates a Spring Security Expression (SpEL) before the method runs. If it returns false, access is denied (403 Forbidden).

**In DineOps:**

```java
// Only TENANT_ADMIN or SUPER_ADMIN can create menu items
@PostMapping
@PreAuthorize("hasAnyRole('TENANT_ADMIN', 'SUPER_ADMIN')")
public ResponseEntity<MenuItemResponse> createItem(...) { ... }

// Only SUPER_ADMIN can list all restaurants
@GetMapping
@PreAuthorize("hasRole('SUPER_ADMIN')")
public ResponseEntity<Page<RestaurantResponse>> getAllRestaurants(...) { ... }

// Staff can update order status (kitchen)
@PatchMapping("/{id}/status")
@PreAuthorize("hasAnyRole('STAFF', 'TENANT_ADMIN')")
public ResponseEntity<OrderResponse> updateStatus(...) { ... }
```

---

## 9. Spring Boot — REST API & HTTP

---

### Q: What are HTTP methods? Difference between PUT and PATCH?

| Method | Purpose | Body? | Idempotent? |
|---|---|---|---|
| `GET` | Fetch data | No | Yes |
| `POST` | Create new resource | Yes | No |
| `PUT` | Replace entire resource | Yes | Yes |
| `PATCH` | Partially update resource | Yes | Yes |
| `DELETE` | Remove resource | No | Yes |

**PUT vs PATCH in DineOps:**

```java
// PATCH — only update the status field, not the whole order
@PatchMapping("/{id}/status")
public ResponseEntity<OrderResponse> updateStatus(
    @PathVariable UUID id,
    @RequestBody UpdateOrderStatusRequest request  // only contains { "status": "CONFIRMED" }
) { ... }

// If we used PUT, we'd have to send the ENTIRE order object just to change one field
```

**Idempotent** means calling the same request multiple times gives the same result. `GET /orders/123` always returns the same order. `POST /orders` creates a new order each time — not idempotent.

---

### Q: What are HTTP status codes? Explain some.

| Code | Meaning | Where in DineOps |
|---|---|---|
| 200 OK | Success with body | GET requests returning data |
| 201 Created | Resource created | POST /orders, POST /restaurants |
| 204 No Content | Success, no body | DELETE requests |
| 400 Bad Request | Invalid input | Bean validation failure, invalid status transition |
| 401 Unauthorized | Not authenticated | No/invalid JWT token |
| 403 Forbidden | Authenticated but no permission | Wrong tenant, wrong role |
| 404 Not Found | Resource doesn't exist | `EntityNotFoundException` |
| 409 Conflict | Duplicate resource | Duplicate restaurant slug |
| 422 Unprocessable Entity | Validation error | `MethodArgumentNotValidException` |
| 429 Too Many Requests | Rate limit hit | Login rate limiting |
| 500 Internal Server Error | Unexpected server error | Unhandled exceptions |

---

### Q: What is an idempotent request?

An idempotent request can be made multiple times with the same result. No matter how many times you call it, the server state is the same.

**In DineOps:**
- `GET /orders/{id}` → idempotent (reads don't change state)
- `PATCH /orders/{id}/status` with `CONFIRMED` → idempotent (confirming an already-confirmed order should not change anything — though DineOps throws an error for invalid transitions, the *intent* is idempotent)
- `POST /orders` → **NOT** idempotent — calling it twice creates two orders

**Why it matters:** If a network timeout occurs during a `POST /orders`, the client doesn't know if the order was created. With a non-idempotent POST, retrying might create a duplicate order. Solutions: idempotency keys, check-before-create patterns.

---

### Q: What is the difference between login and register API? (Answer based on JWT)

**Register API (`POST /api/v1/auth/register`):**
1. Receives `name`, `email`, `password`
2. Validates email is not already registered
3. Hashes the password with BCrypt
4. Creates a new `User` record in the database
5. Does NOT return a JWT — user must log in separately

**Login API (`POST /api/v1/auth/login`):**
1. Receives `email`, `password`
2. Checks rate limit (10 attempts/minute) and account lockout
3. Loads user by email, verifies BCrypt hash matches
4. On success: generates **access token** (24h) + **refresh token** (7d)
5. Access token returned in JSON body, refresh token set as httpOnly cookie
6. Clears failed login counter in Redis

**Key difference:** Register creates the identity. Login verifies the identity and issues credentials (JWTs).

---

### Q: How do you improve the performance of a slow API?

**What DineOps does:**

1. **Caching** — Menu items cached in Redis for 5 minutes. 1000 customers loading the menu → 1 DB query, 999 cache hits.

2. **Database indexes** — Composite indexes on `(tenant_id, status)`, `(tenant_id, created_at)` for common query patterns.

3. **Avoid N+1** — Using JOIN FETCH or DTOs that select exactly what's needed.

4. **Pagination** — All list endpoints return paginated results (not all 10,000 orders at once).

5. **Connection pooling** — HikariCP pool (5–15 connections) reuses DB connections instead of opening new ones per request.

6. **Generated columns** — `meal_period` is pre-computed in the database, not calculated in Java on every analytics request.

7. **SQL views** — `vw_accurate_prep_times`, `vw_item_revenue` — complex analytics queries are pre-defined as views, reducing query complexity in the application layer.

---

## 10. Spring Boot — Security & JWT

---

### Q: What is Spring Security? Explain its flow.

Spring Security intercepts every HTTP request through a **filter chain**. Filters run in order before the request reaches any controller.

**DineOps filter chain (simplified):**

```
HTTP Request
    ↓
[RequestContextFilter]  → assigns requestId to MDC for logging
    ↓
[JwtAuthFilter]         → extracts + validates JWT → sets SecurityContext
    ↓
[TenantAuthorizationFilter] → verifies user belongs to requested tenant
    ↓
[Spring Security authorization check] → verifies role matches @PreAuthorize
    ↓
[Controller method]     → actual business logic
    ↓
HTTP Response
```

If any filter rejects the request, the chain stops and the appropriate error code is returned (401, 403).

---

### Q: What are the different parts of a JWT token?

A JWT has three Base64URL-encoded parts separated by dots:

```
header.payload.signature
```

**Header:**
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload (claims):**
```json
{
  "sub": "3f7a2b1c-...",     // userId
  "tenantId": "a1b2c3...",  // which restaurant
  "role": "TENANT_ADMIN",
  "tokenType": "access",    // DineOps distinguishes access vs refresh tokens
  "iat": 1711111111,        // issued at
  "exp": 1711197511         // expiry (iat + 24h)
}
```

**Signature:**
```
HMACSHA256(base64(header) + "." + base64(payload), SECRET_KEY)
```

The signature ensures the token hasn't been tampered with. If someone changes the payload (e.g., sets `role` to `SUPER_ADMIN`), the signature won't match and the server rejects it.

**What '256' in SHA-256 means:** The hash output is always 256 bits (32 bytes). More bits = harder to brute-force.

**Where to store JWT:** Access token in **JS memory only** (never localStorage — vulnerable to XSS). Refresh token in **httpOnly cookie** (JS cannot read it).

---

### Q: What is the difference between Authentication and Authorization?

| | Authentication | Authorization |
|---|---|---|
| Question | "Who are you?" | "What can you do?" |
| How | Verify password → issue JWT | Check JWT role → allow/deny |
| In DineOps | `JwtAuthFilter` validates token → sets SecurityContext | `@PreAuthorize("hasRole('ADMIN')")` checks role |

**In DineOps flow:**
1. `JwtAuthFilter` **authenticates** — validates the JWT, extracts userId/tenantId/role, stores in `SecurityContextHolder`
2. `@PreAuthorize` **authorizes** — checks if the authenticated user's role allows the action
3. `TenantAuthorizationFilter` **authorizes** further — checks if the user belongs to the requested restaurant

---

### Q: What is CSRF? How does DineOps handle it?

**CSRF (Cross-Site Request Forgery):** A malicious website tricks a logged-in user's browser into making requests to your API using the user's session cookies.

**Example attack:** You're logged into your bank. You visit a malicious site. That site silently sends `POST /bank/transfer?to=hacker&amount=10000`. Your browser automatically sends your session cookie with it.

**DineOps prevention:**
1. **CSRF is disabled** in Spring Security — because DineOps uses JWT (not session cookies) for authentication
2. The access token lives **in JS memory** — other sites' JavaScript cannot access it (Same-Origin Policy)
3. The refresh token is a `SameSite=Lax` cookie — browsers block it from being sent from cross-origin navigation
4. JWTs require a deliberate `Authorization: Bearer ...` header — browsers don't auto-attach headers like they do cookies

---

### Q: Difference between session-based authentication vs token-based authentication.

| Feature | Session-based | Token-based (JWT) |
|---|---|---|
| State stored | On server (database/memory) | In the token itself (stateless) |
| Scalability | Poor — every server needs session store | Great — any server validates any token |
| CSRF risk | High (cookies sent automatically) | Low (token sent manually via header) |
| Logout | Easy — delete session | Hard — token stays valid until expiry |

**Why DineOps uses JWT:**
```yaml
# application.yml
spring:
  security:
    session:
      management:
        stateless: true  # No sessions at all
```

With multiple backend instances (Kubernetes), session-based auth would require a shared session store (sticky sessions or Redis session). JWT is stateless — any instance can validate any token without central coordination.

---

### Q: How are passwords stored in the database?

**Never in plain text.** DineOps uses BCrypt:

```java
// SecurityConfig.java
@Bean
public BCryptPasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();  // default strength 10 — ~100ms per hash
}

// AuthController — when registering
String hashedPassword = passwordEncoder.encode(request.getPassword());
user.setPasswordHash(hashedPassword);
// Stored in DB: "$2a$10$randomSaltHere...hashedValue"

// AuthController — when logging in
boolean matches = passwordEncoder.matches(rawPassword, user.getPasswordHash());
```

**BCrypt properties:**
- One-way — cannot reverse the hash to get the password
- Salted — random salt added before hashing, so identical passwords have different hashes
- Slow by design — ~100ms makes brute-forcing impractical at scale
- Adaptive — you can increase the strength factor as hardware gets faster

---

## 11. Spring Boot — Microservices & Scalability

---

### Q: What is Redis? What is caching? Explain how you used it.

**Redis** is an in-memory key-value store. It stores data in RAM (not on disk), making it 100x-1000x faster than a traditional database for reads.

**Two uses in DineOps:**

**1. Application Cache:**
```java
// CacheConfig.java — 5-minute TTL for all caches
@Bean
public RedisCacheManager cacheManager(RedisConnectionFactory factory) {
    RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
        .entryTtl(Duration.ofMinutes(5))
        .serializeValuesWith(...Jackson JSON...);
    return RedisCacheManager.builder(factory).cacheDefaults(config).build();
}

// MenuItemService — cache menu reads
@Cacheable(value = "menu:items", key = "#tenantId")
public List<MenuItemResponse> getMenuItems(UUID tenantId) {
    return menuItemRepository.findByTenantId(tenantId)...;
}

// MenuItemService — evict on any change
@CacheEvict(value = "menu:items", key = "#tenantId")
public MenuItemResponse createItem(UUID tenantId, ...) { ... }
```

**2. Rate limiting and account lockout:**
```java
// RateLimitService — Redis INCR + EXPIRE pattern
String key = "auth:rate:" + email;
Long count = redisTemplate.opsForValue().increment(key);
if (count == 1) redisTemplate.expire(key, 60, TimeUnit.SECONDS);
if (count > 10) throw new TooManyRequestsException();
```

---

### Q: What is horizontal vs vertical scaling?

**Vertical scaling (scale up):** Give your one server more RAM/CPU. Easier but has a limit (one machine can only be so big) and is a single point of failure.

**Horizontal scaling (scale out):** Add more server instances. More complex but unlimited — you can add 100 servers. Requires stateless application design.

**DineOps is designed for horizontal scaling:**
- **Stateless JWT** — any server instance can validate any token (no shared session state)
- **Redis** — rate limiting and cache work across all instances (not in-memory per instance)
- **PostgreSQL** — shared database, all instances connect to the same DB
- **Kubernetes** (`k8s/` folder) — manifests allow scaling to N replicas: `kubectl scale deployment dineops --replicas=5`

**If 10,000 customers suddenly hit DineOps:** Kubernetes auto-scales (HPA) by adding more backend pod replicas. Redis absorbs the cache load. PostgreSQL connection pool (5-15 per instance) is multiplied across replicas.

---

### Q: What is NoSQL? When would you use it vs PostgreSQL?

**SQL (PostgreSQL in DineOps):** Structured data, fixed schema, ACID transactions, relationships via foreign keys.

**NoSQL (e.g., MongoDB, Redis, Cassandra):** Flexible schema, horizontally scalable, no JOINs.

**Why DineOps chose PostgreSQL:**
1. **Relationships** — orders belong to restaurants, items belong to categories, users belong to tenants — these relationships are best modeled in a relational DB
2. **ACID transactions** — placing an order (create order + create items + deduct inventory) must be atomic — PostgreSQL handles this natively
3. **Complex queries** — analytics with GROUP BY, JOIN across tables, generated columns — SQL is much better here
4. **JSON support** — PostgreSQL supports `JSONB` columns (used for `operatingHours`) — giving flexibility where needed

**Redis IS used in DineOps** — but for caching and pub/sub, not as the primary data store.

---

## 12. SQL & Database

---

### Q: Which database did you use? Why?

PostgreSQL. Reasons:
1. **ACID compliance** — critical for financial/order data
2. **Advanced features** — generated columns (`meal_period`), partial unique indexes, JSONB columns, window functions, stored procedures
3. **JSON support** — `operating_hours` stored as JSON text, queried as needed
4. **Production-proven** — handles millions of rows, excellent indexing
5. **Flyway-compatible** — schema migrations work seamlessly

---

### Q: What are ACID properties?

| Property | Meaning | In DineOps |
|---|---|---|
| **Atomicity** | All operations in a transaction succeed, or all fail | `placeOrder()` is `@Transactional` — order + items + inventory all save or all rollback |
| **Consistency** | Database moves from one valid state to another | CHECK constraints (price ≥ 0, rating 1-5), NOT NULL constraints |
| **Isolation** | Concurrent transactions don't interfere | PostgreSQL default isolation (Read Committed) prevents dirty reads |
| **Durability** | Committed data survives crashes | PostgreSQL writes to WAL (Write-Ahead Log) before confirming commit |

---

### Q: What is normalization? Explain 1NF, 2NF, 3NF.

Normalization reduces data redundancy (storing the same data multiple times) to avoid inconsistency.

**1NF (First Normal Form):** Each column holds atomic (single) values. No repeating groups.

DineOps: `order_items` is a separate table (not storing items as a comma-separated string in `orders`). Each row is one item.

**2NF (Second Normal Form):** All non-key columns depend on the entire primary key (not just part of it). Eliminates partial dependencies.

DineOps: `OrderItem` stores `tenant_id` denormalized (V23) for performance — technically a violation of 2NF, but a deliberate trade-off. In a strict 2NF design, you'd derive `tenant_id` via a JOIN to `orders`.

**3NF (Third Normal Form):** No transitive dependencies — non-key columns don't depend on other non-key columns.

DineOps: `MenuItem` stores `category_id` (FK), not `category_name`. The `name` is derived by joining with `menu_categories`, not stored redundantly. This prevents the inconsistency of a category name being different across menu items.

---

### Q: What is SQL injection? How did you prevent it in your project?

**SQL injection:** An attacker inputs SQL code into a form field. If the query is built by string concatenation, the injected SQL executes on the database.

```sql
-- Vulnerable query (NOT what DineOps does):
"SELECT * FROM users WHERE email = '" + email + "'"
-- Attacker inputs: ' OR '1'='1
-- Result: SELECT * FROM users WHERE email = '' OR '1'='1'  ← returns all users!
```

**How DineOps prevents it:**

1. **JPA/Hibernate with parameterized queries** — Spring Data JPA never concatenates user input into SQL. It uses `PreparedStatement` with `?` placeholders:
   ```java
   // Repository method
   Optional<User> findByEmail(String email);
   // Generates: SELECT * FROM users WHERE email = ?  ← email is a parameter, not concatenated
   ```

2. **Bean Validation** — Input is validated before it reaches any database layer (`@Email`, `@NotBlank`, `@Size`)

3. **No native SQL string building** — All queries are JPQL with named parameters or Spring Data method names

---

### Q: What is indexing? Difference between clustered vs non-clustered index?

An **index** is like a book's index — instead of scanning every row, the database jumps directly to the matching rows.

**Without index:** `SELECT * FROM orders WHERE tenant_id = X` → scans every row (O(n))
**With index:** Same query → index lookup → jumps to matching rows directly (O(log n))

**In DineOps (V15 migration):**
```sql
-- Composite index for the most common query pattern
CREATE INDEX idx_orders_tenant_status ON orders(tenant_id, status);

-- Index for subscription limit check
CREATE INDEX idx_orders_tenant_created ON orders(tenant_id, created_at);

-- Partial unique index — email unique only among non-deleted users
CREATE UNIQUE INDEX idx_users_email_active ON users(email) WHERE deleted_at IS NULL;
```

**Clustered index:** The table rows are physically sorted by this key. In PostgreSQL, the primary key (`id`) is clustered by default. There can be only ONE clustered index.

**Non-clustered index:** A separate data structure pointing to rows. DineOps's `idx_orders_tenant_status` is non-clustered — the rows stay in their physical order, the index is a separate B-tree.

---

### Q: What are SQL Views? How are they used in your project?

A **view** is a saved SQL query you can treat like a table. It doesn't store data — it computes on the fly.

**In DineOps (V24 migration):**

```sql
-- View for prep time analytics
CREATE VIEW vw_accurate_prep_times AS
SELECT
    o.id AS order_id,
    o.tenant_id,
    EXTRACT(EPOCH FROM (ready_time.changed_at - confirm_time.changed_at)) / 60 AS prep_minutes
FROM orders o
JOIN order_status_history confirm_time ON confirm_time.order_id = o.id AND confirm_time.new_status = 'CONFIRMED'
JOIN order_status_history ready_time   ON ready_time.order_id   = o.id AND ready_time.new_status = 'READY';
```

`AnalyticsService` queries this view instead of writing the complex JOIN every time. Views also ensure consistency — if the prep time calculation logic changes, you update the view definition in one place.

---

### Q: What is the difference between WHERE and HAVING?

| Clause | Filters | When |
|---|---|---|
| `WHERE` | Individual rows | Before grouping |
| `HAVING` | Groups/aggregates | After grouping |

**DineOps example (analytics query):**

```sql
-- Find menu items with more than 10 orders today (used in analytics)
SELECT menu_item_name, SUM(quantity) as total_sold
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.tenant_id = ?              -- WHERE: filter rows before grouping
  AND o.created_at >= CURRENT_DATE
GROUP BY menu_item_name
HAVING SUM(quantity) > 10          -- HAVING: filter groups after aggregation
ORDER BY total_sold DESC;
```

You can't use `HAVING SUM(quantity) > 10` without `GROUP BY`, and you can't use `WHERE SUM(quantity) > 10` because `SUM` is an aggregate — it doesn't exist at the row level.

---

### Q: Find the 2nd highest salary (or in DineOps context: 2nd highest order value).

```sql
-- Method 1: Subquery
SELECT MAX(total_amount) AS second_highest
FROM orders
WHERE total_amount < (SELECT MAX(total_amount) FROM orders)
  AND tenant_id = ?;

-- Method 2: LIMIT + OFFSET
SELECT DISTINCT total_amount
FROM orders
WHERE tenant_id = ?
ORDER BY total_amount DESC
LIMIT 1 OFFSET 1;

-- Method 3: Window function (most powerful, handles ties)
SELECT total_amount
FROM (
    SELECT total_amount, DENSE_RANK() OVER (ORDER BY total_amount DESC) AS rnk
    FROM orders WHERE tenant_id = ?
) ranked
WHERE rnk = 2
LIMIT 1;
```

`DENSE_RANK()` doesn't skip numbers on ties — if two orders share first place, the next is rank 2 (not 3).

---

### Q: What are window functions?

Window functions perform calculations across a set of rows related to the current row, **without collapsing them into a single row** like GROUP BY does.

**In DineOps (V24 — analytics views):**

```sql
-- Rank orders by total amount per tenant
SELECT
    id,
    tenant_id,
    total_amount,
    RANK() OVER (PARTITION BY tenant_id ORDER BY total_amount DESC) AS revenue_rank,
    SUM(total_amount) OVER (PARTITION BY tenant_id) AS tenant_total
FROM orders;
```

`PARTITION BY tenant_id` = "reset the window for each restaurant"
`ORDER BY total_amount DESC` = "rank within that window"

Common window functions: `RANK()`, `DENSE_RANK()`, `ROW_NUMBER()`, `LAG()`, `LEAD()`, `SUM() OVER`, `AVG() OVER`.

---

### Q: What is a CTE (Common Table Expression)?

A CTE is a named temporary result set defined with `WITH`. Makes complex queries readable.

```sql
-- DineOps: Find restaurants that exceeded their subscription limit this month
WITH monthly_order_counts AS (
    SELECT tenant_id, COUNT(*) AS order_count
    FROM orders
    WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
    GROUP BY tenant_id
),
subscription_limits AS (
    SELECT restaurant_id,
           CASE plan
               WHEN 'STARTER' THEN 300
               WHEN 'GROWTH'  THEN 2000
               ELSE 2147483647
           END AS monthly_limit
    FROM subscriptions WHERE status = 'ACTIVE'
)
SELECT r.name, moc.order_count, sl.monthly_limit
FROM monthly_order_counts moc
JOIN subscription_limits sl ON sl.restaurant_id = moc.tenant_id
JOIN restaurants r ON r.id = moc.tenant_id
WHERE moc.order_count > sl.monthly_limit;
```

---

### Q: What is a trigger? How does DineOps use it?

A trigger is a database procedure that runs automatically in response to an event (INSERT, UPDATE, DELETE).

**In DineOps (V6 migration):**

```sql
-- Trigger function — updates updated_at on every row change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Applied to every table
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

Every time any row in `orders` is updated, the trigger automatically sets `updated_at = NOW()`. No application code needed — the database enforces this.

---

### Q: Primary key, unique key, foreign key differences in your project.

| Key | DineOps Example | Purpose |
|---|---|---|
| **Primary Key** | `orders.id UUID` | Uniquely identifies each row. Auto-generated UUID. Cannot be null. |
| **Unique Key** | `restaurants.slug` (partial) | Ensures uniqueness but can be null. Partial here: `WHERE deleted_at IS NULL` |
| **Foreign Key** | `orders.tenant_id → restaurants.id` | Links one table to another. Enforces referential integrity. |
| **Composite Key** | `(order_id, menu_item_id)` in `order_items` | Could be used — DineOps uses a separate UUID PK but has unique constraints on composites |

**Referential integrity in DineOps:** If you try to insert an `order_item` with a `menu_item_id` that doesn't exist in `menu_items`, the DB raises a foreign key constraint error — caught by Spring as `DataIntegrityViolationException`.

---

## 13. React & Frontend

---

### Q: What is the Virtual DOM? How does it work?

**Real DOM:** A tree of HTML elements. Every change to the DOM triggers expensive recalculations (layout, paint, composite).

**Virtual DOM:** A lightweight JavaScript object representation of the real DOM. React makes changes to the virtual DOM first, diffs old vs new (Reconciliation), and then applies only the minimal actual DOM changes.

**In DineOps — KitchenPage:**

When a new order arrives via WebSocket, React:
1. Updates state with the new order
2. Re-renders the virtual DOM
3. Diffs: "only one new card was added in this column"
4. Updates only that one DOM element — not the entire board

Without Virtual DOM: the whole kitchen board would re-render on every order update.

---

### Q: What is Reconciliation?

Reconciliation is React's algorithm for determining what changed in the virtual DOM and applying the minimum necessary DOM updates.

**Key rule:** If an element's **type** changes, React destroys the old tree and builds new. If type stays the same, it updates props.

**In DineOps:** React uses `key={order.id}` on order cards in the kitchen Kanban:

```jsx
{activeOrders.map(order => (
    <OrderCard key={order.id} order={order} />
))}
```

The `key` tells React which order is which when the list changes. Without `key`, if the first order is removed, React would think all orders shifted — re-rendering every card. With `key`, React knows exactly which card to remove.

---

### Q: Explain React hooks in your project. What is `useEffect`?

**Hooks** let functional components have state and side effects (previously only possible in class components).

**Hooks used in DineOps:**

**`useState`** — stores and updates component state:
```jsx
// KitchenPage.tsx
const [orders, setOrders] = useState<OrderResponse[]>([]);
const [loading, setLoading] = useState(true);
```

**`useEffect`** — runs side effects (API calls, subscriptions, timers) after render:
```jsx
// KitchenPage.tsx
useEffect(() => {
    // Runs once on mount (empty dependency array [])
    const subscription = subscribeTenantOrders(tenantId, (newOrder) => {
        setOrders(prev => [...prev, newOrder]);
    });
    // Cleanup function — runs on unmount
    return () => subscription.unsubscribe();
}, []);  // [] = run once on mount only
```

**`useEffect` variations:**
```jsx
useEffect(() => { ... });           // runs after every render
useEffect(() => { ... }, []);       // runs once on mount
useEffect(() => { ... }, [tenantId]); // runs when tenantId changes
```

**`useContext`** — access global state (auth):
```jsx
const { user, token } = useContext(AuthContext);
```

**`useRef`** — reference a DOM element without re-rendering:
```jsx
const stompClientRef = useRef(null);  // WebSocket client persisted without causing re-renders
```

---

### Q: What is props drilling and how does DineOps avoid it?

**Props drilling:** Passing data through many levels of components even when only a deeply nested component needs it.

```
App
 └── DashboardLayout (passes user down)
      └── Sidebar (passes user down)
           └── UserAvatar (finally uses user)
```

**How DineOps avoids it:**

1. **Context API (`AuthContext`)** — User info, token, and auth functions are in a global context. Any component accesses it directly via `useContext(AuthContext)` without props.

2. **Zustand store (`cartStore`)** — Cart data is in a global Zustand store. The `OrderConfirmPage` and `PublicMenuPage` both access the cart directly — no props threading needed.

```jsx
// cartStore.ts — Zustand global store
const useCartStore = create(persist((set) => ({
    items: [],
    tenantId: null,
    addItem: (item) => set(state => ({ items: [...state.items, item] })),
    clearCart: () => set({ items: [], tenantId: null })
}), { name: 'dineops-cart' }));  // persists to localStorage

// Any component anywhere:
const { items, addItem } = useCartStore();  // no props needed
```

---

### Q: What is state management? What did you use instead of Redux?

**State management** means having a centralized, predictable way to store and update shared data.

**Redux** is the most popular state manager but has significant boilerplate (actions, reducers, store, dispatch, connect).

**DineOps uses Zustand** — simpler, less boilerplate, same concept:

```jsx
// cartStore.ts — Zustand
const useCartStore = create((set) => ({
    items: [],
    addItem: (item) => set((state) => ({ items: [...state.items, item] })),
    removeItem: (id) => set((state) => ({ items: state.items.filter(i => i.id !== id) }))
}));

// vs Redux equivalent (much more boilerplate):
// actionCreators.js + reducers.js + store.js + mapStateToProps + mapDispatchToProps + connect()
```

**AuthContext** handles the user session state (who's logged in).
**Zustand** handles the shopping cart.
**Local `useState`** handles component-specific UI state (loading, error, modal open/close).

---

### Q: What is CORS? Explain your CORS settings.

**CORS (Cross-Origin Resource Sharing):** Browsers block JavaScript from making requests to a different origin (domain/port) than the page's origin. CORS is the server's way of saying "I allow these other origins."

**DineOps CORS config:**

```yaml
# application.yml
app:
  cors:
    allowed-origins: ${CORS_ALLOWED_ORIGINS:http://localhost:5173}
    allowed-methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
    allowed-headers: "*"
    allow-credentials: true  # required for httpOnly cookies (refresh token)
```

```java
// SecurityConfig.java
configuration.setAllowedOriginPatterns(List.of(allowedOrigins));
configuration.setAllowedMethods(List.of("GET","POST","PUT","PATCH","DELETE","OPTIONS"));
configuration.setAllowCredentials(true);  // allows cookies to be sent cross-origin
```

`allow-credentials: true` is needed because the refresh token is an httpOnly cookie — without this, browsers won't send cookies on cross-origin requests.

---

### Q: What is TypeScript?

TypeScript is a superset of JavaScript that adds **static types**. It catches type errors at compile time (not at runtime).

**Why DineOps frontend uses TypeScript:**
```tsx
// Without TypeScript — crash at runtime if API changes
const price = order.totalAmount / 100;  // what if totalAmount is undefined? Runtime error.

// With TypeScript — caught at compile time
interface OrderResponse {
    totalAmount: number;  // TypeScript enforces this is always a number
    status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED';
}
const price = order.totalAmount / 100;  // safe — TypeScript guarantees it's a number
```

In DineOps, TypeScript interfaces match the Java DTOs exactly — if the API contract changes, TypeScript immediately highlights all places in the frontend that need updating.

---

## 14. OS · Networking · Git · DevOps

---

### Q: What happens when you type a URL in the browser?

Using `https://dineops.com/dashboard` as an example:

1. **DNS resolution** — browser asks DNS server: "What IP is dineops.com?" → gets IP address
2. **TCP 3-way handshake** — browser SYN → server SYN-ACK → browser ACK → connection established
3. **TLS handshake** — negotiate encryption, verify SSL certificate (HTTPS)
4. **HTTP request** — browser sends `GET /dashboard HTTP/1.1 Host: dineops.com`
5. **Load balancer/Nginx** — routes to a backend pod or serves static files
6. **React app served** — if first load, the HTML/JS bundle is sent back
7. **React bootstraps** — `DineopsBackendApplication` doesn't handle this; Vite/Nginx serves the static bundle
8. **React calls APIs** — the SPA then calls `GET /api/v1/auth/refresh` to check existing session
9. **Spring Boot handles API** — filter chain → controller → service → repository → PostgreSQL → response
10. **Page renders** — React renders the dashboard

---

### Q: What is Docker? Docker image vs container?

**Docker image** — a read-only template containing the application and all its dependencies (Java 21, the compiled JAR, application config). Like a recipe.

**Docker container** — a running instance of an image. Like a dish made from a recipe. Multiple containers can run from the same image.

**In DineOps (k8s/ and docker-compose):**

```dockerfile
# Build the JAR
FROM maven:3.9-eclipse-temurin-21 AS build
COPY . .
RUN mvn package -DskipTests

# Create lean runtime image
FROM eclipse-temurin:21-jre
COPY --from=build target/dineops-backend.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
```

`docker build -t dineops-backend .` → creates an image  
`docker run dineops-backend` → creates and starts a container from that image

---

### Q: What is Kubernetes?

Kubernetes (K8s) orchestrates containers — starts them, restarts failed ones, scales them up/down, routes traffic between them.

**DineOps k8s/ manifests include:**
- **Deployment** — run N replicas of the backend container, auto-restart if they crash
- **Service** — a stable network endpoint that routes to any healthy pod replica
- **HPA (Horizontal Pod Autoscaler)** — auto-scales pod count based on CPU/memory metrics
- **ConfigMap/Secret** — inject environment variables (DB URL, JWT secret) into pods

**Why it matters:** If one backend pod crashes at 2 AM, Kubernetes starts a replacement automatically. If traffic spikes, it adds more pods. Without Kubernetes, you'd have to do all this manually.

---

### Q: What is a CI/CD pipeline?

**CI (Continuous Integration):** Every code push runs automated tests. If tests fail, the merge is blocked.

**CD (Continuous Delivery/Deployment):** On successful merge, the code is automatically built, containerized, and deployed.

**DineOps pipeline (conceptual):**

```
Developer pushes code → GitHub
         ↓
[GitHub Actions / Jenkins CI]
    - mvn test (run unit tests)
    - mvn package (build JAR)
    - docker build (create image)
    - docker push (push to registry)
         ↓
[CD — Deploy]
    - kubectl apply -f k8s/ (update Kubernetes deployment)
    - Kubernetes rolls out new pods one by one (zero-downtime)
    - If health check fails → rollback automatically
```

---

### Q: Git commands — how you managed versions in your project.

```bash
# Basic workflow
git init                         # initialize repo
git add .                        # stage all changes
git commit -m "feat: add order state machine"
git push origin main             # push to remote

# Branching
git checkout -b feature/websocket-kitchen  # create feature branch
git merge feature/websocket-kitchen        # merge back
git branch -d feature/websocket-kitchen    # delete branch after merge

# Review changes
git status                       # see modified files
git diff                         # see line-level changes
git log --oneline               # commit history
git stash                        # temporarily save uncommitted changes

# Undo
git revert <commit-hash>         # safe undo — creates a new commit
git reset --soft HEAD~1          # undo last commit, keep changes staged
```

**Branching strategy in DineOps:**
- `main` — production-ready code only
- `feature/*` — one branch per feature (e.g., `feature/subscription-enforcement`)
- Pull request required to merge into main
- Flyway migration files versioned with git — conflicts in migration order are caught before merge

---

### Q: What is the OSI model? What layer do port numbers exist in?

| Layer | Name | Protocol | Example |
|---|---|---|---|
| 7 | Application | HTTP, HTTPS, WebSocket | DineOps API calls |
| 6 | Presentation | TLS/SSL | HTTPS encryption |
| 5 | Session | - | WebSocket session |
| 4 | **Transport** | **TCP, UDP** | **Port numbers live here** |
| 3 | Network | IP | IP address routing |
| 2 | Data Link | Ethernet | MAC addresses |
| 1 | Physical | Cables, Wi-Fi | Actual hardware |

**Port numbers exist in Layer 4 (Transport layer).** DineOps backend listens on port `8080` (TCP). HTTPS is port `443`. The database (PostgreSQL) listens on port `5432`.

---

### Q: What is horizontal scaling vs vertical scaling? (More depth)

**In DineOps with Kubernetes:**

**Vertical (scale up):** Change pod resource limits:
```yaml
resources:
  requests: { cpu: "500m", memory: "512Mi" }
  limits:   { cpu: "2000m", memory: "2Gi" }  # bigger machine
```
Limited by the largest available node. Single point of failure.

**Horizontal (scale out):** Add more pod replicas:
```yaml
# HPA config in k8s/
spec:
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
```
When CPU exceeds 70%, Kubernetes adds pods. When it drops, pods are removed. Works because DineOps is **stateless** — any pod can handle any request.

---

## 15. HR & Behavioral Questions

---

### Q: Describe your project.

> "I built DineOps — a multi-tenant restaurant management SaaS platform built with Spring Boot 3.5 and React 19. It allows multiple restaurants to manage their menus, orders, inventory, staff, and analytics from a single platform.
>
> The key technical challenges were: implementing shared-database multi-tenancy with strict tenant isolation using JWT-based authentication and custom security filters; building a real-time kitchen order board using WebSocket with STOMP protocol; designing a subscription enforcement system that gates order placement by plan limits; and DPDP compliance for user data deletion with a scheduled anonymization job.
>
> The backend has 25 Flyway database migrations, Redis-backed caching and rate limiting, AOP-based audit logging, and a full order state machine. The frontend uses React 19, TypeScript, Zustand for state management, and subscribes to WebSocket channels for live order updates."

---

### Q: Why did you choose this tech stack?

| Technology | Why Chosen |
|---|---|
| **Java 21** | Latest LTS — records, virtual threads (future), strong typing for a complex domain |
| **Spring Boot** | Industry standard for Java backends; massive ecosystem; Spring Security for JWT auth |
| **PostgreSQL** | ACID compliance for financial/order data; JSON support; advanced SQL (generated columns, partial indexes) |
| **Redis** | Dual use — caching (reduce DB load) and rate limiting (atomic counters across instances) |
| **React + TypeScript** | Component-based UI; TypeScript catches API contract mismatches at compile time |
| **Zustand** | Simpler than Redux, no boilerplate; `localStorage` persistence for the cart |
| **Flyway** | Version-controlled database migrations — reproducible schema across all environments |
| **Kubernetes** | Container orchestration for auto-scaling and zero-downtime deployments |

---

### Q: What challenges did you face during the project and how did you solve them?

**1. Multi-tenant data isolation:**
The biggest architectural challenge. Early iterations used manual `WHERE tenant_id = ?` in every query — error-prone and easy to forget. Solution: `TenantAuthorizationFilter` at the security layer + JPA `@SQLRestriction` at the entity layer — two independent layers of enforcement.

**2. WebSocket authentication:**
HTTP filters run once per request. WebSocket connections are persistent — the HTTP filter only runs at the initial handshake, not for each message. Solution: `WebSocketAuthInterceptor` validates the JWT at STOMP CONNECT time specifically.

**3. Price precision:**
Early testing showed floating-point errors when calculating order totals with decimal prices. Solution: Store all monetary values as integers (paise). No floating point in the entire financial pipeline.

**4. Cache invalidation with pagination:**
`Page<RestaurantResponse>` couldn't be deserialized from Redis due to Jackson's `PageImpl` handling. Solution: Explicitly exclude paginated endpoints from caching with a code comment explaining why, to prevent future developers from re-adding it.

**5. DPDP compliance design:**
Hard-deleting users would break order history (orphaned `performed_by` in audit logs). Solution: Soft-delete + anonymization — user data is anonymized (name, email, phone → generic values), but the row and audit trail remain for compliance.

---

### Q: What is different in your project? What makes it stand out?

1. **Production-grade security** — JWT with access + refresh token separation, httpOnly cookies, rate limiting, account lockout, CSRF protection, security headers (HSTS, CSP, X-Content-Type-Options)
2. **Real multi-tenancy** — not just filtering by user ID, but a full tenant isolation architecture with dedicated security filters
3. **DPDP compliance** — India's data protection law implemented with scheduled anonymization (rare in student projects)
4. **AOP audit logging** — every sensitive operation logged automatically without cluttering business code
5. **Full order state machine** — explicit transition rules, complete status history trail
6. **25 Flyway migrations** — production-style database schema evolution, not `ddl-auto: create-drop`
7. **Redis dual-use** — both application caching and rate limiting (not just one or the other)
8. **WebSocket real-time** — kitchen board and customer tracking page both update live

---

### Q: How did you optimize performance?

1. **Redis caching** — menu items cached 5 minutes, reducing 90%+ of read load on PostgreSQL
2. **Database indexes** — composite indexes on `(tenant_id, status)` and `(tenant_id, created_at)` for the most frequent query patterns
3. **HikariCP connection pooling** — 5-15 connections reused per instance, not opened/closed per request
4. **Pagination** — all list APIs paginated (never return unbounded result sets)
5. **SQL views** — complex analytics queries pre-defined as views (`vw_item_revenue`, `vw_accurate_prep_times`)
6. **Generated columns** — `meal_period` computed in PostgreSQL, not calculated in Java on every analytics call
7. **Price as integer** — eliminates floating-point calculations in the financial pipeline
8. **Lazy loading** — JPA relations are `LAZY` by default; eager loading only when explicitly needed

---

### Q: If a query in your project is taking a lot of time, how will you optimize it?

**Step 1 — Identify:** Use PostgreSQL's `EXPLAIN ANALYZE`:
```sql
EXPLAIN ANALYZE SELECT * FROM orders WHERE tenant_id = ? AND status = 'PENDING';
```
Look for "Seq Scan" (full table scan) — that's the bottleneck.

**Step 2 — Add indexes:** Add a composite index on `(tenant_id, status)` → turns Seq Scan into Index Scan.

**Step 3 — Avoid N+1:** Check if the slow query is actually N queries in disguise. Use `spring.jpa.show-sql=true` to see all queries.

**Step 4 — Cache it:** If it's a frequently-read, rarely-changed result (like the menu), add `@Cacheable` with Redis.

**Step 5 — Paginate:** If returning too many rows, add `Pageable` parameter.

**Step 6 — Denormalize if needed:** `tenant_id` is denormalized onto `order_items` (V23) so analytics queries don't need to join back to `orders` just to get the tenant.

---

### Q: Why should we hire you?

> "I've built a production-quality system, not just a CRUD app. I implemented real-world concerns that most projects skip — multi-tenant isolation, JWT security with refresh tokens, DPDP compliance, AOP audit logging, and Kubernetes deployment. I understand *why* each decision was made, not just what was coded. I can explain the trade-offs between soft delete vs hard delete, JWT vs sessions, Redis vs in-memory cache — because I faced those decisions and made them thoughtfully."

---

### Q: Where do you see yourself in 3/5 years?

> "In 3 years, I want to be someone who can independently design backend systems that handle real-world scale — writing code that teams can maintain years after I've written it. In 5 years, I'd like to mentor junior developers and contribute to architectural decisions, understanding not just how to build features, but how to build the right features the right way."

---

### Q: What are your strengths and weaknesses?

**Strength:** I dig into *why* things work the way they do. When I implemented JWT authentication, I didn't just follow a tutorial — I understood the access/refresh token separation, why the refresh token goes in an httpOnly cookie, and why CSRF is less of a concern with JWTs. That depth shows in the code.

**Weakness:** I sometimes over-engineer early on — I'll think about edge cases before the core feature works. I've been working on delivering working functionality first and refining later.

---

*Last updated: March 2026*
*All answers reference actual DineOps codebase code and decisions.*
