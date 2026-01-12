import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AdminDetails } from 'src/entities/admin-details.entity';
import {
  CmtyDiscussionsIdeas,
  cmtyType,
} from 'src/entities/cmty-discussion-idea.entity';
import { EmailTemplates } from 'src/entities/email-templates.entity';
import { FileAttachments } from 'src/entities/file-attachments.entity';
import { MasterTypes } from 'src/entities/master-types.entity';
import { UserDetails } from 'src/entities/user-details.entity';
import { Repository } from 'typeorm';
import {
  AddDiscussionIdeaInput,
  UpdateDiscussionIdeaInput,
} from './dto/discussion-idea.dto';
import {
  AddAnswerCommentInput,
  UpdateAnswerCommentInput,
} from './dto/answer-comment.dto';
import { CmtyAnswersComments } from 'src/entities/cmty-answers-comments.entity';
import { VoteLikeFlagInput } from './dto/vote-like-flag.dto';
import { CmtyVoteLikesFlags } from 'src/entities/cmty-vote-likes-flags.entity';
import {
  getAnsCommentInput,
  ListCommunityFlagsInput,
  ListDiscussionIdeaInput,
} from './dto/list-discussion-idea.dto';
import { ObjectStorageService } from 'src/libs/@object-storage/object-storage.service';
import { linkExtensions } from '../activity-log/link-extensions';
import { SortingOrder } from 'src/api/admin/pt-admin/dto/add-admin.dto';
import { join } from 'path';
var moment = require('moment-timezone');
const Handlebars = require('handlebars');
moment.tz.setDefault('UTC');

@Injectable()
export class CommunityService {
  constructor(
    @InjectRepository(CmtyDiscussionsIdeas)
    private discussionsIdeas: Repository<CmtyDiscussionsIdeas>,
    @InjectRepository(CmtyAnswersComments)
    private answerComments: Repository<CmtyAnswersComments>,
    @InjectRepository(CmtyVoteLikesFlags)
    private voteLikesFlags: Repository<CmtyVoteLikesFlags>,
    @InjectRepository(MasterTypes)
    private masterDetails: Repository<MasterTypes>,
    @InjectRepository(EmailTemplates)
    private emailTemplates: Repository<EmailTemplates>,
    @InjectRepository(AdminDetails)
    private adminDetails: Repository<AdminDetails>,
    @InjectRepository(UserDetails)
    private userDetails: Repository<UserDetails>,
    @InjectRepository(FileAttachments)
    private fileAttachments: Repository<FileAttachments>,
    private readonly objectStorageService: ObjectStorageService,
  ) {}

  async create(decoded: any, addDiscussionIdeaInput: AddDiscussionIdeaInput) {
    const discussionIdeaAdminAuthor = decoded?.isAdmin
      ? await this.adminDetails.findOne({ where: { id: decoded?.id } })
      : null;
    const discussionIdeaAuthor = decoded?.isAdmin
      ? null
      : await this.userDetails.findOne({ where: { id: decoded?.id } });

    let category;
    if (addDiscussionIdeaInput.categoryId) {
      category = await this.masterDetails.findOne({
        where: { id: addDiscussionIdeaInput.categoryId },
      });
      if (!category) {
        throw new Error(`Discussion / Idea category does not exist.`);
      }
    } else {
      if (addDiscussionIdeaInput.cmty_content_type === 'Discussion') {
        throw new Error(`category selection is mandatory.`);
      }
    }

    const newDiscussionIdea = this.discussionsIdeas.create({
      ...addDiscussionIdeaInput,
      category: category,
      author: discussionIdeaAuthor,
      admin_author: discussionIdeaAdminAuthor,
    });

    const discussionIdeaDetails =
      await this.discussionsIdeas.save(newDiscussionIdea);

    discussionIdeaDetails.discussion_idea_id =
      Number(discussionIdeaDetails.discussion_idea_id) + 10000000;
    const newDiscIdea = await this.discussionsIdeas.save(discussionIdeaDetails);

    if (newDiscIdea) {
      function convertDate(dateString) {
        if (!dateString) return ''; // Handle empty dates gracefully

        const date = new Date(dateString);
        return (
          date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
          }) +
          ' ' +
          date.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          })
        );
      }

      const categoryDetails = category ? category.value : 'all';
      const disc_idea_link =
        `${process.env.LOG_BASE_URL}` +
        `/community/discussions/` +
        categoryDetails.replace(/ /g, '-') +
        '/' +
        newDiscIdea.title.replace(/ /g, '-') +
        '/' +
        newDiscIdea.id;

      const discIdeaOwner = discussionIdeaAuthor
        ? discussionIdeaAuthor
        : discussionIdeaAdminAuthor;

      const discIdeaOwnerImage = discIdeaOwner.profile_id
        ? await this.fileAttachments.findOne({
            where: { id: discIdeaOwner.profile_id },
          })
        : null;
      const discIdeaOwner_owner_image_url = discIdeaOwnerImage
        ? (discIdeaOwnerImage.file_path.startsWith('/') ? discIdeaOwnerImage.file_path : `/${discIdeaOwnerImage.file_path}`)
        : '/profile_photo/1742208051996-493540972-avatar.png';

      const newDiscIdeaResponse = {
        ...newDiscIdea,
        author_name: discIdeaOwner.first_name + discIdeaOwner.last_name,
        discussionIdea_date: convertDate(newDiscIdea.created_on),
        discIdea_owner_image: discIdeaOwner_owner_image_url,
        disc_idea_link: disc_idea_link,
      };

      return newDiscIdeaResponse;
    }
  }

  async getDiscussionIdea(token: any, id: string) {
    const result = await this.discussionsIdeas
      .createQueryBuilder('discIdea')
      .leftJoinAndSelect('discIdea.category', 'category')
      .leftJoinAndSelect('discIdea.vote_like_flag', 'vote_like_flag')
      .leftJoinAndSelect('vote_like_flag.voter_liked_flagged', 'userVotes')
      .leftJoinAndSelect(
        'vote_like_flag.admin_voter_liked_flagged',
        'adminVotes',
      )
      .leftJoinAndSelect('discIdea.author', 'author')
      .leftJoinAndSelect('discIdea.admin_author', 'admin_author')
      .where('discIdea.id = :id', { id })
      .getOne();

    if (!result) {
      throw new Error(`Dicussion / Idea ${id} not found`);
    }
    const discussionAttachmentIds = result.disc_idea_attachment_ids || [];

    let discussion_idea_attachment;

    if (discussionAttachmentIds.length > 0) {
      const discussionAttachments = await this.fileAttachments
        .createQueryBuilder('f')
        .select([
          `f.id AS id`,
          `f.file_path AS file_path`,
          `f.file_name AS file_name`,
          `f.file_type AS file_type`,
          `f.name AS name`,
          `f.uploaded_on AS uploaded_on`,
          `f.attachment_type AS attachment_type`,
        ])
        .where('f.id IN (:...ids)', {
          ids: discussionAttachmentIds,
        })
        .orderBy({ 'f.uploaded_on': 'DESC' })
        .getRawMany();

      discussion_idea_attachment = await this.addAttachmentURL(
        discussionAttachments,
      );
    }

    const discIdeaAuthor = result.author ?? result.admin_author;

    let authorImageBase64 = null;

    if (discIdeaAuthor?.profile_id) {
      authorImageBase64 = await this.fileAttachments.findOne({
        where: { id: discIdeaAuthor.profile_id },
      });
    }

    let authorImageFile = null;
    if (authorImageBase64?.file_path && authorImageBase64?.file_type) {
      try {
        const fileBuffer = await this.objectStorageService.downloadFile(authorImageBase64.file_path);
        if (fileBuffer) {
          authorImageFile = `data:${authorImageBase64.file_type};base64,${fileBuffer.toString('base64')}`;
        }
      } catch (error) {
        console.error('Error reading file:', error);
      }
    }

    const formattedAuthor = discIdeaAuthor
      ? {
          id: discIdeaAuthor.id,
          first_name: discIdeaAuthor.first_name,
          last_name: discIdeaAuthor.last_name,
          is_admin: !!result.admin_author,
          email_id: discIdeaAuthor.email_id,
          author_image_base64: authorImageFile,
        }
      : null;

    const author = result.author ? formattedAuthor : null;
    const admin_author = result.admin_author ? formattedAuthor : null;

    let your_disc_idea_response, editable;

    if (token) {
      const foundVote = result.vote_like_flag.find(
        (vote) =>
          vote.voter_liked_flagged?.user_id === token?.userId ||
          vote.admin_voter_liked_flagged?.admin_id === token?.userId,
      );

      your_disc_idea_response = foundVote ? foundVote.reaction_type : null;

      if (
        result.author?.user_id === token?.userId ||
        result.admin_author?.admin_id === token?.userId
      ) {
        editable = true;
      }
    }

    const commentsInput = {
      id: result.discussion_idea_id,
      page: 1,
      perPage: 5,
      best_ans: true,
      status: null,
    };

    const { comment, total_count } = await this.listAnswerComments(
      token,
      commentsInput,
    );

    const response = {
      id: result.id,
      discussion_idea_id: result.discussion_idea_id,
      title: result.title,
      content: result.content,
      cmty_content_type: result.cmty_content_type,
      enable_comments: result.enable_comments,
      discussion_idea_status: result.discussion_idea_status,
      vote_count: result.vote_count,
      like_count: result.like_count,
      flag_count: result.flag_count,
      view_count: result.view_count,
      answer_comment_count: result.answer_comment_count,
      created_on: result.created_on,
      updated_on: result.updated_on,
      discussion_idea_attachment,
      your_disc_idea_response,
      category: {
        id: result.category?.id,
        value: result.category?.value,
      },
      author: author,
      admin_author: admin_author,
      answerComment: comment,
      editable,
    };

    return response;
  }

  async listAnswerComments(token: any, payload: getAnsCommentInput) {
    let answer_comment_attachment;

    // Fetch paginated comments
    const queryBuilder =
      await this.answerComments.createQueryBuilder('answerComment');
    queryBuilder
      .leftJoinAndSelect('answerComment.author', 'commentOwner')
      .leftJoinAndSelect('answerComment.admin_author', 'commentAdminOwner')
      .leftJoinAndSelect('answerComment.vote_like_flag', 'vote_like_flag')
      .leftJoinAndSelect(
        'vote_like_flag.voter_liked_flagged',
        'voter_liked_flagged',
      )
      .leftJoinAndSelect(
        'vote_like_flag.admin_voter_liked_flagged',
        'admin_voter_liked_flagged',
      )
      .where('answerComment.disc_idea_id = :id', { id: payload.id })
      .orderBy('answerComment.created_on', 'DESC');
    // Dynamically add max like_count as a subquery column

    if (payload.status) {
      queryBuilder.andWhere('answerComment.answer_comment_status = :status', {
        status: payload.status,
      });
    } else {
      queryBuilder.andWhere(
        'answerComment.answer_comment_status != :deletestatus',
        { deletestatus: 'Deleted' },
      );
    }

    const maxLikeCountSubQuery = this.answerComments
      .createQueryBuilder('ac')
      .select('COALESCE(MAX(ac.like_count), 0)', 'max_like_count')
      .where('ac.disc_idea_id = answerComment.disc_idea_id')
      .andWhere('ac.answer_comment_status != :status', { status: 'Deleted' });

    // Subquery to get the best answer (highest like count or none)
    const bestAnswerSubQuery = this.answerComments
      .createQueryBuilder('ac')
      .select('ac.id')
      .where('ac.disc_idea_id = :id', { id: payload.id })
      .andWhere(
        `(ac.like_count = (${maxLikeCountSubQuery.getQuery()}) OR (${maxLikeCountSubQuery.getQuery()}) = 0)`,
      )
      .andWhere('ac.answer_comment_status != :status', { status: 'Deleted' })
      .orderBy('ac.created_on', 'ASC')
      .limit(1);

    // Apply best answer condition
    const statusParams = { id: payload.id, status: 'Deleted' };

    if (payload.best_ans === true) {
      queryBuilder.andWhere(
        `answerComment.id = (${bestAnswerSubQuery.getQuery()})`,
        statusParams,
      );
    } else if (payload.best_ans === false) {
      queryBuilder.andWhere(
        `answerComment.id != (${bestAnswerSubQuery.getQuery()})`,
        statusParams,
      );
    }

    const sorting_order = payload.sorting_order
      ? payload.sorting_order
      : 'DESC';

    if (!payload.sorting_field) {
      queryBuilder.orderBy({ 'answerComment.like_count': sorting_order });
    }
    if (payload.sorting_field) {
      switch (payload.sorting_field) {
        case 'answered_by':
          {
            queryBuilder
              .orderBy('LOWER(commentOwner.first_name)', sorting_order)
              .addOrderBy('LOWER(commentAdminOwner.first_name)', sorting_order);
          }
          break;
        case 'added_date':
          {
            queryBuilder.orderBy({ 'answerComment.created_on': sorting_order });
          }
          break;
        case 'is_reported':
          {
            queryBuilder.orderBy({ 'answerComment.flag_count': sorting_order });
          }
          break;
        case 'likes':
          {
            queryBuilder.orderBy({ 'answerComment.like_count': sorting_order });
          }
          break;
        case 'answer':
          {
            queryBuilder.orderBy({
              'LOWER(answerComment.answer_comment)': sorting_order,
            });
          }
          break;
      }
    }

    const [answerComments, total_count] = await Promise.all([
      queryBuilder.getMany(),
      queryBuilder.getCount(),
    ]);

    const page_number = payload.page;
    const items_per_page = payload.perPage;

    const startIndex =
      page_number && items_per_page ? (page_number - 1) * items_per_page : 0;
    const endIndex =
      page_number && items_per_page
        ? Math.min(
            (page_number - 1) * items_per_page + items_per_page,
            total_count,
          )
        : total_count;
    // Slice the results array to get the results for the current page
    const filteranswerComments = answerComments?.slice(startIndex, endIndex);

    // Process comments
    const formattedComments = await Promise.all(
      filteranswerComments.map(async (comment) => {
        const commentOwner = comment.author
          ? await this.userDetails.findOne({
              where: { user_id: comment.author?.user_id },
            })
          : await this.adminDetails.findOne({
              where: { admin_id: comment.admin_author?.admin_id },
            });

        let your_response,
          comment_editable,
          flag_reason = 'No comments';

        if (comment.vote_like_flag?.length > 0) {
          const flaggedComment = comment.vote_like_flag.find(
            (vote) =>
              vote.flag_reason !== null && vote.flag_reason.trim() !== '',
          );
          if (flaggedComment) {
            flag_reason = flaggedComment.flag_reason;
          }
        }

        if (token) {
          const foundVote = comment.vote_like_flag.find(
            (vote) =>
              vote.voter_liked_flagged?.user_id === token.userId ||
              vote.admin_voter_liked_flagged?.admin_id === token.userId,
          );

          your_response = foundVote ? foundVote.reaction_type : null;

          if (
            comment.author?.user_id === token.userId ||
            comment.admin_author?.admin_id === token.userId
          ) {
            comment_editable = true;
          }
        }

        let answer_comment_owner_image_base64,
          answer_comment_owner_image_url = null;
        let answer_comment_owner_name = commentOwner
          ? commentOwner.first_name + ' ' + commentOwner.last_name
          : null;
        let answer_comment_by = comment.author ? 'user' : 'admin';

        if (commentOwner?.profile_id) {
          const commentOwnerImage = await this.fileAttachments.findOne({
            where: { id: commentOwner.profile_id },
          });
          if (commentOwnerImage) {
            try {
              const fileBuffer = await this.objectStorageService.downloadFile(commentOwnerImage.file_path);
              if (fileBuffer) {
                answer_comment_owner_image_base64 = `data:${commentOwnerImage.file_type};base64,${fileBuffer.toString('base64')}`;
              }
            } catch (error) {
              console.error('Error reading file:', error);
            }
            const cleanPath = commentOwnerImage.file_path.replace(/\\/g, '/');
            answer_comment_owner_image_url = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
          }
        } else {
          answer_comment_owner_image_url = '/profile_photo/1742208051996-493540972-avatar.png';
        }

        const commentAttachmentIds = comment.ans_comm_attachment_ids || [];

        if (commentAttachmentIds.length > 0) {
          const commentAttachments = await this.fileAttachments
            .createQueryBuilder('f')
            .select([
              `f.id AS id`,
              `f.file_path AS file_path`,
              `f.file_name AS file_name`,
              `f.file_type AS file_type`,
              `f.name AS name`,
              `f.uploaded_on AS uploaded_on`,
              `f.attachment_type AS attachment_type`,
            ])
            .where('f.id IN (:...ids)', {
              ids: commentAttachmentIds,
            })
            .orderBy({ 'f.uploaded_on': 'DESC' })
            .getRawMany();

          answer_comment_attachment =
            await this.addAttachmentURL(commentAttachments);
        }

        return {
          id: comment.id,
          answer_comment_id: comment.answer_comment_id,
          answer_comment: comment.answer_comment,
          answer_comment_status: comment.answer_comment_status,
          answer_comment_by: answer_comment_by,
          like_count: comment.like_count,
          flag_count: comment.flag_count,
          created_on: comment.created_on,
          answer_comment_owner_name: answer_comment_owner_name,
          your_response,
          comment_editable,
          flag_reason,
          answer_comment_owner_image_base64,
          answer_comment_attachment,
          answer_comment_owner_image_url,
        };
      }),
    );

    return { comment: formattedComments, total_count };
  }

  async listAllDiscussionIdeas(
    listDiscussionIdeasInput: ListDiscussionIdeaInput,
  ): Promise<any> {
    const timezone = 'UTC';
    const queryBuilder = this.discussionsIdeas.createQueryBuilder('discIdea');
    queryBuilder.leftJoinAndSelect('discIdea.category', 'category');
    queryBuilder.leftJoinAndSelect(
      'discIdea.answerComment',
      'answerComment',
      'answerComment.answer_comment_status != :status', // Exclude 'Deleted' comments
      { status: 'Deleted' },
    );
    queryBuilder.leftJoinAndSelect('discIdea.author', 'author');
    queryBuilder.leftJoinAndSelect('discIdea.admin_author', 'admin_author');
    queryBuilder.leftJoinAndSelect('discIdea.vote_like_flag', 'vote_like_flag');

    // queryBuilder.leftJoinAndSelect('vote_like_flag.voter_liked_flagged', 'voter_liked_flagged');
    // queryBuilder.leftJoinAndSelect('vote_like_flag.admin_voter_liked_flagged', 'admin_voter_liked_flagged');
    // queryBuilder.leftJoinAndSelect('discIdea.banner', 'banner');

    if (listDiscussionIdeasInput.discussion_idea_status) {
      queryBuilder.andWhere(
        'discIdea.discussion_idea_status = :discussion_idea_status',
        {
          discussion_idea_status:
            listDiscussionIdeasInput.discussion_idea_status,
        },
      );
    } else {
      queryBuilder.andWhere(
        'discIdea.discussion_idea_status != :deleteStatus',
        {
          deleteStatus: 'Deleted',
        },
      );
    }
    if (listDiscussionIdeasInput.category) {
      queryBuilder.andWhere('category.value = :category', {
        category: listDiscussionIdeasInput.category,
      });
    }
    if (listDiscussionIdeasInput.is_answered === false) {
      queryBuilder.andWhere(
        '(discIdea.answer_comment_count IS NULL OR discIdea.answer_comment_count < :answerCount)',
        { answerCount: 1 },
      );
    } else if (listDiscussionIdeasInput.is_answered === true) {
      queryBuilder.andWhere('(discIdea.answer_comment_count > :answerCount)', {
        answerCount: 0,
      });
    }

    if (listDiscussionIdeasInput.author) {
      queryBuilder.andWhere('author.id = :id', {
        id: listDiscussionIdeasInput.author,
      });
    }
    if (listDiscussionIdeasInput.cmtyContentType) {
      queryBuilder.andWhere('discIdea.cmty_content_type = :contentType', {
        contentType: listDiscussionIdeasInput.cmtyContentType,
      });
    }
    if (listDiscussionIdeasInput.keyword) {
      queryBuilder.andWhere(`(LOWER(discIdea.title) LIKE :keyword)`, {
        keyword: `%${listDiscussionIdeasInput.keyword.toLowerCase()}%`,
      });
    }

    if (listDiscussionIdeasInput.date_filter && timezone) {
      let startDate, endDate;
      if (
        listDiscussionIdeasInput.date_filter === 'Custom' &&
        listDiscussionIdeasInput.start_date &&
        listDiscussionIdeasInput.end_date
      ) {
        startDate = moment
          .tz(listDiscussionIdeasInput.start_date, timezone)
          .startOf('day')
          .utc()
          .toDate();
        endDate = moment
          .tz(listDiscussionIdeasInput.end_date, timezone)
          .endOf('day')
          .utc()
          .toDate();
      } else if (listDiscussionIdeasInput.date_filter === 'This Month') {
        startDate = moment.tz(timezone).startOf('month').utc().toDate();
        endDate = moment.tz(timezone).endOf('month').utc().toDate();
      } else if (listDiscussionIdeasInput.date_filter === 'Last Month') {
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
        `(discIdea.published_on BETWEEN :start_date AND :end_date OR discIdea.created_on BETWEEN :start_date AND :end_date)`,
        {
          start_date: startDate,
          end_date: endDate,
        },
      );
    }

    if (listDiscussionIdeasInput.top_content) {
      if (listDiscussionIdeasInput.cmtyContentType === 'Idea') {
        queryBuilder.orderBy('discIdea.vote_count', 'DESC');
      } else if (listDiscussionIdeasInput.cmtyContentType === 'Discussion') {
        queryBuilder.orderBy('discIdea.like_count', 'DESC');
      }
    } else {
      const sortOrder =
        listDiscussionIdeasInput.sort_mode === 'Oldest' ? 'ASC' : 'DESC';
      queryBuilder.orderBy('discIdea.created_on', sortOrder);
    }

    const sorting_order = listDiscussionIdeasInput.sorting_order
      ? listDiscussionIdeasInput.sorting_order
      : 'DESC';

    if (listDiscussionIdeasInput.sorting_field) {
      switch (listDiscussionIdeasInput.sorting_field) {
        case 'discussion_title':
          {
            queryBuilder.orderBy('LOWER(discIdea.title)', sorting_order);
          }
          break;
        case 'created_by':
          {
            queryBuilder
              .orderBy('LOWER(author.first_name)', sorting_order)
              .addOrderBy('LOWER(admin_author.first_name)', sorting_order);
          }
          break;
        case 'created_on':
          {
            queryBuilder.orderBy({ 'discIdea.created_on': sorting_order });
          }
          break;
        case 'is_reported':
          {
            queryBuilder.orderBy({ 'discIdea.flag_count': sorting_order });
          }
          break;
        case 'likes':
          {
            queryBuilder.orderBy({ 'discIdea.like_count': sorting_order });
          }
          break;
        case 'views':
          {
            queryBuilder.orderBy({ 'discIdea.view_count': sorting_order });
          }
          break;
        case 'answers':
          {
            queryBuilder.orderBy({
              'discIdea.answer_comment_count': sorting_order,
            });
          }
          break;
        case 'last_updated':
          {
            queryBuilder.orderBy({ 'discIdea.edited_on': sorting_order });
          }
          break;
      }
    }

    const [rawDiscussionIdeas, totalCount] = await Promise.all([
      queryBuilder.getMany(),
      queryBuilder.getCount(),
    ]);

    const page_number = listDiscussionIdeasInput.page;
    const items_per_page = listDiscussionIdeasInput.perPage;

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
    const filterRawDiscussionIdeas = rawDiscussionIdeas?.slice(
      startIndex,
      endIndex,
    );

    const discussionIdeas = filterRawDiscussionIdeas.map((discussion) => {
      let flag_reason_discussion = 'no comments';

      if (discussion.vote_like_flag?.length > 0) {
        const flaggedDiscussion = discussion.vote_like_flag.find(
          (vote) => vote.flag_reason !== null && vote.flag_reason.trim() !== '',
        );
        if (flaggedDiscussion) {
          flag_reason_discussion = flaggedDiscussion.flag_reason;
        }
      }

      return {
        ...discussion,
        flag_reason_discussion,
      };
    });

    return { discussionIdeas: discussionIdeas, totalCount };
  }

  async getCategoryWiseCount(content_type: cmtyType): Promise<any> {
    const master_type =
      content_type === 'Discussion' ? 'Discussion Topic' : 'Idea Category';
    const topicsWithQuestionCount = await this.masterDetails
      .createQueryBuilder('master')
      .leftJoinAndSelect('master.discussionIdea', 'discussionIdea')
      .leftJoinAndSelect(
        'discussionIdea.category',
        'discIdeaCategory',
        'discIdeaCategory.id = master.id',
      )

      .select([
        'master.id',
        'master.value',
        'COUNT(discussionIdea.id) AS per_category_count',
        'SUM(COUNT(discussionIdea.id)) OVER () AS total_count',
      ])
      .where('master.master_type = :master_type', { master_type: master_type })
      .andWhere('discussionIdea.discussion_idea_status != :deletedStatus', {
        deletedStatus: 'Deleted',
      })
      .groupBy('master.id')
      .getRawMany();

    // Extract totalQuestions from the first result row
    const total_count =
      topicsWithQuestionCount.length > 0
        ? topicsWithQuestionCount[0].total_count
        : 0;

    // Remove totalQuestions from individual topic entries (optional)
    const formattedTopics = topicsWithQuestionCount.map(
      ({ total_count, ...rest }) => rest,
    );

    return { categories: formattedTopics, total_count };
  }

  async adminListCommunityFlags(
    token: any,
    listCommunityFlagInput: ListCommunityFlagsInput,
  ): Promise<any> {
    const { discussion_idea_id, answer_comment_id } = listCommunityFlagInput;

    let queryBuilder = this.voteLikesFlags
      .createQueryBuilder('vote_like_flag')
      .leftJoinAndSelect(
        'vote_like_flag.voter_liked_flagged',
        'voter_liked_flagged',
      )
      .leftJoinAndSelect(
        'vote_like_flag.admin_voter_liked_flagged',
        'admin_voter_liked_flagged',
      )
      .leftJoin('vote_like_flag.discussionIdea', 'discussionIdea')
      .addSelect(['discussionIdea.title'])
      .leftJoin('vote_like_flag.answerComment', 'answerComment')
      .addSelect(['answerComment.answer_comment'])
      .where('vote_like_flag.reaction_type = :responseType', {
        responseType: 'Flag',
      });

    if (discussion_idea_id) {
      queryBuilder.andWhere('vote_like_flag.disc_idea_id = :discussionId', {
        discussionId: discussion_idea_id,
      });
    }
    if (answer_comment_id) {
      queryBuilder.andWhere('vote_like_flag.ans_comment_id = :commentId', {
        commentId: answer_comment_id,
      });
    }

    const sorting_order = listCommunityFlagInput.sorting_order
      ? listCommunityFlagInput.sorting_order
      : 'DESC';

    if (listCommunityFlagInput.sorting_field) {
      switch (listCommunityFlagInput.sorting_field) {
        case 'reported_by':
          {
            queryBuilder
              .orderBy('LOWER(voter_liked_flagged.first_name)', sorting_order)
              .addOrderBy(
                'LOWER(admin_voter_liked_flagged.first_name)',
                sorting_order,
              );
          }
          break;
        case 'reported_on':
          {
            queryBuilder.orderBy({
              'vote_like_flag.created_on': sorting_order,
            });
          }
          break;
        case 'type':
          {
            queryBuilder.orderBy({
              'LOWER(CAST(vote_like_flag.cmty_flag_type AS text))':
                sorting_order,
            });
          }
          break;
        case 'message':
          {
            queryBuilder.orderBy({
              'LOWER(vote_like_flag.flag_reason)': sorting_order,
            });
          }
          break;
      }
    }

    const [flagList, total_count] = await Promise.all([
      queryBuilder.getMany(),
      queryBuilder.getCount(),
    ]);

    const page_number = listCommunityFlagInput.page;
    const items_per_page = listCommunityFlagInput.perPage;

    const startIndex =
      page_number && items_per_page ? (page_number - 1) * items_per_page : 0;
    const endIndex =
      page_number && items_per_page
        ? Math.min(
            (page_number - 1) * items_per_page + items_per_page,
            total_count,
          )
        : total_count;
    // Slice the results array to get the results for the current page
    const filterflagList = flagList?.slice(startIndex, endIndex);

    const formattedFlags = filterflagList.map((flag) => ({
      ...flag,
      title: flag.discussionIdea?.title || null, // Extract title directly
      answer_comment: flag.answerComment?.answer_comment || null, // Extract answer_comment directly
      discussionIdea: undefined, // Remove nested object
      answerComment: undefined, // Remove nested object
    }));

    return { flagsList: formattedFlags, total_count };
  }

  async updateDiscussionIdea(
    decoded: any,
    updateDiscussionIdeaInput: UpdateDiscussionIdeaInput,
  ) {
    const discussionIdea = await this.discussionsIdeas.findOne({
      where: { id: updateDiscussionIdeaInput.id },
      relations: ['category'],
    });
    if (!discussionIdea) {
      throw new Error(`Discussion/Idea does not exist.`);
    }
    const updatedDiscussionIdea = {
      ...discussionIdea,
      ...updateDiscussionIdeaInput,
    };
    updatedDiscussionIdea.title =
      updatedDiscussionIdea.title || discussionIdea.title;
    updatedDiscussionIdea.content =
      updatedDiscussionIdea.content || discussionIdea.content;
    updatedDiscussionIdea.cmty_content_type =
      updatedDiscussionIdea.cmty_content_type ||
      discussionIdea.cmty_content_type;
    updatedDiscussionIdea.discussion_idea_status =
      updatedDiscussionIdea.discussion_idea_status ||
      discussionIdea.discussion_idea_status;

    if (updateDiscussionIdeaInput.categoryId != undefined) {
      const newBlogCategory = await this.masterDetails.findOne({
        where: { id: updateDiscussionIdeaInput.categoryId },
      });
      if (!newBlogCategory) {
        throw new Error(`new Discussion/Idea category does not exist.`);
      }
      updatedDiscussionIdea.category = newBlogCategory;
    }
    updatedDiscussionIdea.edited_on = new Date();
    const result = await this.discussionsIdeas.save(updatedDiscussionIdea);
    return result;
  }

  async viewCountUpdateDiscussionIdea(id: string) {
    const result = await this.discussionsIdeas
      .createQueryBuilder()
      .update()
      .set({ view_count: () => 'COALESCE(view_count, 0) + 1' }) // Atomic increment
      .where('id = :id', { id })
      .execute();
    return result;
  }

  async checkUserCommunityEmailPreference({
    email_ids,
    isAdmin = false,
  }: {
    email_ids: string | string[];
    isAdmin?: boolean;
  }): Promise<any | any[]> {
    try {
      const isArray = Array.isArray(email_ids);

      if ((isArray && email_ids?.length) || (!isArray && email_ids)) {
        const queryBuilder = await this.userDetails
          .createQueryBuilder('u')
          .select(['u.email_id as email_id', 'u.user_id as user_id'])
          .where(`u.email_preferences ->> 'community' = :enabled`, {
            enabled: true,
          });

        if (isArray) {
          queryBuilder.andWhere('u.email_id IN (:...email_ids)', { email_ids });
        } else {
          queryBuilder.andWhere('u.email_id = :email_ids', { email_ids });
        }

        return isArray
          ? await queryBuilder.getRawMany()
          : await queryBuilder.getRawOne();
      }
      return isArray ? [] : null;
    } catch (error) {
      throw error;
    }
  }

  async addAnswerComment(
    decoded: any,
    addAnswerCommentInput: AddAnswerCommentInput,
  ) {
    let answerCommentAuthor,
      answerCommentAdminAuthor = null;
    if (decoded?.isAdmin === true) {
      answerCommentAdminAuthor = await this.adminDetails.findOne({
        where: { id: decoded?.id },
      });
    } else {
      answerCommentAuthor = await this.userDetails.findOne({
        where: { id: decoded?.id },
      });
    }

    const discussionIdea = await this.discussionsIdeas.findOne({
      where: { discussion_idea_id: addAnswerCommentInput.discussion_idea_id },
      relations: ['author', 'admin_author', 'category'],
    });

    if (!discussionIdea) {
      throw new Error(`Discussion / Idea does not exist.`);
    }

    const query = this.voteLikesFlags
      .createQueryBuilder('voteFlag')
      .leftJoinAndSelect('voteFlag.discussionIdea', 'discussionIdea')
      .leftJoinAndSelect('voteFlag.answerComment', 'answerComment')
      .leftJoinAndSelect('voteFlag.voter_liked_flagged', 'userVoter')
      .leftJoinAndSelect('voteFlag.admin_voter_liked_flagged', 'adminVoter')
      .where('voteFlag.disc_idea_id = :discussionId', {
        discussionId: addAnswerCommentInput.discussion_idea_id,
      })
      .andWhere('voteFlag.reaction_type IN (:...reactions)', {
        reactions: ['Like', 'Vote'],
      })
      .select(['userVoter.email_id', 'adminVoter.email_id'])
      .distinct(true);

    const result = await query.getRawMany();

    const adminEmailIds = result
        ?.filter((voteFlag) => voteFlag?.adminVoter_email_id !== null)
        ?.map((e) => e?.adminVoter_email_id),
      userEmailIds = result
        ?.filter((voteFlag) => voteFlag?.userVoter_email_id !== null)
        ?.map((e) => e?.userVoter_email_id);

    const emailIds = result
      .flatMap((item) => [item.userVoter_email_id, item.adminVoter_email_id])
      .filter((email) => email !== null);

    const newAnswerCommentDetails = this.answerComments.create({
      ...addAnswerCommentInput,
      discussionIdea: discussionIdea,
      author: answerCommentAuthor,
      admin_author: answerCommentAdminAuthor,
    });

    let discussion_idea_text, response, your_dis_idea_text;
    if (discussionIdea.cmty_content_type == 'Discussion') {
      discussion_idea_text = 'The discussion you liked ';
      your_dis_idea_text = 'Your discussion';
      response = 'answer';
    } else {
      discussion_idea_text = 'The idea you voted for';
      your_dis_idea_text = 'Your idea';
      response = 'comment';
    }

    const answerCommentDetails = await this.answerComments.save(
      newAnswerCommentDetails,
    );

    await this.discussionsIdeas.update(
      { discussion_idea_id: addAnswerCommentInput.discussion_idea_id },
      { answer_comment_count: (discussionIdea.answer_comment_count || 0) + 1 },
    );

    answerCommentDetails.answer_comment_id =
      Number(answerCommentDetails.answer_comment_id) + 10000000;
    const answerComment = await this.answerComments.save(answerCommentDetails);

    const payload = {
      id: addAnswerCommentInput.discussion_idea_id,
      page: 1,
      perPage: 4,
      best_ans: null,
      status: null,
      sorting_field: 'added_date',
    };
    const other_comments_withCount = await this.listAnswerComments(
      null,
      payload,
    );
    const other_comments = other_comments_withCount.comment;
    const other_comments_count = other_comments_withCount.total_count;

    let comments_count = null;
    if (other_comments_count > 5) {
      comments_count = other_comments_count - 4;
    }

    // Reusable function to convert date
    function convertDate(dateString) {
      if (!dateString) return ''; // Handle empty dates gracefully

      const date = new Date(dateString);
      return (
        date.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
        }) +
        ' ' +
        date.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
    }

    // Handlebars helper
    Handlebars.registerHelper('formatDate', function (dateString) {
      return convertDate(dateString);
    });

    const categoryDetails = discussionIdea.category
      ? discussionIdea.category.value
      : 'all';

    const disc_idea_link =
      `${process.env.LOG_BASE_URL}` +
      `/community/discussions/` +
      categoryDetails.replace(/ /g, '-') +
      '/' +
      discussionIdea.title.replace(/ /g, '-') +
      '/' +
      discussionIdea.id;

    const commentsTemplate = `
                                    <ul style="list-style: none; padding: 0; margin: 10px 0;">
                            {{#if other_comments.length}}
                                {{#if comments_count}}
                                    <div style="margin-top: 10px;">
                                    <a href="{{disc_idea_link}}" 
                                       style="display: inline-block; padding: 8px 12px; background-color: #f0f0f0; color: #0073b1; 
                                              text-decoration: none; font-weight: bold; border-radius: 5px; font-size: 14px; border: 1px solid #ccc;">
                                        {{comments_count}} older {{response}}s
                                    </a>
                                    </div>
                                {{/if}}

                                {{#each other_comments}}
                                <li style="display: flex; align-items: flex-start; margin-bottom: 15px; padding: 10px; border-bottom: 1px solid #ddd;">
                                    <!-- User Avatar -->
                                    <div style="margin-right: 10px;">
                                        <img src="{{this.answer_comment_owner_image_url}}"  alt="User Avatar"  style="width: 40px; height: 40px; border-radius: 50%;">
                                    </div>

                                    <!-- Comment Content -->
                                    <div style="flex: 1;">
                                        <p style="margin: 0; font-weight: bold; color: #0073b1;">{{this.answer_comment_owner_name}}</p>
                                        <p style="margin: 5px 0; font-size: 14px; color: #333;">{{this.answer_comment}}</p>

                                        <!-- Comment Footer (Date & Likes) -->
                                        <div style="display: flex; align-items: center; gap: 10px; font-size: 12px; color: #777;">
                                            <span>{{formatDate this.created_on}}</span>&nbsp;&nbsp;&nbsp;
                                            <span style="display: flex; align-items: right; gap: 5px;">
                                                Likes: {{this.like_count}}
                                            </span>
                                        </div>
                                    </div>
                                </li>
                                {{/each}}
                            {{else}}
                                <p>No comments available.</p>
                            {{/if}}
                        </ul>
                    `;

    const compiledCommentsTemplate = Handlebars.compile(commentsTemplate);
    const renderedCommentsHtml = compiledCommentsTemplate({
      other_comments,
      comments_count,
      response,
      disc_idea_link,
    });

    const commentOwner = answerComment.author
      ? await this.userDetails.findOne({
          where: { user_id: answerComment.author?.user_id },
        })
      : await this.adminDetails.findOne({
          where: { admin_id: answerComment.admin_author?.admin_id },
        });

    // Need to check user email preference - Community
    const discIdeaOwner = discussionIdea.author
      ? await this.userDetails.findOne({
          where: { user_id: discussionIdea.author?.user_id },
        })
      : await this.adminDetails.findOne({
          where: { admin_id: discussionIdea.admin_author?.admin_id },
        });

    const discIdeaOwnerImage = discIdeaOwner.profile_id
      ? await this.fileAttachments.findOne({
          where: { id: discIdeaOwner.profile_id },
        })
      : null;
    const discIdeaOwner_owner_image_url = discIdeaOwnerImage
      ? (discIdeaOwnerImage.file_path.startsWith('/') ? discIdeaOwnerImage.file_path : `/${discIdeaOwnerImage.file_path}`)
      : '/profile_photo/1742208051996-493540972-avatar.png';

    const ans_comm_owner_name = answerComment.author
      ? answerComment.author.first_name + ' ' + answerComment.author.last_name
      : answerComment.admin_author.first_name +
        ' ' +
        answerComment.admin_author.last_name;

    const disc_idea_owner_name = discussionIdea.author
      ? discussionIdea.author.first_name + ' ' + discussionIdea.author.last_name
      : discussionIdea.admin_author.first_name +
        ' ' +
        discussionIdea.admin_author.last_name;

    const commentOwnerImage = commentOwner.profile_id
      ? await this.fileAttachments.findOne({
          where: { id: commentOwner.profile_id },
        })
      : null;

    const answer_comment_owner_image_url = commentOwnerImage
      ? (commentOwnerImage.file_path.startsWith('/') ? commentOwnerImage.file_path : `/${commentOwnerImage.file_path}`)
      : '/profile_photo/1742208051996-493540972-avatar.png';

    let getCommunityEmailEnabledUser = [];

    if (userEmailIds?.length) {
      getCommunityEmailEnabledUser =
        await this.checkUserCommunityEmailPreference({
          email_ids: userEmailIds,
        });
    }

    const discOwnerEmailCmtyEnabled =
      await this.checkUserCommunityEmailPreference({
        email_ids: discIdeaOwner.email_id,
      });

    const newAnswerComment = {
      ...answerComment,
      mail_ids: [
        ...getCommunityEmailEnabledUser?.map((u) => u?.email_id),
        ...adminEmailIds,
      ],
      idea_discussion: discussion_idea_text,
      your_idea_disc: your_dis_idea_text,
      response: response,
      title: discussionIdea.title,
      content: discussionIdea.content,
      answer_comm_date: convertDate(answerComment.created_on),
      ans_comm_owner_name: ans_comm_owner_name,
      ans_comm_owner_image: answer_comment_owner_image_url,
      author_name: disc_idea_owner_name,
      discussionIdea_date: convertDate(discussionIdea.created_on),
      discIdea_owner_image: discIdeaOwner_owner_image_url,
      discIdea_owner_mail: discIdeaOwner.email_id,
      isCommunityEmailEnabled: discussionIdea?.author
        ? discOwnerEmailCmtyEnabled?.email_id
          ? true
          : false
        : true,
      discussionIdea_like_count: discussionIdea.like_count,
      discussionIdea_view_count: discussionIdea.view_count,
      other_comments: renderedCommentsHtml,
      disc_idea_link: disc_idea_link,
    };

    return newAnswerComment;
  }

  async updateAnswerComment(
    decoded: any,
    updateAnswerCommentInput: UpdateAnswerCommentInput,
  ) {
    const answerComment = await this.answerComments.findOne({
      where: { answer_comment_id: updateAnswerCommentInput.answer_comment_id },
      relations: ['discussionIdea'],
    });

    if (!answerComment) {
      throw new Error(`Answer/Comment does not exist.`);
    }

    const updatedAnswerComment = {
      ...answerComment,
      ...updateAnswerCommentInput,
    };
    updatedAnswerComment.answer_comment =
      updateAnswerCommentInput.answer_comment || answerComment.answer_comment;
    updatedAnswerComment.answer_comment_status =
      updateAnswerCommentInput.answer_comment_status ||
      answerComment.answer_comment_status;
    const result = await this.answerComments.save(updatedAnswerComment);

    if (
      updateAnswerCommentInput.answer_comment_status === 'Deleted' &&
      result
    ) {
      await this.discussionsIdeas.update(
        { id: answerComment.discussionIdea.id },
        {
          answer_comment_count:
            (answerComment.discussionIdea.answer_comment_count || 0) - 1,
        },
      );
    }
    // const discIdeaResourceWithAttach = await this.addAttachmentURLtoBlogs(result);
    return result;
  }

  async addUpdateVoteLikeFlag(
    decoded: any,
    addUpdateVoteLikeFlagInput: VoteLikeFlagInput,
  ) {
    if (
      addUpdateVoteLikeFlagInput.reaction_type === 'Flag' &&
      !addUpdateVoteLikeFlagInput.cmty_flag_type
    ) {
      throw new Error(`Please select the flag type`);
    }

    const query = this.voteLikesFlags
      .createQueryBuilder('voteFlag')
      .leftJoinAndSelect('voteFlag.discussionIdea', 'discussionIdea')
      .leftJoinAndSelect('voteFlag.answerComment', 'answerComment')
      .leftJoinAndSelect('voteFlag.voter_liked_flagged', 'userVoter')
      .leftJoinAndSelect('voteFlag.admin_voter_liked_flagged', 'adminVoter');

    const admin_id = decoded?.isAdmin ? decoded?.userId : null;
    const user_id = decoded?.isAdmin ? null : decoded?.userId;

    if (addUpdateVoteLikeFlagInput.discussion_idea_id) {
      query.andWhere('discussionIdea.discussion_idea_id = :discussionId', {
        discussionId: addUpdateVoteLikeFlagInput.discussion_idea_id,
      });
    } else {
      query.andWhere('answerComment.answer_comment_id = :answerId', {
        answerId: addUpdateVoteLikeFlagInput.answer_comment_id,
      });
    }

    // Check for a vote from admin or user
    if (admin_id) {
      query.andWhere('adminVoter.admin_id = :adminID', { adminID: admin_id });
    } else if (user_id) {
      query.andWhere('userVoter.user_id = :userId', { userId: user_id });
    }
    // Fetch the single record
    const VoteFlag = await query.getOne();

    let contentType = null;

    if (!VoteFlag) {
      //if its a new response add new vote/like/flag

      let voteLikeFlagBy,
        voteLikeFlagByAdmin = null;
      if (admin_id) {
        voteLikeFlagByAdmin = await this.adminDetails.findOne({
          where: { admin_id: admin_id },
        });
      } else {
        voteLikeFlagBy = await this.userDetails.findOne({
          where: { user_id: user_id },
        });
      }

      let discussionIdea,
        answerComment = null;
      if (
        !addUpdateVoteLikeFlagInput.discussion_idea_id &&
        !addUpdateVoteLikeFlagInput.answer_comment_id
      ) {
        throw new Error(`Content to react does not exist.`);
      }

      if (addUpdateVoteLikeFlagInput.discussion_idea_id) {
        discussionIdea = await this.discussionsIdeas.findOne({
          where: {
            discussion_idea_id: addUpdateVoteLikeFlagInput.discussion_idea_id,
          },
        });
        contentType = 'discussionIdea';
      } else {
        answerComment = await this.answerComments.findOne({
          where: {
            answer_comment_id: addUpdateVoteLikeFlagInput.answer_comment_id,
          },
        });
        contentType = 'answerComment';
      }

      const newVoteLikeFlag = this.voteLikesFlags.create({
        ...addUpdateVoteLikeFlagInput,
        discussionIdea: discussionIdea,
        answerComment: answerComment,
        voter_liked_flagged: voteLikeFlagBy,
        admin_voter_liked_flagged: voteLikeFlagByAdmin,
      });

      const result = await this.voteLikesFlags.save(newVoteLikeFlag);

      // Update the count in the respective table
      if (contentType === 'discussionIdea') {
        await this.updateCounts(
          discussionIdea.discussion_idea_id,
          addUpdateVoteLikeFlagInput.reaction_type,
          'add',
        );
      } else if (contentType === 'answerComment') {
        await this.updateCounts(
          answerComment.answer_comment_id,
          addUpdateVoteLikeFlagInput.reaction_type,
          'add',
          true,
        );
      }

      return result;
    } else {
      const previousReaction = VoteFlag.reaction_type;

      if (addUpdateVoteLikeFlagInput.reaction_type === 'None') {
        if (previousReaction !== 'None') {
          if (VoteFlag.discussionIdea) {
            await this.updateCounts(
              VoteFlag.discussionIdea.discussion_idea_id,
              previousReaction,
              'remove',
            );
          } else if (VoteFlag.answerComment) {
            await this.updateCounts(
              VoteFlag.answerComment.answer_comment_id,
              previousReaction,
              'remove',
              true,
            );
          }

          // Remove the vote/like/flag record
          await this.voteLikesFlags.delete(VoteFlag.id);
        }
        return { message: 'Reaction removed successfully' };
      }

      const updatedVoteLikeFlag = {
        ...VoteFlag,
        ...addUpdateVoteLikeFlagInput,
      };
      updatedVoteLikeFlag.reaction_type =
        updatedVoteLikeFlag.reaction_type || updatedVoteLikeFlag.reaction_type;

      const result = await this.voteLikesFlags.save(updatedVoteLikeFlag);

      if (previousReaction !== addUpdateVoteLikeFlagInput.reaction_type) {
        // Decrease count of the previous reaction
        if (VoteFlag.discussionIdea) {
          await this.updateCounts(
            VoteFlag.discussionIdea.discussion_idea_id,
            previousReaction,
            'remove',
          );
          await this.updateCounts(
            VoteFlag.discussionIdea.discussion_idea_id,
            addUpdateVoteLikeFlagInput.reaction_type,
            'add',
          );
        } else if (VoteFlag.answerComment) {
          await this.updateCounts(
            VoteFlag.answerComment.answer_comment_id,
            previousReaction,
            'remove',
            true,
          );
          await this.updateCounts(
            VoteFlag.answerComment.answer_comment_id,
            addUpdateVoteLikeFlagInput.reaction_type,
            'add',
            true,
          );
        }
      }
      return result;
    }
  }

  private async updateCounts(
    contentId: number,
    reactionType: string,
    operation: 'add' | 'remove',
    isAnswer: boolean = false,
  ) {
    const table = isAnswer ? this.answerComments : this.discussionsIdeas;
    const column = `${reactionType.toLowerCase()}_count`; // Example: vote_count, like_count, flag_count

    const incrementValue = operation === 'add' ? 1 : -1;

    if (reactionType !== 'None') {
      const x = await table
        .createQueryBuilder()
        .update()
        .set({
          [column]: () =>
            `GREATEST(0, COALESCE(${column}, 0) + ${incrementValue})`,
        })
        .where(
          isAnswer
            ? { answer_comment_id: contentId }
            : { discussion_idea_id: contentId },
        )
        .execute();
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

  async addAttachmentURL(attachments: FileAttachments[]) {
    if (!attachments || attachments.length === 0) {
      throw new Error(`Attachments not responding`);
    }
    return attachments.map((attachment) => {
      const cleanPath = attachment.file_path?.replace(/\\/g, '/') || '';
      return {
        ...attachment,
        file_path: cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`,
      };
    });
  }
}
