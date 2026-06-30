import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComplianceOfProjects } from 'src/entities/compliances.entity';
import { ProjectDetails } from 'src/entities/project-details.entity';
import { StatusIssue } from '../types';

/**
 * Compliance checker — surfaces FAILED PTA/RTA compliance items per project,
 * scoped to the caller's company by joining ComplianceOfProjects.project_id
 * to ProjectDetails.project_id.
 */
@Injectable()
export class ComplianceChecker {
  constructor(
    @InjectRepository(ComplianceOfProjects)
    private readonly complianceRepo: Repository<ComplianceOfProjects>,
    @InjectRepository(ProjectDetails)
    private readonly projectRepo: Repository<ProjectDetails>,
  ) {}

  async check(companyId: number): Promise<StatusIssue[]> {
    const projects = await this.projectRepo.find({
      where: { company_id: companyId },
      select: [
        'project_id',
        'project_name',
        'project_status',
        'compliance_paused',
      ],
    });
    const activeProjects = projects.filter(
      (p) =>
        p.project_status !== 'Archived' &&
        p.project_status !== 'Deleted' &&
        p.project_status !== 'Draft' &&
        // Manual compliance pause: a paused project must not surface any
        // compliance system issues until it is explicitly resumed.
        p.compliance_paused !== true,
    );
    if (activeProjects.length === 0) return [];

    const projectIds = activeProjects.map((p) => p.project_id);
    const nameById = new Map(
      activeProjects.map((p) => [p.project_id, p.project_name]),
    );

    const rows = await this.complianceRepo
      .createQueryBuilder('cop')
      .where('cop.project_id IN (:...ids)', { ids: projectIds })
      .getMany();

    const issues: StatusIssue[] = [];
    const now = new Date().toISOString();
    for (const row of rows) {
      const failedPta = (row.pta_compliances || []).filter(
        (c) => c?.check_status === 'FAILED',
      );
      const failedRta = (row.rta_compliances || []).filter(
        (c) => c?.check_status === 'FAILED',
      );
      const projectName = nameById.get(row.project_id) ?? `#${row.project_id}`;
      for (const c of failedPta) {
        issues.push({
          id: `compliance:project:${row.project_id}:pta:${c.check_number}`,
          category: 'compliance',
          severity: 'critical',
          title: `PTA compliance failing on ${projectName}`,
          description: `${c.check_name} (rule check #${c.check_number}) is failing on the Project Trust Account.`,
          affectedRecordType: 'project',
          affectedRecordId: row.project_id,
          projectId: row.project_id,
          suggestedAction:
            'Open the project compliance panel and resolve the failing PTA check.',
          agentCanHelp: false,
          requiresApproval: true,
          detectedAt: now,
        });
      }
      for (const c of failedRta) {
        issues.push({
          id: `compliance:project:${row.project_id}:rta:${c.check_number}`,
          category: 'compliance',
          severity: 'critical',
          title: `RTA compliance failing on ${projectName}`,
          description: `${c.check_name} (rule check #${c.check_number}) is failing on the Retention Trust Account.`,
          affectedRecordType: 'project',
          affectedRecordId: row.project_id,
          projectId: row.project_id,
          suggestedAction:
            'Open the project compliance panel and resolve the failing RTA check.',
          agentCanHelp: false,
          requiresApproval: true,
          detectedAt: now,
        });
      }
    }
    return issues;
  }
}
