import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../jwt-guard/jwt.strategy';
import { JwtAuthGuard } from '../jwt-guard/jwt-auth.guard';
import { AuthService } from './auth.service';
import { jwtConstants } from '../constants';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyUserRoles } from '../../../entities/company-user-roles.entity';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { UserDetails } from 'src/entities/user-details.entity';
import { CompanyDetails } from 'src/entities/company-details.entity';
import { SubscriptionDetails } from 'src/entities/subscription-details.entity';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: jwtConstants.secret,
      // signOptions: { expiresIn: '1d' },
    }),
    PassportModule,
    TypeOrmModule.forFeature([
      UserDetails,
      CompanyUserRoles,
      AdminDetails,
      CompanyDetails,
      SubscriptionDetails,
    ]),
  ],
  providers: [
    AuthService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    JwtStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
