import { Controller, Get } from '@nestjs/common';
import { Public } from 'src/api/auth/jwt-guard/public.decorator';

@Controller()
export class HealthController {
  @Public()
  @Get('health')
  check() {
    return { status: 'ok' };
  }
}
