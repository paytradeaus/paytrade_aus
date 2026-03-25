import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Public } from 'src/api/auth/jwt-guard/public.decorator';

@Controller()
export class HealthController {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  @Public()
  @Get('health')
  async check(@Res() res: Response) {
    const checks: Record<string, string> = {};
    let healthy = true;

    try {
      await this.dataSource.query('SELECT 1');
      checks.database = 'ok';
    } catch (err) {
      checks.database = 'unhealthy';
      healthy = false;
    }

    const statusCode = healthy ? 200 : 503;
    return res.status(statusCode).json({
      status: healthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    });
  }
}
