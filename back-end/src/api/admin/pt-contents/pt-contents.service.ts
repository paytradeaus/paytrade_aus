import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Contents } from 'src/entities/admin-contents.entity';
import { MasterTypes } from 'src/entities/master-types.entity';
import { Brackets, In, Repository } from 'typeorm';
import { AddContentInput } from './dto/add-content.dto';
import { UpdateContentInput } from './dto/update-content.dto';
import { EmailTemplates } from 'src/entities/email-templates.entity';
import { UpdateMailTemplateInput } from './dto/update-mail-template.dto';
import { BlogResource } from 'src/entities/admin-blogs-resources.entity';
import {
  BlogComments,
} from 'src/entities/admin-blog-comments.entity';
import slugify from 'slugify';
import { AddBlogResourceInput } from './dto/add-blog-resource.dto';
import { AdminDetails } from 'src/entities/admin-details.entity';
import { ListBlogResourceInput } from './dto/list-blog-resource.dto';
import { UpdateBlogResourceInput } from './dto/update-blog-resource.dto';
import { AddBlogCommentInput } from './dto/add-blog-comment.dto';
import { ManageBlogCommentInput } from './dto/manage-blog-comment.dto';
import { UserDetails } from 'src/entities/user-details.entity';
import { FileAttachments } from 'src/entities/file-attachments.entity';
import { readFileSync } from 'fs';
import { ListBlogCommentsInput } from './dto/list-blog-comments.dto';
import { SortingOrder } from '../pt-admin/dto/add-admin.dto';
import { extract } from '@extractus/oembed-extractor'
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
var moment = require('moment-timezone');
moment.tz.setDefault('UTC');

@Injectable()
export class PtContentsService {
  private logger: PaytradeLogger;
  constructor(
    @InjectRepository(Contents) private contentDetails: Repository<Contents>,
    @InjectRepository(MasterTypes)
    private masterDetails: Repository<MasterTypes>,
    @InjectRepository(EmailTemplates)
    private emailTemplates: Repository<EmailTemplates>,
    @InjectRepository(BlogResource)
    private BlogResource: Repository<BlogResource>,
    @InjectRepository(AdminDetails)
    private adminDetails: Repository<AdminDetails>,
    @InjectRepository(BlogComments)
    private blogComments: Repository<BlogComments>,
    @InjectRepository(UserDetails) private userDetails: Repository<UserDetails>,
    @InjectRepository(FileAttachments)
    private fileAttachments: Repository<FileAttachments>,
  ) {
    this.logger = new PaytradeLogger('CONTENTS_SERVICE');
  }

  async create(addContentInput: AddContentInput) {
    const content = this.contentDetails.create({
      pageType: addContentInput.pageType,
      heading: addContentInput.heading,
      body: addContentInput.body,
    });
    return await this.contentDetails.save(content);
  }

  async listContents(
    keyword: string,
    pageType: string,
    page: number,
    perPage: number,
    sorting_field: string,
    sorting_order: SortingOrder | 'DESC',
  ): Promise<any> {
    const queryBuilder = this.contentDetails.createQueryBuilder('content');
    if (pageType) {
      queryBuilder.andWhere('content.pageType = :pageType', { pageType });
    }
    if (keyword) {
      queryBuilder.andWhere(`(LOWER(content.heading) LIKE :keyword)`, {
        keyword: `%${keyword.toLowerCase()}%`,
      });
    }

    if (!sorting_field) {
      queryBuilder.orderBy({ 'content.created_on': sorting_order });
    }
    if (sorting_field) {
      switch (sorting_field) {
        case 'pageType':
          {
            queryBuilder.orderBy({ 'LOWER(content.pageType)': sorting_order });
          }
          break;
        case 'body':
          {
            queryBuilder.orderBy({ 'LOWER(content.body)': sorting_order });
          }
          break;
        case 'updated_on':
          {
            queryBuilder.orderBy('content.updated_on', sorting_order);
          }
          break;
      }
    }

    const [rawResults, totalCount] = await Promise.all([
      queryBuilder.getMany(),
      queryBuilder.getCount(),
    ]);

    const page_number = page;
    const items_per_page = perPage;

    const startIndex =
      page_number && items_per_page ? (page_number - 1) * items_per_page : 0;
    const endIndex =
      page_number && items_per_page
        ? Math.min(
          (page_number - 1) * items_per_page + items_per_page,
          totalCount,
        )
        : totalCount;

    const Contents = rawResults.slice(startIndex, endIndex);

    Contents.forEach((content) => {
      if (content.body.length > 200) {
        content.body = content.body.substring(0, 200) + '...';
      }
    });
    return { Contents, totalCount };
  }

  async getContentsByPageType(pageType: string): Promise<any> {
    const queryBuilder = this.contentDetails.createQueryBuilder('content');
    if (pageType) {
      queryBuilder.andWhere('content.pageType = :pageType', { pageType });
    }
    const [Contents] = await Promise.all([
      queryBuilder.orderBy({ 'content.created_on': 'DESC' }).getMany(),
      queryBuilder.getCount(),
    ]);
    const contentsBySection = {};
    Contents.forEach((content) => {
      const section = content.section;
      if (!contentsBySection[section]) {
        contentsBySection[section] = [];
      }
      contentsBySection[section].push(content);
    });

    return contentsBySection;
  }

  async updateContent(updateContentInput: UpdateContentInput) {
    const content = await this.contentDetails.findOne({
      where: { id: updateContentInput.id },
    });
    if (!content) {
      throw new Error(`Content data does not exist.`);
    }
    const updatedContent = { ...content, ...updateContentInput };
    updatedContent.heading = updateContentInput.heading || content.heading;
    updatedContent.body = updateContentInput.body || content.body;
    return await this.contentDetails.save(updatedContent);
  }

  async getContentById(id: string) {
    const result = await this.contentDetails.findOne({
      where: { id: id },
    });
    if (!result) {
      throw new Error(`Content with id ${id} not found`);
    }

    return result;
  }

  async getContentByHead(content_heading: string) {
    const result = await this.contentDetails.findOne({
      where: { heading: content_heading },
    });
    if (!result) {
      // Handle the case where no data is found for the given id
      throw new Error(`Content ${content_heading} not found`);
    }

    return result;
  }

  async getMailTemplateById(id: string) {
    const result = await this.emailTemplates.findOne({
      where: { id: id },
    });
    if (!result) {
      // Handle the case where no data is found for the given id
      throw new Error(`Template with id ${id} not found`);
    }
    return result;
  }

  async extractIframeSrc(html: string) {
    const match = html.match(/src="([^"]+)"/);
    return match ? match[1] : null;
  }

  async convertToEmbedUrl(link_url: string) {

    if (link_url.includes('embed')) {
      throw new Error(`The link is already embedded`);
    }
    else {
      const embedJson = await extract(link_url);
      const embedUrlhtml = (embedJson as any).html;
      const embedUrl = await this.extractIframeSrc(embedUrlhtml);
      if (!embedUrl) {
        // Handle the case where no data is found url
        throw new Error(`link not found`);
      }
      return embedUrl;
    }
  }

  async getMailTemplateByMailType(mailType: string) {
    const result = await this.emailTemplates.findOne({
      where: { email_type: mailType },
    });
    if (!result) {
      // Handle the case where no data is found for the given id
      throw new Error(`Template ${mailType} not found`);
    }
    return result;
  }

  async listMailTemplates(
    keyword: string,
    category: string,
    mailType: string,
    page: number,
    perPage: number,
    sorting_field: string,
    sorting_order: SortingOrder | 'DESC',
  ): Promise<any> {
    const queryBuilder = this.emailTemplates.createQueryBuilder('mails');
    if (category) {
      queryBuilder.andWhere('mails.category = :category', { category });
    }
    if (mailType) {
      queryBuilder.andWhere('mails.email_type = :mailType', { mailType });
    }
    if (keyword) {
      queryBuilder.andWhere(`(LOWER(mails.email_subject) LIKE :keyword)`, {
        keyword: `%${keyword.toLowerCase()}%`,
      });
    }
    if (!sorting_field) {
      queryBuilder.orderBy({ 'mails.created_on': sorting_order });
    }
    if (sorting_field) {
      switch (sorting_field) {
        case 'category':
          {
            queryBuilder.orderBy({
              'LOWER(CAST(mails.category AS text))': sorting_order,
            });
          }
          break;
        case 'email_subject':
          {
            queryBuilder.orderBy({
              'LOWER(mails.email_subject)': sorting_order,
            });
          }
          break;
        case 'updated_on':
          {
            queryBuilder.orderBy('mails.updated_on', sorting_order);
          }
          break;
      }
    }

    const [rawResults, totalCount] = await Promise.all([
      queryBuilder.getMany(),
      queryBuilder.getCount(),
    ]);

    const page_number = page;
    const items_per_page = perPage;

    const startIndex =
      page_number && items_per_page ? (page_number - 1) * items_per_page : 0;
    const endIndex =
      page_number && items_per_page
        ? Math.min(
          (page_number - 1) * items_per_page + items_per_page,
          totalCount,
        )
        : totalCount;

    // Slice the results array to get the results for the current page
    const mailTemplates = rawResults.slice(startIndex, endIndex);

    mailTemplates.forEach((mailTemplates) => {
      if (mailTemplates.email_content.length > 200) {
        mailTemplates.email_content =
          mailTemplates.email_content.substring(0, 200) + '...';
      }
    });
    return { mailTemplates, totalCount };
  }

  async updateMailTemplate(updateMailTemplateInput: UpdateMailTemplateInput) {
      this.logger.log(
      `Admin updates mail template with payload:  (${JSON.stringify(updateMailTemplateInput)})`,
    );
    const mailTemplate = await this.emailTemplates.findOne({
      where: { id: updateMailTemplateInput.id },
    });
    if (!mailTemplate) {
      throw new Error(`Content data does not exist.`);
    }
    const updatedMailTemplate = { ...mailTemplate, ...updateMailTemplateInput };
    updatedMailTemplate.email_type =
      updatedMailTemplate.email_type || mailTemplate.email_type;
    updatedMailTemplate.email_subject =
      updatedMailTemplate.email_subject || mailTemplate.email_subject;
    updatedMailTemplate.email_content =
      updatedMailTemplate.email_content || mailTemplate.email_content;
    updatedMailTemplate.category =
      updatedMailTemplate.category || mailTemplate.category;
    return await this.emailTemplates.save(updatedMailTemplate);
  }

  async createBlogResource(
    decoded: any,
    addBlogResourceInput: AddBlogResourceInput,
  ) {
    this.logger.log(
      `Admin creates Blogs / resources with payload:  (${JSON.stringify(addBlogResourceInput)})`,
    );
    const blogAuthor = await this.adminDetails.findOne({
      where: { id: decoded?.id },
    });
    const blogCategory = await this.masterDetails.findOne({
      where: { id: addBlogResourceInput.categoryId },
    });
    if (!blogCategory) {
      throw new Error(`Blog/Resource category does not exist.`);
    }

    const titleNCategory = `${blogCategory.value} ${addBlogResourceInput.title}`;
    const slug = slugify(titleNCategory, { lower: true });
    const blogResource = this.BlogResource.create({
      ...addBlogResourceInput,
      category: blogCategory,
      urlSlug: slug,
      author: blogAuthor,
    });
    if (addBlogResourceInput.blog_status != undefined) {
      if (addBlogResourceInput.blog_status === 'Published') {
        const currentDate = new Date();
        blogResource.published_on = currentDate;
      } else {
        blogResource.published_on = null;
      }
    }
    return await this.BlogResource.save(blogResource);
  }

  async getBlogResourceById(id: string) {
    const result = await this.BlogResource.createQueryBuilder('blog')
      .leftJoinAndSelect('blog.category', 'category')
      .leftJoinAndSelect('blog.comment', 'comment')
      .leftJoinAndSelect('blog.author', 'author')
      .leftJoinAndSelect('blog.attachment', 'attachment')
      .leftJoinAndSelect('blog.banner', 'banner')
      .where('blog.id = :id', { id })
      .getOne();

    if (!result) {
      throw new Error(`Blog/Resource ${id} not found`);
    }
    const blogResource = await this.addAttachmentURLtoBlogs(result);
    return blogResource;
  }

  async getBlogResourceByName(name: string) {
    const result = await this.BlogResource.createQueryBuilder('blog')
      .leftJoinAndSelect('blog.category', 'category')
      .leftJoinAndSelect('blog.author', 'author')
      .where('blog.title = :title', { title: name })
      .getOne();

    if (!result) {
      throw new Error(`Blog/Resource ${name} not found`);
    }
    return result;
  }

  async getBlogResourceWithRecommByIdSlug(slug_or_id: string) {
    // Check if the input is a valid UUID (assuming ID is UUID)
    let result;
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        slug_or_id,
      );

    if (isUUID) {
      // If it's a valid UUID
      // result = await this.BlogResource.findOne({
      //     where: { id: slug_or_id },
      //     relations: ['category', 'comment', 'author', 'attachment', 'banner']
      // });
      result = await this.BlogResource.createQueryBuilder('blog')
        .leftJoinAndSelect('blog.category', 'category')
        .leftJoinAndSelect('blog.author', 'author')
        .leftJoinAndSelect('blog.attachment', 'attachment')
        .leftJoinAndSelect('blog.banner', 'banner')
        .leftJoinAndSelect(
          'blog.comment',
          'comment',
          'comment.comment_status = :cmtstatus',
          { cmtstatus: 'Approved' },
        )
        .where('blog.id = :id', { id: slug_or_id })
        .getOne();
    } else {
      // Otherwise, treat it as slug
      result = await this.BlogResource.createQueryBuilder('blog')
        .leftJoinAndSelect('blog.category', 'category')
        .leftJoinAndSelect('blog.author', 'author')
        .leftJoinAndSelect('blog.attachment', 'attachment')
        .leftJoinAndSelect('blog.banner', 'banner')
        .leftJoinAndSelect(
          'blog.comment',
          'comment',
          'comment.comment_status = :cmtstatus',
          { cmtstatus: 'Approved' },
        )
        .where('blog.urlSlug = :slug', { slug: slug_or_id })
        .getOne();
    }
    if (!result) {
      throw new Error(`Blog/Resource ${slug_or_id} not found`);
    }
    for (const comment of result.comment) {
      const commentOwner = await this.userDetails.findOne({
        where: { user_id: comment.comment_by },
      });
      if (commentOwner) {
        const commentOwnerImage = await this.fileAttachments.findOne({
          where: { id: commentOwner.profile_id },
        });
        // If user found, fetch profilePicID and add it to comment
        comment.comment_owner_name =
          commentOwner.first_name + ' ' + commentOwner.last_name;
        if (commentOwnerImage.file_path) {
          try {
            const image = readFileSync(commentOwnerImage.file_path, {
              encoding: 'base64',
            });
            const userImg = `data:${commentOwnerImage.file_type};base64,${image}`;
            comment.comment_owner_image_base64 = userImg;
          } catch {
            comment.comment_owner_image_base64 = null;
          }
        }
      }
    }

    const blogResource = await this.addAttachmentURLtoBlogs(result);
    // const commentOwner = await this.userDetails.findOne({where: { id: result.comment.commentOwner}})
    const contentType = blogResource.content_type;
    //getting suggestions for the blog
    const suggestions = await this.BlogResource.createQueryBuilder('blog')
      .leftJoinAndSelect('blog.category', 'category')
      .leftJoinAndSelect(
        'blog.comment',
        'comment',
        'comment.comment_status = :cmtstatus',
        { cmtstatus: 'Approved' },
      )
      .leftJoinAndSelect('blog.author', 'author')
      .leftJoinAndSelect('blog.attachment', 'attachment')
      .leftJoinAndSelect('blog.banner', 'banner')
      .where('blog.id != :blogId', { blogId: result.id })
      .andWhere('blog.content_type = :type', { type: contentType })
      .andWhere('blog.blog_status = :status', { status: 'Published' })
      .andWhere(
        new Brackets((recm) => {
          if (result.tags && result.tags.length > 0) {
            recm
              .where('blog.tags @> ARRAY[:...tags]', { tags: result.tags })
              .orWhere('category.id = :categoryId', {
                categoryId: result.category.id,
              });
          } else {
            recm.where('category.id = :categoryId', {
              categoryId: result.category.id,
            });
          }
        }),
      )
      .take(6)
      .getMany();

    suggestions.forEach((suggestion) => {
      // Assuming `banner` property contains the file path
      if (suggestion.banner) {
        // Modify the file path by adding a new string
        suggestion.banner.file_path =
          process.env.UPLOAD_BASE_URL +
          suggestion.banner.file_path.replace(/\\/g, '/');
      }
    });

    return { blogResource, suggestions };
  }

  async adminlistBlogResources(
    listBlogResourceInput: ListBlogResourceInput,
    timezone,
  ): Promise<any> {
    const queryBuilder = this.BlogResource.createQueryBuilder('blog');
    queryBuilder.leftJoinAndSelect('blog.category', 'category');
    queryBuilder.leftJoinAndSelect('blog.comment', 'comment');
    queryBuilder.leftJoinAndSelect('blog.author', 'author');
    queryBuilder.leftJoinAndSelect('blog.attachment', 'attachment');
    queryBuilder.leftJoinAndSelect('blog.banner', 'banner');
    if (listBlogResourceInput.status) {
      queryBuilder.andWhere('blog.blog_status = :status', {
        status: listBlogResourceInput.status,
      });
    } else {
      queryBuilder.andWhere('blog.blog_status != :deleteStatus', {
        deleteStatus: 'Deleted',
      });
    }
    if (listBlogResourceInput.category) {
      queryBuilder.andWhere('category.value = :category', {
        category: listBlogResourceInput.category,
      });
    }
    if (listBlogResourceInput.author) {
      queryBuilder.andWhere('author.id = :id', {
        id: listBlogResourceInput.author,
      });
    }
    if (listBlogResourceInput.contentType) {
      queryBuilder.andWhere('blog.content_type = :contentType', {
        contentType: listBlogResourceInput.contentType,
      });
    }
    if (listBlogResourceInput.keyword) {
      queryBuilder.andWhere(`(LOWER(blog.title) LIKE :keyword)`, {
        keyword: `%${listBlogResourceInput.keyword.toLowerCase()}%`,
      });
    }

    if (listBlogResourceInput.date_filter && timezone) {
      let startDate, endDate;
      if (
        listBlogResourceInput.date_filter === 'Custom' &&
        listBlogResourceInput.start_date &&
        listBlogResourceInput.end_date
      ) {
        startDate = moment
          .tz(listBlogResourceInput.start_date, timezone)
          .startOf('day')
          .utc()
          .toDate();
        endDate = moment
          .tz(listBlogResourceInput.end_date, timezone)
          .endOf('day')
          .utc()
          .toDate();
      } else if (listBlogResourceInput.date_filter === 'This Month') {
        startDate = moment.tz(timezone).startOf('month').utc().toDate();
        endDate = moment.tz(timezone).endOf('month').utc().toDate();
      } else if (listBlogResourceInput.date_filter === 'Last Month') {
        startDate = moment
          .tz(timezone)
          .subtract(1, 'month')
          .startOf('month')
          .utc()
          .toDate();
        endDate = moment
          .tz(timezone)
          .subtract(1, 'month')
          .endOf('month')
          .utc()
          .toDate();
      }
      queryBuilder.andWhere(
        `(blog.published_on BETWEEN :start_date AND :end_date OR blog.created_on BETWEEN :start_date AND :end_date)`,
        {
          start_date: startDate,
          end_date: endDate,
        },
      );
    }

    const sorting_order = listBlogResourceInput.sorting_order
      ? listBlogResourceInput.sorting_order
      : 'DESC';

    if (!listBlogResourceInput.sorting_field) {
      queryBuilder.orderBy({ 'blog.updated_on': sorting_order });
    }
    if (listBlogResourceInput.sorting_field) {
      switch (listBlogResourceInput.sorting_field) {
        case 'category':
          {
            queryBuilder.orderBy('LOWER(category.value)', sorting_order);
          }
          break;
        case 'title':
          {
            queryBuilder.orderBy({ 'LOWER(blog.title)': sorting_order });
          }
          break;
        case 'author':
          {
            queryBuilder.orderBy({ 'LOWER(author.first_name)': sorting_order });
          }
          break;
        case 'created_on':
          {
            queryBuilder.orderBy({ 'blog.created_on': sorting_order });
          }
          break;
        case 'published_on':
          {
            queryBuilder.orderBy({ 'blog.published_on': sorting_order });
          }
          break;
        case 'blog_status':
          {
            queryBuilder.orderBy({
              'LOWER(CAST(blog.blog_status AS text))': sorting_order,
            });
          }
          break;
      }
    }

    const [allblogResources, totalCount] = await Promise.all([
      queryBuilder.getMany(),
      queryBuilder.getCount(),
    ]);

    const page_number = listBlogResourceInput.page;
    const items_per_page = listBlogResourceInput.perPage;

    const startIndex =
      page_number && items_per_page ? (page_number - 1) * items_per_page : 0;
    const endIndex =
      page_number && items_per_page
        ? Math.min(
          (page_number - 1) * items_per_page + items_per_page,
          totalCount,
        )
        : totalCount;
    // Slice the results array to get the results for the current page
    const blogResources = allblogResources?.slice(startIndex, endIndex);

    const processedBlogResources = await Promise.all(
      blogResources.map(async (blog) => {
        const commentsCount = blog.comment.length;
        const pendingCommentsCount = blog.comment.filter(
          (comment) => comment.comment_status === 'Pending',
        ).length;
        const processedBlog = await this.addAttachmentURLtoBlogs(blog);
        return {
          ...(processedBlog as any),
          pending_comments_count: pendingCommentsCount,
          comments_count: commentsCount,
        };
      }),
    );
    return { blogResources: processedBlogResources, totalCount };
  }

  async adminlistBlogResAuthors(): Promise<any> {

    this.logger.log(
      `Admin list all blog/resource authors`,
    );
    const queryBuilder = this.BlogResource.createQueryBuilder('blog');
    queryBuilder
      .leftJoinAndSelect('blog.author', 'author')
      .where('blog.blog_status != :deleteStatus', {
        deleteStatus: 'Deleted',
      })
      .orderBy({ 'author.first_name': 'ASC' });
    const blogResAuthors = await queryBuilder.getMany();

    const uniqueAuthors = new Map<
      string,
      { id: string; first_name: string; last_name: string; email_id: string }
    >();
    blogResAuthors.forEach((blog) => {
      const authorId = blog.author.id;
      if (!uniqueAuthors.has(authorId)) {
        uniqueAuthors.set(authorId, {
          id: blog.author.id,
          first_name: blog.author.first_name,
          last_name: blog.author.last_name,
          email_id: blog.author.email_id,
        });
      }
    });

    const uniqueAuthorsArray = Array.from(uniqueAuthors.values());
    const uniqueAuthorsCount = uniqueAuthorsArray.length;
    return {
      blogResAuthors: uniqueAuthorsArray,
      totalCount: uniqueAuthorsCount,
    };
  }

  async updateBlogResource(updateBlogResourceInput: UpdateBlogResourceInput) {
    const blogResource = await this.BlogResource.findOne({
      where: { id: updateBlogResourceInput.id },
      relations: ['category', 'attachment', 'banner'],
    });
    if (!blogResource) {
      throw new Error(`Blog/Resource does not exist.`);
    }
    const updatedBlogResource = { ...blogResource, ...updateBlogResourceInput };
    updatedBlogResource.title = updatedBlogResource.title || blogResource.title;
    updatedBlogResource.content =
      updatedBlogResource.content || blogResource.content;
    updatedBlogResource.content_type =
      updatedBlogResource.content_type || blogResource.content_type;
    updatedBlogResource.video_link =
      updatedBlogResource.video_link || blogResource.video_link;
    updatedBlogResource.blog_status =
      updatedBlogResource.blog_status || blogResource.blog_status;
    updatedBlogResource.tags = updatedBlogResource.tags || blogResource.tags;

    if (updateBlogResourceInput.blog_status != undefined) {
      if (updateBlogResourceInput.blog_status === 'Published') {
        const currentDate = new Date();
        updatedBlogResource.published_on = currentDate;
      } else {
        updatedBlogResource.published_on = null;
      }
    }
    if (updateBlogResourceInput.categoryId != undefined) {
      const newBlogCategory = await this.masterDetails.findOne({
        where: { id: updateBlogResourceInput.categoryId },
      });
      if (!newBlogCategory) {
        throw new Error(`new Blog category does not exist.`);
      }
      updatedBlogResource.category = newBlogCategory;
    }
    const result = await this.BlogResource.save(updatedBlogResource);
    const blogResourceWithAttach = await this.addAttachmentURLtoBlogs(result);
    return blogResourceWithAttach;
  }

  async listPublishedBlogResources(
    listBlogResourceInput: ListBlogResourceInput,
  ): Promise<any> {
    const queryBuilder = this.BlogResource.createQueryBuilder('blogs');
    queryBuilder.leftJoinAndSelect('blogs.category', 'category');
    queryBuilder.leftJoinAndSelect('blogs.author', 'author');
    queryBuilder.leftJoinAndSelect('blogs.attachment', 'attachment');
    queryBuilder.leftJoinAndSelect('blogs.banner', 'banner');
    queryBuilder.where('blogs.blog_status = :publishedstatus', {
      publishedstatus: 'Published',
    });

    if (listBlogResourceInput.category) {
      queryBuilder.andWhere('category.value = :category', {
        category: listBlogResourceInput.category,
      });
    }
    if (listBlogResourceInput.author) {
      queryBuilder.andWhere('author.id = :authorId', {
        authorId: listBlogResourceInput.author,
      });
    }
    if (listBlogResourceInput.contentType) {
      queryBuilder.andWhere('blogs.content_type = :contentType', {
        contentType: listBlogResourceInput.contentType,
      });
      if (listBlogResourceInput.contentType === 'Blog') {
        queryBuilder.leftJoinAndSelect('blogs.comment', 'comment');
      }
    }
    if (listBlogResourceInput.keyword) {
      queryBuilder.andWhere(`(LOWER(blog.title) LIKE :keyword)`, {
        keyword: `%${listBlogResourceInput.keyword.toLowerCase()}%`,
      });
    }

    const skip =
      (listBlogResourceInput.page - 1) * listBlogResourceInput.perPage;
    const take = listBlogResourceInput.perPage;

    let blogResources, totalCount;

    // if (listBlogResourceInput.category) {
    [blogResources, totalCount] = await Promise.all([
      queryBuilder
        .orderBy({ 'blogs.created_on': 'DESC' })
        .skip(skip)
        .take(take)
        .getMany(),
      queryBuilder.getCount(),
    ]);
    // } else {
    //   const subQuery = this.BlogResource.createQueryBuilder('subQuery')
    //     .select('subQuery.id')
    //     .leftJoin('subQuery.category', 'subCategory')
    //     .where('subQuery.blog_status = :publishedstatus', {
    //       publishedstatus: 'Published',
    //     })
    //     .andWhere('subCategory.id = blogs.category_id')
    //     .orderBy('subQuery.created_on', 'DESC')
    //     .limit(3);

    //   // Main query to fetch all blogs, limiting to 3 blogs per category
    //   [blogResources, totalCount] = await Promise.all([
    //     queryBuilder
    //       .andWhere(`blogs.id IN (${subQuery.getQuery()})`)
    //       .setParameters(subQuery.getParameters())
    //       .orderBy(`category.value, blogs.created_on`, 'DESC')
    //       .getMany(),
    //     queryBuilder.getCount(),
    //   ]);
    // }
    const processedBlogResources = await Promise.all(
      blogResources.map((blog) => this.addAttachmentURLtoBlogs(blog)),
    );

    return { blogResources: processedBlogResources, totalCount };
  }

  async listPublishedBlogResourcesCategoryWise(
    content_type: string,
  ): Promise<any> {
    const queryBuilder = this.BlogResource.createQueryBuilder('blogs');
    queryBuilder.leftJoinAndSelect('blogs.category', 'category');
    queryBuilder.leftJoinAndSelect('blogs.author', 'author');
    queryBuilder.leftJoinAndSelect('blogs.banner', 'banner');
    queryBuilder.where('blogs.blog_status = :publishedstatus', {
      publishedstatus: 'Published',
    });

    if (content_type) {
      queryBuilder.andWhere('blogs.content_type = :contentType', {
        contentType: content_type,
      });
    }

    let blogResources, totalCount;

    const subQuery = this.BlogResource.createQueryBuilder('subQuery')
      .select('subQuery.id')
      .leftJoin('subQuery.category', 'subCategory')
      .where('subQuery.blog_status = :publishedstatus', {
        publishedstatus: 'Published',
      })
      .andWhere('subCategory.id = blogs.category_id')
      .orderBy('subQuery.created_on', 'DESC')
      .limit(3);

    // Main query to fetch all blogs, limiting to 3 blogs per category
    [blogResources, totalCount] = await Promise.all([
      queryBuilder
        .andWhere(`blogs.id IN (${subQuery.getQuery()})`)
        .setParameters(subQuery.getParameters())
        .orderBy(`category.value, blogs.created_on`, 'DESC')
        .getMany(),
      queryBuilder.getCount(),
    ]);

    const processedBlogResources = await Promise.all(
      blogResources.map((blog) => this.addAttachmentURLtoBlogs(blog)),
    );

    const categoryMap = {};
    // Iterate over the blogResources array to organize blogs by category
    processedBlogResources.forEach((blog) => {
      const category = blog.category.value;
      if (!categoryMap[category]) {
        // If the category doesn't exist in the map, create a new entry
        categoryMap[category] = {
          category: category,
          blogResources: [],
        };
      }
      // Add the blog to the corresponding category
      categoryMap[category].blogResources.push(blog);
    });

    const categoriesWithBlogs = Object.values(categoryMap);

    return { blogResources: categoriesWithBlogs, totalCount };
  }

  async createBlogComment(
    decoded: any,
    addBlogCommentInput: AddBlogCommentInput,
  ) {
    const blog = await this.BlogResource.findOne({
      where: {
        id: addBlogCommentInput.blogId,
        content_type: 'Blog',
        blog_status: 'Published',
      },
    });
    if (!blog) {
      throw new Error(`Blog does not exist.`);
    }
    const commentOwner = decoded?.userId;

    const blogComment = this.blogComments.create({
      ...addBlogCommentInput,
      blog: blog,
      comment_by: commentOwner,
    });
    return await this.blogComments.save(blogComment);
  }

  async adminManageBlogComment(
    decoded: any,
    manageBlogCommentInput: ManageBlogCommentInput,
  ) {
    const comment = await this.blogComments.findOne({
      where: { id: manageBlogCommentInput.commentId },
      relations: ['blog'],
    });
    const commentOwner = await this.userDetails.findOne({
      where: { user_id: comment.comment_by },
    });
    if (!comment) {
      throw new Error(`Comment does not exist.`);
    }
    const blogComment = {
      ...comment,
      comment_status: manageBlogCommentInput.comment_status || 'Pending',
      comment_owner_name:
        commentOwner.first_name + ' ' + commentOwner.last_name,
      updated_by: decoded?.userId,
    };
    if (manageBlogCommentInput.comment_status === 'Approved') {
      const currentDate = new Date();
      blogComment.posted_on = currentDate;
    } else {
      blogComment.posted_on = null;
    }
    return await this.blogComments.save(blogComment);
  }

  async adminlistBlogComments(
    listBlogCommentsInput: ListBlogCommentsInput,
    timezone,
  ): Promise<{ blogDetails: any; comments: any[]; totalCount: number }> {
    const queryBuilder = this.blogComments
      .createQueryBuilder('comment')
      .leftJoin('comment.blog', 'blog')
      .addSelect([
        'blog.id',
        'blog.title', // Add other columns from SubscriptionPlan that you need
      ]);

    if (listBlogCommentsInput.status) {
      queryBuilder.andWhere('comment.comment_status = :status', {
        status: listBlogCommentsInput.status,
      });
    } else {
      queryBuilder.andWhere('comment.comment_status  != :deleteStatus', {
        deleteStatus: 'Deleted',
      });
    }

    if (listBlogCommentsInput.blog) {
      queryBuilder.andWhere('blog.id = :blog', {
        blog: listBlogCommentsInput.blog,
      });
    }

    if (listBlogCommentsInput.date_filter && timezone) {
      let startDate, endDate;
      if (
        listBlogCommentsInput.date_filter === 'Custom' &&
        listBlogCommentsInput.start_date &&
        listBlogCommentsInput.end_date
      ) {
        startDate = moment
          .tz(listBlogCommentsInput.start_date, timezone)
          .startOf('day')
          .utc()
          .toDate();
        endDate = moment
          .tz(listBlogCommentsInput.end_date, timezone)
          .endOf('day')
          .utc()
          .toDate();
      } else if (listBlogCommentsInput.date_filter === 'This Month') {
        startDate = moment.tz(timezone).startOf('month').utc().toDate();
        endDate = moment.tz(timezone).endOf('month').utc().toDate();
      } else if (listBlogCommentsInput.date_filter === 'Last Month') {
        startDate = moment
          .tz(timezone)
          .subtract(1, 'month')
          .startOf('month')
          .utc()
          .toDate();
        endDate = moment
          .tz(timezone)
          .subtract(1, 'month')
          .endOf('month')
          .utc()
          .toDate();
      }
      queryBuilder.andWhere(
        `(comment.posted_on BETWEEN :start_date AND :end_date OR comment.created_on BETWEEN :start_date AND :end_date)`,
        {
          start_date: startDate,
          end_date: endDate,
        },
      );
    }

    const skip =
      (listBlogCommentsInput.page - 1) * listBlogCommentsInput.perPage;
    const take = listBlogCommentsInput.perPage;

    const [comments, totalCount] = await Promise.all([
      queryBuilder
        .orderBy({ 'comment.created_on': 'DESC' })
        .skip(skip)
        .take(take)
        .getMany(),
      queryBuilder.getCount(),
    ]);

    const blogDetails = listBlogCommentsInput.blog
      ? await this.BlogResource.findOne({
        where: { id: listBlogCommentsInput.blog },
      })
      : null;

    const commentsWithUserDetails = await Promise.all(
      comments.map(async (comment) => {
        const userId = comment.comment_by;
        //    const commentOwner = await this.userDetails.findOne({ where: { user_id: userId} });
        const commentOwner = await this.userDetails
          .createQueryBuilder('userDetails')
          .where('userDetails.user_id = :userId', { userId })
          .getOne();
        return {
          id: comment.id,
          blog: {
            id: comment.blog.id,
            title: comment.blog.title,
          },
          comment: comment.comment,
          comment_status: comment.comment_status,
          comment_by: comment.comment_by,
          comment_owner_name: commentOwner
            ? commentOwner.first_name + ' ' + commentOwner.last_name
            : null,
          created_on: comment.created_on,
          posted_on: comment.posted_on,
        };
      }),
    );

    return { blogDetails, comments: commentsWithUserDetails, totalCount };
  }

  async addAttachmentURLtoBlogs(blog: BlogResource) {
    if (!blog) {
      // Handle the case where no data is found for the given id
      throw new Error(`Blog not found`);
    }
    if (blog.banner) {
      blog.banner.file_path =
        process.env.UPLOAD_BASE_URL + blog.banner.file_path.replace(/\\/g, '/');
    }
    if (blog.attachment) {
      blog.attachment.file_path =
        process.env.UPLOAD_BASE_URL +
        blog.attachment.file_path.replace(/\\/g, '/');
    }
    return blog;
  }
}
