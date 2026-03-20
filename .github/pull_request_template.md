## Summary
- What changed and why?
- Keep this focused on intent, not just file names.

## Linked Ticket
- DOPS: `DOPS-XXX`
- Closes: `#<issue-number>`

## Change Type
- [ ] fix
- [ ] feat
- [ ] refactor
- [ ] security
- [ ] test
- [ ] chore
- [ ] perf
- [ ] docs

## Scope
- Backend:
- Frontend:
- Infra/Docs:

## Test Plan
- [ ] `./mvnw -q -DskipTests compile`
- [ ] Backend tests: `<command>`
- [ ] Frontend tests: `<command>`
- [ ] Manual verification completed (if applicable)

### Manual Verification Notes
- Endpoint(s) tested:
- Input/Output observed:
- Edge cases checked:

## Acceptance Criteria Check
Copy the criteria from `docs/TICKETS.md` for this ticket and mark status.
- [ ] Criteria 1
- [ ] Criteria 2
- [ ] Criteria 3

## Security / Risk Notes
- Any auth, data exposure, tenant isolation, or secret-handling impact?
- Any migration risk / rollback notes?

## Checklist
- [ ] No secrets or credentials committed
- [ ] No JPA entities returned directly from controllers (unless intentional and justified)
- [ ] Logs are meaningful and do not leak sensitive data
- [ ] `docs/TICKETS.md` updated for ticket status
- [ ] CI passes
