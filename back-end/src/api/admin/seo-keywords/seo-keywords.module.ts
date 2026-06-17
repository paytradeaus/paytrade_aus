import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeoKeyword } from 'src/entities/seo-keyword.entity';
import { SeoKeywordsService } from './seo-keywords.service';
import { SeoDraftService } from './seo-draft.service';
import { SeoKeywordsResolver } from './seo-keywords.resolver';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { UserDetails } from 'src/entities/user-details.entity';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { CmtyDiscussionsIdeas } from 'src/entities/cmty-discussion-idea.entity';
import { BlogResource } from 'src/entities/admin-blogs-resources.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SeoKeyword,
      UserDetails,
      AdminDetails,
      CmtyDiscussionsIdeas,
      BlogResource,
    ]),
  ],
  providers: [
    SeoKeywordsService,
    SeoDraftService,
    SeoKeywordsResolver,
    JwtInternalService,
  ],
  exports: [SeoKeywordsService],
})
export class SeoKeywordsModule {}
