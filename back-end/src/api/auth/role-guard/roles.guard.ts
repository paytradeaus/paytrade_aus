import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from './role.enum';
import { ROLES_KEY } from './roles.decorator';
import { TokenExpiredError } from 'jsonwebtoken';
import { GqlExecutionContext } from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { Repository } from 'typeorm';
import { UserDetails } from 'src/entities/user-details.entity';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly jwtService: JwtService,
    @InjectRepository(UserDetails) private userDetails: Repository<UserDetails>,
    @InjectRepository(AdminDetails)
    private adminDetails: Repository<AdminDetails>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const ctx = GqlExecutionContext.create(context);
      const requiredRoles = this.reflector.getAllAndOverride<Role[]>(
        ROLES_KEY,
        [context.getHandler(), context.getClass()],
      );

      if (!requiredRoles) {
        return true;
      }

      const { user } = await ctx.getContext().req;
      const request = ctx.getContext().req;
      const token = request.headers.authorization?.split(' ')[1];
      if (!token) {
        throw new ForbiddenException('Authorization Token Required');
      }
      const decoded = await this.jwtService.verify(token);

      var email_id: string, role: boolean;
      const userData = await user;
      email_id = userData.emailId;

      if (userData.isAdmin) {
        const dbAdmin: any = await this.adminDetails.findOne({
          where: { email_id, admin_status: 'Active' },
        });
        role = requiredRoles.includes(dbAdmin?.admin_role);
      } else {
        const whereConditions: any =
          userData?.logged_in_by && userData?.admin_id
            ? { email_id }
            : { email_id, user_status: 'Active' };
        const dbUser: any = await this.userDetails.findOne({
          where: whereConditions,
        });
        role = requiredRoles.includes(dbUser?.user_role);
      }
      return role;
    } catch (error) {
      // return false;
      // throw new Error(error.message);
      if (error instanceof TokenExpiredError) {
        throw new ForbiddenException(
          'Your session has expired. Please log in again.',
        );
      }
      console.error('Error in RolesGuard:', error);
      throw new ForbiddenException('Access denied.');
    }
  }
}
