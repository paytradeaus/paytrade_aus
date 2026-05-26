---
name: Locally-provided shared services need @Optional + standalone DI module
description: When a service like CompliancesService or XeroService is locally provided in many sibling modules (to avoid a circular import of the owner module), adding a new injected dep to it has two sharp edges that both must be solved at once.
---

The trap

- A shared NestJS service (e.g. `CompliancesService`, `XeroService`) is
  registered as a local `providers:` entry in N sibling modules instead
  of those modules importing the owner module. This pattern exists
  specifically to avoid circular imports between sibling user-facing
  modules and the owner module.
- When you add a new constructor dependency to that service, two things
  break independently:
  1. **Boot crash** — every sibling module that locally provides the
     service must now be able to resolve the new dep, or
     `Nest can't resolve dependencies of <Service> ... argument at
     index [N] is available in the <Sibling>Module context` at boot.
  2. **Silent no-op** — even if you mark the param `@Optional()` to
     keep boot green, every sibling-instantiated copy of the service
     gets `undefined` for that dep, so whatever feature the dep
     powers silently does nothing in exactly the modules that need it.

Both must be solved together. TypeScript `?` alone does NOT help —
Nest's DI ignores the `?` and still requires the token.

The fix

- Put the new dep + its module-level deps (queues, repos) into a tiny
  standalone module that depends only on cheap leaf things (BullMQ
  registerQueue, TypeOrmModule.forFeature, ...). Export the new dep
  and the BullModule / TypeOrmModule re-exports.
- Add `@Optional()` to the new constructor param on the shared service
  so modules that don't import the small module still boot.
- In the owner module: import the small module instead of registering
  the queue / repo inline.
- In every sibling module that locally provides the shared service AND
  needs the feature to actually work: import the small module too.
  Now Nest resolves the new dep from the imported module's exports
  when constructing the local copy of the shared service.

**Why:** The first time this was learned the hard way on Task #297 —
adding `ComplianceRefreshProducer` to `CompliancesService` crashed boot
in `NoticesModule` (which locally provides `CompliancesService`).
Marking the param optional fixed boot but turned every
`markComplianceDirty` call from payments / bank-accounts / contracts /
notices into a silent no-op, defeating the entire feature.

**How to apply:** Whenever you add a new dep to a service that you can
see is `providers: [...]`'d in multiple modules across `rg -l
"providers:.*ThatService" --type ts -g '*.module.ts'`, decide:
- Will the dep be called from those sibling modules' write paths?
  If yes → standalone module + `@Optional()` everywhere.
- If only the owner module needs the new behaviour → still mark
  `@Optional()` to keep sibling modules booting, and document that
  the new behaviour is owner-only.
