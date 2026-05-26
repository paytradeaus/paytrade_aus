import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplianceCheckpoint } from 'src/entities/compliance-details-pro-acc.entity';
import { ComplianceRefreshProducer } from './compliance-refresh.producer';
import { COMPLIANCE_REFRESH_QUEUE } from './compliance-refresh.queue';

/**
 * Task #297 — standalone DI surface for the compliance cache
 * invalidator.
 *
 * `CompliancesService` is registered as a local provider inside several
 * sibling modules (`NoticesModule`, `BankingModule`, `ContractDetails`,
 * `ProjectsModule`, etc.) that cannot import `CompliancesModule` itself
 * without creating a circular dependency. Those modules still need to
 * be able to call `compliancesService.markComplianceDirty(...)` after
 * their writes — which only works if their local `CompliancesService`
 * instance has `ComplianceRefreshProducer` injected.
 *
 * Pulling the producer + its BullMQ queue + `ComplianceCheckpoint`
 * repository into this tiny module lets every interested module import
 * it cheaply (no circular risk — it depends only on BullMQ +
 * TypeORM(ComplianceCheckpoint)) and Nest then resolves the producer
 * for any sibling-instantiated `CompliancesService` via the imported
 * module's exports.
 *
 * The refresh worker (`ComplianceRefreshConsumer`) stays in
 * `CompliancesModule` because it needs `CompliancesService` itself.
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: COMPLIANCE_REFRESH_QUEUE }),
    TypeOrmModule.forFeature([ComplianceCheckpoint]),
  ],
  providers: [ComplianceRefreshProducer],
  exports: [ComplianceRefreshProducer, BullModule, TypeOrmModule],
})
export class ComplianceRefreshModule {}
