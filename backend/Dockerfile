# ── Build stage ──────────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app

# Cache Maven wrapper and dependencies before copying source
COPY mvnw .
COPY .mvn .mvn
RUN chmod +x ./mvnw
COPY pom.xml .
RUN ./mvnw dependency:go-offline -B -q

COPY src ./src
RUN ./mvnw package -DskipTests -B -q

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine

# Security: run as non-root
RUN addgroup -S app && adduser -S app -G app

WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
RUN chown -R app:app /app

USER app

# Production JVM flags:
#   - Container-aware heap (uses cgroup limits)
#   - G1GC with 200ms max pause target
#   - Pre-touch heap pages to avoid latency on first use
#   - Disable DNS caching beyond 30s (important for cloud service discovery)
#   - Explicit file encoding
ENV JAVA_OPTS="\
  -XX:+UseContainerSupport \
  -XX:MaxRAMPercentage=75.0 \
  -XX:InitialRAMPercentage=50.0 \
  -XX:+UseG1GC \
  -XX:MaxGCPauseMillis=200 \
  -XX:+AlwaysPreTouch \
  -Djava.security.egd=file:/dev/./urandom \
  -Dsun.net.inetaddr.ttl=30 \
  -Dfile.encoding=UTF-8"

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -qO- http://localhost:8080/actuator/health | grep -q '"status":"UP"' || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
