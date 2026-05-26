---
name: XeroService cross-module providers
description: XeroService is provided in 6 different NestJS modules; new constructor dependencies must be wired into all of them.
---

# XeroService is provided in many modules

`XeroService` is listed in the `providers` array of (at least) six
different NestJS modules:

- `xero.module.ts`
- `client-suppliers-details.module.ts`
- `contract-details.module.ts`
- `projects.module.ts`
- `banking.module.ts`
- `xero-webhooks/webhook.module.ts`

Each module instantiates its own `XeroService` in its own DI context.

**Why:** NestJS resolves provider dependencies *within the requesting
module's context*. If you add a new constructor dependency to
`XeroService` but only register it (and its supporting `BullModule`
queues, repositories, etc.) in a subset of the above modules, the app
boots fine in development until a request hits a controller/resolver
hosted in one of the un-fixed modules — at which point Nest throws
`Nest can't resolve dependencies of the XeroService (... ?). Please
make sure that the argument <X> at index [N] is available in the
<Module> context.`

## How to apply

When you add a constructor argument to `XeroService`:

1. Find every module that lists `XeroService` in its `providers`:
   `rg "XeroService," back-end/src --type ts -l | xargs rg -l "providers:"`
2. In each of those modules:
   - Import the new provider class and add it to `providers`.
   - If it needs a Bull queue (e.g. `EmailQueueProducer` needs
     `mailQueue`), add the matching `BullModule.registerQueue({ name })`
     to `imports`.
   - If it needs a new TypeORM repository, add the entity to
     `TypeOrmModule.forFeature([...])`.
3. Restart the backend and confirm boot succeeds — the DI failure is
   loud and happens during `InstanceLoader`, so a clean startup log is
   sufficient verification.
