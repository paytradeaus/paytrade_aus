import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComplianceOfProjects } from 'src/entities/compliances.entity';
import { ProjectDetails } from 'src/entities/project-details.entity';
import { ComplianceChecker } from './compliance.checker';

describe('ComplianceChecker', () => {
  let checker: ComplianceChecker;
  let projectRepo: { find: jest.Mock };
  let complianceRepo: { createQueryBuilder: jest.Mock };

  beforeEach(async () => {
    projectRepo = { find: jest.fn() };
    const qb = {
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };
    complianceRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ComplianceChecker,
        { provide: getRepositoryToken(ComplianceOfProjects), useValue: complianceRepo },
        { provide: getRepositoryToken(ProjectDetails), useValue: projectRepo },
      ],
    }).compile();
    checker = moduleRef.get(ComplianceChecker);
  });

  it('returns no issues when company has no active projects', async () => {
    projectRepo.find.mockResolvedValue([
      { project_id: 1, project_name: 'P1', project_status: 'Archived' },
    ]);
    const issues = await checker.check(99);
    expect(issues).toEqual([]);
  });

  it('emits a critical issue per failing PTA/RTA check on active projects', async () => {
    projectRepo.find.mockResolvedValue([
      { project_id: 10, project_name: 'Site A', project_status: 'Active' },
    ]);
    complianceRepo.createQueryBuilder().getMany.mockResolvedValue([
      {
        project_id: 10,
        pta_compliances: [
          { check_status: 'FAILED', check_name: 'Daily reconciliation', check_number: 1 },
          { check_status: 'PASSED', check_name: 'Other', check_number: 2 },
        ],
        rta_compliances: [
          { check_status: 'FAILED', check_name: 'Retention transfer', check_number: 3 },
        ],
      },
    ]);
    const issues = await checker.check(99);
    expect(issues).toHaveLength(2);
    expect(issues.every((i) => i.severity === 'critical')).toBe(true);
    expect(issues[0].category).toBe('compliance');
    expect(issues[0].affectedRecordType).toBe('project');
  });
});
