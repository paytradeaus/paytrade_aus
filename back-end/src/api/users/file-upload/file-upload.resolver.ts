import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { FileUploadService } from './file-upload.service';
import { FileUploadResponse } from './response/file-upload.response';
import { CreateFileUploadInput } from './dto/create-file-upload.input';
import { GraphQLUpload, Upload } from 'graphql-upload';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/api/auth/jwt-guard/jwt-auth.guard';
import { RolesGuard } from 'src/api/auth/role-guard/roles.guard';
import { Roles } from 'src/api/auth/role-guard/roles.decorator';
import { Role } from 'src/api/auth/role-guard/role.enum';
import { JwtInternalService } from 'src/libs/@jwt-internal-services/jwt.internal.service';
import { framedResponse } from 'src/libs/@response-framer/response-framer';
import { UploadMultipleFilesInput } from './dto/upload-files.input';
import { MultipleFilesUploadResponse } from './response/upload-files.response';
import { GetFileResponse } from './response/get-file.response';
import { GetFileDetailsResponse } from './response/get-file-details.response';
import { handleError } from 'src/api/common/error-handler';
import { CreateActivityLogInput } from 'src/api/common/activity-log/dto/create-activity-log.input';
import { ActivityLogService } from 'src/api/common/activity-log/activity-log.service';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';
import { StringResponse } from '../signup/response/auth.response';
import { linkExtensions } from 'src/api/common/activity-log/link-extensions';
import { PtContentsService } from 'src/api/admin/pt-contents/pt-contents.service';
import { PtAdminAccessService } from 'src/api/admin/pt-admin-access/pt-admin-access.service';
import * as path from 'path';
import { ObjectStorageService } from 'src/libs/@object-storage';
import {
  MarketingImageUploadResponse,
  MarketingImageListResponse,
} from './response/marketing-image.response';

function formatPublicPath(filePath: string | null | undefined): string {
  if (!filePath) return '';
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
  if (filePath.startsWith('/')) return filePath;
  return `/${filePath}`;
}

@Resolver()
export class FileUploadResolver {
  private logger: PaytradeLogger;
  constructor(
    private readonly jwtInternalService: JwtInternalService,
    private readonly fileUploadService: FileUploadService,
    private readonly ptContentsService: PtContentsService,
    private readonly activityLogService: ActivityLogService,
    private readonly ptAdminAccessService: PtAdminAccessService,
    private readonly objectStorageService: ObjectStorageService,
  ) {
    this.logger = new PaytradeLogger('FILE_UPLOAD');
  }

  private log(message: string) {
    this.logger.log(`${message}`);
  }

  private logError(message: string) {
    this.logger.error(`${message}`);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.BASIC_USER,
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Mutation(() => FileUploadResponse, {
    name: 'fileUpload',
    description:
      'Uploads a single file with proper validation, saves it to storage, and logs activity accordingly.',
  })
  async fileUpload(
    @Context() context,
    @Args({
      name: 'file',
      type: () => GraphQLUpload,
      description:
        'The file to be uploaded, including stream, filename, mimetype, and encoding',
    })
    { createReadStream, filename, mimetype, encoding }: Upload, //file: FileUpload
    @Args('createFileUploadInput', {
      description:
        'Additional metadata and options for the file being uploaded',
    })
    createFileUploadInput: CreateFileUploadInput,
  ): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        const decoded = await this.jwtInternalService.decodeJwtToken(context);
        if (
          !decoded?.isAdmin &&
          (createFileUploadInput?.attachment_type === 'Company_logo' ||
            createFileUploadInput?.attachment_type === 'Trust_Training_Records')
        ) {
          if (
            createFileUploadInput?.company_id &&
            decoded?.companySpecificRoles &&
            decoded?.companySpecificRoles.length > 0 &&
            decoded?.companySpecificRoles[0] !== null
          ) {
            const roles = decoded?.companySpecificRoles?.filter((item) => {
              return item.companyId === createFileUploadInput?.company_id;
            });
            this.logger.log(
              `Response received with roles: ${JSON.stringify(roles)}`,
            );
            if (
              (roles &&
                roles.length > 0 &&
                roles[0] !== null &&
                roles[0].role &&
                roles[0].role !== 'PRIMARY ADMIN') ||
              !roles ||
              !roles[0]?.role
            ) {
              return resolve(
                framedResponse('ERROR', `Unauthorized to perform this action`),
              );
            }
          } else {
            return resolve(
              framedResponse('ERROR', `Unauthorized to perform this action`),
            );
          }
        }
        this.logger.log(
          `Request received for uploding the file with input: ${JSON.stringify(createFileUploadInput)}`,
        );
        const allowedImageTypes = ['image/jpeg', 'image/png'];
        const allowedDocTypes = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        const allowedUploadTypes = ['text/csv', 'application/vnd.ms-excel'];
        const allowedOtherTypes = [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
        ];
        const allowedArchiveTypes = [
          'application/zip',
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        // Validate file type
        let allowedFileTypes = [],
          maxFileSize = 0;
        if (
          createFileUploadInput?.attachment_type === 'User_profile' ||
          createFileUploadInput?.attachment_type === 'Admin_profile' ||
          createFileUploadInput?.attachment_type === 'Company_logo' ||
          createFileUploadInput?.attachment_type === 'Blog_banner'
        ) {
          allowedFileTypes = allowedImageTypes;
          maxFileSize = 2 * 1024 * 1024;
        } else if (
          createFileUploadInput?.attachment_type === 'Trust_Training_Records' ||
          createFileUploadInput?.attachment_type ===
            'Retention_trust_certificates' ||
          createFileUploadInput?.attachment_type ===
            'Optional_supporting_statement_attachments' ||
          createFileUploadInput?.attachment_type === 'Contracts' ||
          createFileUploadInput?.attachment_type === 'Variations' ||
          createFileUploadInput?.attachment_type === 'Bank_statements'
        ) {
          allowedFileTypes = allowedDocTypes;
          maxFileSize = 10 * 1024 * 1024;
        } else if (
          createFileUploadInput?.attachment_type ===
          'Transaction_csv_file_attachments'
        ) {
          allowedFileTypes = allowedUploadTypes;
          maxFileSize = 10 * 1024 * 1024;
        } else if (createFileUploadInput?.attachment_type === 'Audit') {
          allowedFileTypes = allowedArchiveTypes;
          maxFileSize = 25 * 1024 * 1024;
        } else if (
          createFileUploadInput?.attachment_type === 'Optional_attachments' ||
          createFileUploadInput?.attachment_type === 'Compulsory_attachments' ||
          createFileUploadInput?.attachment_type === 'Notices_templates' ||
          createFileUploadInput?.attachment_type === 'Notices_uploads' ||
          createFileUploadInput?.attachment_type === 'Recieved_notices_uploads'
        ) {
          allowedFileTypes = allowedDocTypes;
          maxFileSize = 20 * 1024 * 1024;
        } else if (createFileUploadInput?.attachment_type === 'Admin_holiday') {
          allowedFileTypes = allowedOtherTypes;
          maxFileSize = 10 * 1024 * 1024; // add if need
        } else {
          allowedFileTypes = [
            ...allowedImageTypes,
            ...allowedDocTypes,
            ...allowedUploadTypes,
            ...allowedOtherTypes,
          ];
          if (allowedFileTypes.includes(mimetype)) {
            if (allowedImageTypes.includes(mimetype)) {
              maxFileSize = 2 * 1024 * 1024;
            } else {
              maxFileSize = 10 * 1024 * 1024;
            }
          }
        }
        this.logger.log(`allowedFileTypes: ${allowedFileTypes}, mimetype: ${mimetype}`);
        if (!allowedFileTypes.includes(mimetype)) {
          return resolve(framedResponse('ERROR', `Invalid file type`));
        }

        // Read the stream once and collect all data into a buffer
        const chunks: Buffer[] = [];
        let fileSize = 0;

        await new Promise<void>((resolveStream, rejectStream) => {
          const stream = createReadStream();
          stream.on('data', (chunk) => {
            fileSize += chunk.length;
            chunks.push(chunk);
          });
          stream.on('end', () => resolveStream());
          stream.on('error', (err) => rejectStream(err));
        });

        const fileBuffer = Buffer.concat(chunks);
        this.logger.log(`fileSize: ${fileSize}`);
        this.logger.log(`maxFileSize: ${maxFileSize}`);

        // Bank statement CSVs are intentionally NOT validated here.
        // The downstream `processUploadedTransactionsCsv` mutation runs
        // `normaliseBankCsv`, which handles bank-export variations the
        // strict header check cannot — `sep=,` Excel directive,
        // preamble metadata rows (NAB "Account Name:", "Opening
        // balance:" etc.), Excel `="..."` formula-escaping, split
        // Debit/Credit columns, and header aliases (Date/Narrative/
        // Running Balance). Re-validating up-front with a hard-coded
        // PT-template header list would reject every real bank export
        // and defeat the purpose of the canonicalising parser. The
        // downstream service returns a clear error if the file truly
        // can't be parsed.

        // Continue with file size validation and upload
        {
            if (fileSize > maxFileSize) {
              return resolve(
                framedResponse('ERROR', `File size exceeds the limit`),
              );
            }

            let customFileName = null,
              attachment_type = createFileUploadInput?.attachment_type,
              isClaimPayment =
                attachment_type === 'Optional_attachments' ||
                attachment_type === 'Compulsory_attachments';

            if (
              attachment_type === 'Variations' ||
              attachment_type === 'Contracts' ||
              attachment_type === 'Audit' ||
              // attachment_type === 'Notices_uploads' ||
              (isClaimPayment && createFileUploadInput?.payment_id)
            ) {
              const fileMimeType = path.extname(filename);

              const module_id =
                attachment_type === 'Variations'
                  ? createFileUploadInput?.variation_id
                  : attachment_type === 'Contracts'
                    ? createFileUploadInput?.contract_id
                    : attachment_type === 'Audit'
                      ? createFileUploadInput?.audit_id
                      : isClaimPayment
                        ? createFileUploadInput?.payment_id
                        : // : attachment_type === 'Notices_uploads'
                          //   ? createFileUploadInput?.notice_id
                          null;

              if (module_id) {
                customFileName = await this.fileUploadService.getCustomFileName(
                  {
                    attachment_type: createFileUploadInput?.attachment_type,
                    module_id,
                    // ...(attachment_type === 'Notices_uploads' && {
                    //   data: { isUserUpdated: true },
                    // }),
                    ...(isClaimPayment && {
                      data: { isClaimPayment },
                    }),
                    decoded,
                  },
                );
                customFileName = `${customFileName}${fileMimeType}`;
              }
            }

            const fileNamePrefix =
              Date.now() + '-' + Math.round(Math.random() * 1e9);
            const finalFilename = customFileName || `${fileNamePrefix}-${filename}`;
            
            try {
              const uploadResult = await this.objectStorageService.uploadFile(
                fileBuffer,
                createFileUploadInput?.attachment_type,
                finalFilename,
                mimetype,
              );
              
              if (!uploadResult.success) {
                return resolve(framedResponse('ERROR', 'Failed to upload file to storage'));
              }
              
              const filePath = uploadResult.objectPath;
              createFileUploadInput.file_name = filename;
              createFileUploadInput.file_path = filePath;
              createFileUploadInput.file_type = mimetype;

              if (customFileName) {
                createFileUploadInput.custom_file_name = customFileName;
              }

              const response = await this.fileUploadService.saveFile(
                decoded,
                createFileUploadInput,
              );
              this.logger.log(
                `Response received after creating the file upload with data: ${JSON.stringify(response)}`,
              );
              if (response) {
                if (response.file_path) {
                  const imageBuffer = fileBuffer;
                  const image = imageBuffer.toString('base64');
                  response['file'] =
                    `data:${response.file_type};base64,${image}`;
                    response.file_path = formatPublicPath(filePath);
                  }
                  if (
                    createFileUploadInput?.attachment_type === 'User_profile'
                  ) {
                    const createActivityLogInput: CreateActivityLogInput = {
                      event_template_id: 7,
                      admin_id:
                        decoded?.logged_in_by &&
                        decoded?.logged_in_by == 'ADMIN'
                          ? decoded?.admin_id
                          : null,
                      to_user:
                        decoded?.logged_in_by &&
                        decoded?.logged_in_by == 'ADMIN'
                          ? decoded?.userId
                          : null,
                      from_user:
                        decoded?.logged_in_by &&
                        decoded?.logged_in_by == 'ADMIN'
                          ? null
                          : decoded?.userId,
                      company_id: decoded?.userId
                        ? await this.activityLogService.getSystemAddedCompanyId(
                            decoded?.userId,
                          )
                        : null,
                      is_admin: false,
                      created_by: decoded?.userId,
                    };
                    await this.activityLogService.insertActivityLog(
                      createActivityLogInput,
                    );
                  } else if (
                    createFileUploadInput?.attachment_type === 'Admin_profile'
                  ) {
                    const createActivityLogInput: CreateActivityLogInput = {
                      event_template_id: 7,
                      admin_id: decoded?.userId,
                      is_admin: decoded?.isAdmin,
                      created_by: decoded?.userId,
                    };
                    await this.activityLogService.insertActivityLog(
                      createActivityLogInput,
                    );
                  } else if (
                    createFileUploadInput?.attachment_type === 'Company_logo'
                  ) {
                    //Generating company link.
                    const companyLink =
                      `${process.env.LOG_BASE_URL}` +
                      `${linkExtensions[2]}` +
                      `${createFileUploadInput?.company_id}` +
                      `?from=log`;
                    this.logger.log(`companyLink: ${companyLink}`);

                    const companyLinkAdmin =
                      `${process.env.LOG_BASE_URL}` +
                      `${linkExtensions[20]}` +
                      `${createFileUploadInput?.company_id}` +
                      `?from=log`;
                    this.logger.log(`companyLinkAdmin: ${companyLinkAdmin}`);
                    const companyName =
                      await this.fileUploadService.getCompanyName(
                        createFileUploadInput?.company_id,
                      );

                    if (decoded?.isAdmin) {
                      const createActivityLogInput: CreateActivityLogInput = {
                        event_template_id: 184,
                        admin_id: decoded?.userId,
                        is_admin: decoded?.isAdmin,
                        dynamic_values: {
                          companyLink: companyLinkAdmin,
                          companyName: companyName,
                        },
                        company_id: createFileUploadInput?.company_id,
                        created_by: decoded?.userId,
                      };
                      await this.activityLogService.insertActivityLog(
                        createActivityLogInput,
                      );
                    } else {
                      const createActivityLogInput: CreateActivityLogInput = {
                        event_template_id: 14,
                        admin_id:
                          decoded?.logged_in_by &&
                          decoded?.logged_in_by == 'ADMIN'
                            ? decoded?.admin_id
                            : null,
                        to_user:
                          decoded?.logged_in_by &&
                          decoded?.logged_in_by == 'ADMIN'
                            ? decoded?.userId
                            : null,
                        from_user:
                          decoded?.logged_in_by &&
                          decoded?.logged_in_by == 'ADMIN'
                            ? null
                            : decoded?.userId,
                        company_id: createFileUploadInput?.company_id,
                        is_admin: false,
                        created_by: decoded?.userId,
                      };
                      await this.activityLogService.insertActivityLog(
                        createActivityLogInput,
                      );
                    }
                  } else if (
                    createFileUploadInput?.attachment_type ===
                    'Transaction_csv_file_attachments'
                  ) {
                    const createActivityLogInput: CreateActivityLogInput = {
                      event_template_id: 119,
                      admin_id:
                        decoded?.logged_in_by &&
                        decoded?.logged_in_by == 'ADMIN'
                          ? decoded?.admin_id
                          : null,
                      to_user:
                        decoded?.logged_in_by &&
                        decoded?.logged_in_by == 'ADMIN'
                          ? decoded?.userId
                          : null,
                      from_user:
                        decoded?.logged_in_by &&
                        decoded?.logged_in_by == 'ADMIN'
                          ? null
                          : decoded?.userId,
                      company_id: createFileUploadInput?.bank_account_id
                        ? await this.activityLogService.getCompanyIdofABank(
                            createFileUploadInput?.bank_account_id,
                          )
                        : null,
                      dynamic_values: {
                        accountName: createFileUploadInput?.bank_account_id,
                      },
                      is_admin: false,
                      created_by: decoded?.userId,
                    };
                    this.logger.log(`activity_log: ${JSON.stringify(createActivityLogInput)}`);
                    await this.activityLogService.insertActivityLog(
                      createActivityLogInput,
                    );
                  } else if (
                    [
                      'Notices_uploads',
                      'qbcc_notice_uploads',
                      'Notices_support_docs',
                      'Recieved_notices_uploads',
                    ].includes(createFileUploadInput?.attachment_type)
                  ) {
                    const notice_data =
                      await this.fileUploadService.getNoticeNameId(
                        createFileUploadInput?.notice_id,
                      );
                    const noticeLink =
                      `${process.env.LOG_BASE_URL}` +
                      `${linkExtensions[14]}` +
                      `${notice_data.id}` +
                      `?from=log`;
                    this.logger.log(`noticeLink: ${noticeLink}`);

                    const createActivityLogInput: CreateActivityLogInput = {
                      event_template_id: 129,
                      admin_id:
                        decoded?.logged_in_by &&
                        decoded?.logged_in_by == 'ADMIN'
                          ? decoded?.admin_id
                          : null,
                      to_user:
                        decoded?.logged_in_by &&
                        decoded?.logged_in_by == 'ADMIN'
                          ? decoded?.userId
                          : null,
                      from_user:
                        decoded?.logged_in_by &&
                        decoded?.logged_in_by == 'ADMIN'
                          ? null
                          : decoded?.userId,
                      company_id: createFileUploadInput?.notice_id
                        ? await this.activityLogService.getCompanyIdofANotice(
                            createFileUploadInput?.notice_id,
                          )
                        : null,
                      dynamic_values: {
                        noticeLink,
                        noticeId: notice_data.notice_id,
                      },
                      is_admin: false,
                      created_by: decoded?.userId,
                    };
                    // console.log(
                    //   'createActivityLogInput',
                    //   createActivityLogInput,
                    // );
                    await this.activityLogService.insertActivityLog(
                      createActivityLogInput,
                    );
                  } else if (
                    createFileUploadInput?.attachment_type === 'Admin_holiday'
                  ) {
                    const saveExcel =
                      await this.ptAdminAccessService.addHolidayFromExcel({
                        filePath: response?.file_path,
                      });

                    if (saveExcel?.status) {
                      return resolve(
                        framedResponse(
                          'SUCCESS',
                          `Imported holiday details successfully`,
                          response,
                        ),
                      );
                    } else if (saveExcel?.inValidRecord?.length > 0) {
                      return resolve(
                        framedResponse('WARNING', `Invalid data in excel`, {
                          ...response,
                          holiday_record: saveExcel?.inValidRecord,
                          is_valid_record_available:
                            saveExcel?.is_valid_record_available,
                        }),
                      );
                    } else {
                      return resolve(
                        framedResponse(
                          'ERROR',
                          saveExcel?.message || `Invalid data in excel`,
                          response,
                        ),
                      );
                    }
                  }
                  return resolve(
                    framedResponse(
                      'SUCCESS',
                      `Response successfully sent back to the client`,
                      response,
                    ),
                  );
                } else {
                return resolve(
                  framedResponse('ERROR', `Could not save image`),
                );
              }
            } catch (uploadError) {
              this.logger.error(`Error during file upload: ${uploadError.message}`);
              return resolve(framedResponse('ERROR', `Could not save image: ${uploadError.message}`));
            }
          }
      } catch (error) {
        this.logger.error(
          `Errored while uploading the file with message: ${error.message}`,
        );
        const errMsg = await handleError(error).catch((error) => {
          // Handle any rejections or errors

          return error;
        });
        return resolve(framedResponse('ERROR', errMsg));
      }
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.BASIC_USER,
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Mutation(() => MultipleFilesUploadResponse, {
    name: 'multipleFilesUpload',
    description:
      'Uploads multiple files at once, applying validations and logging for each file individually.',
  })
  async multipleFilesUpload(
    @Context() context,
    @Args('uploadMultipleFilesInput', {
      description:
        'Payload containing multiple files and their corresponding details for upload',
    })
    uploadMultipleFilesInput: UploadMultipleFilesInput,
  ) {
    try {
      this.logger.log(
        `Request received for uploading multiple files with payload: ${JSON.stringify(uploadMultipleFilesInput)}`,
      );
      const uploadedFiles = [];
      const files = await uploadMultipleFilesInput.files;
      for (let i = 0; i < files.length; i++) {
        const file = await files[i];
        const uploadInput = await uploadMultipleFilesInput.detailsOfFiles[i];
        try {
          const uploadedFile = await this.fileUpload(
            context,
            file,
            uploadInput,
          );
          if (uploadedFile.status === 'SUCCESS' && uploadedFile.data) {
            uploadedFiles.push(uploadedFile.data);
          }
        } catch (error) {
          throw `Failed to upload file in the index ${i} with message: ${error.message}`;
        }
      }
      this.logger.log(`Files uploaded successfully.`);
      return framedResponse(
        'SUCCESS',
        'Files successfully uploaded.',
        uploadedFiles,
      );
    } catch (error) {
      this.logger.error(
        `Errored while uploading multiple files with message: ${error.message}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Mutation(() => MarketingImageUploadResponse, {
    name: 'uploadMarketingImage',
    description:
      'Uploads a marketing image to object storage and returns its full public URL for use in marketing emails. Admin only.',
  })
  async uploadMarketingImage(
    @Context() context,
    @Args({
      name: 'file',
      type: () => GraphQLUpload,
      description: 'The image file to upload.',
    })
    { createReadStream, filename, mimetype }: Upload,
  ): Promise<MarketingImageUploadResponse> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      if (!decoded?.isAdmin) {
        return { status: 'ERROR', message: 'Unauthorized to perform this action' };
      }

      const allowedImageTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
      ];
      if (!allowedImageTypes.includes(mimetype)) {
        return {
          status: 'ERROR',
          message:
            'Invalid file type. Please upload a JPG, PNG, GIF, WEBP or SVG image.',
        };
      }

      const chunks: Buffer[] = [];
      let fileSize = 0;
      await new Promise<void>((resolveStream, rejectStream) => {
        const stream = createReadStream();
        stream.on('data', (chunk) => {
          fileSize += chunk.length;
          chunks.push(chunk);
        });
        stream.on('end', () => resolveStream());
        stream.on('error', (err) => rejectStream(err));
      });

      const maxFileSize = 5 * 1024 * 1024;
      if (fileSize > maxFileSize) {
        return {
          status: 'ERROR',
          message: 'Image is too large. Maximum size is 5MB.',
        };
      }

      const fileBuffer = Buffer.concat(chunks);
      const ext = (path.extname(filename || '') || '').toLowerCase();
      const safeBase =
        path
          .basename(filename || 'image', path.extname(filename || ''))
          .replace(/[^a-zA-Z0-9-_]/g, '-')
          .toLowerCase()
          .slice(0, 60) || 'image';
      const uniqueName = `${Date.now()}-${safeBase}${ext}`;

      const uploadResult = await this.objectStorageService.uploadFile(
        fileBuffer,
        'Marketing_image',
        uniqueName,
        mimetype,
      );

      if (!uploadResult?.success) {
        return {
          status: 'ERROR',
          message: 'Could not save image. Please try again.',
        };
      }

      const url = this.objectStorageService.getPublicUrl(
        uploadResult.objectPath,
      );
      this.logger.log(`Marketing image uploaded: ${uploadResult.objectPath}`);
      return {
        status: 'SUCCESS',
        message: 'Image uploaded successfully.',
        url,
      };
    } catch (error) {
      this.logger.error(`Marketing image upload failed: ${error.message}`);
      return {
        status: 'ERROR',
        message: `Could not save image: ${error.message}`,
      };
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Query(() => MarketingImageListResponse, {
    name: 'listMarketingImages',
    description:
      'Lists all previously uploaded marketing images with their public URLs. Admin only.',
  })
  async listMarketingImages(
    @Context() context,
  ): Promise<MarketingImageListResponse> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      if (!decoded?.isAdmin) {
        return { status: 'ERROR', message: 'Unauthorized to perform this action' };
      }

      const keys = await this.objectStorageService.listFiles(
        'marketing_images/',
      );
      const items = (keys || [])
        .filter((k) => k && !k.endsWith('/'))
        .map((k) => ({
          name: k.replace(/^marketing_images\//, ''),
          url: this.objectStorageService.getPublicUrl(k),
        }))
        .sort((a, b) => b.name.localeCompare(a.name));

      return {
        status: 'SUCCESS',
        message: 'Marketing images fetched successfully.',
        data: items,
      };
    } catch (error) {
      this.logger.error(`List marketing images failed: ${error.message}`);
      return {
        status: 'ERROR',
        message: `Could not fetch images: ${error.message}`,
      };
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Mutation(() => StringResponse, {
    name: 'deleteMarketingImage',
    description:
      'Deletes a previously uploaded marketing image from object storage by its file name. Admin only.',
  })
  async deleteMarketingImage(
    @Context() context,
    @Args('name', {
      type: () => String,
      description: 'The file name of the marketing image to delete.',
    })
    name: string,
  ): Promise<StringResponse> {
    try {
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      if (!decoded?.isAdmin) {
        return { status: 'ERROR', message: 'Unauthorized to perform this action' };
      }

      const safeName = (name || '').trim();
      if (!safeName || safeName.includes('/') || safeName.includes('..')) {
        return { status: 'ERROR', message: 'Invalid image name.' };
      }

      const deleted = await this.objectStorageService.deleteFile(
        `marketing_images/${safeName}`,
      );

      if (!deleted) {
        return {
          status: 'ERROR',
          message: 'Could not delete image. Please try again.',
        };
      }

      this.logger.log(`Marketing image deleted: marketing_images/${safeName}`);
      return { status: 'SUCCESS', message: 'Image deleted successfully.' };
    } catch (error) {
      this.logger.error(`Delete marketing image failed: ${error.message}`);
      return {
        status: 'ERROR',
        message: `Could not delete image: ${error.message}`,
      };
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.BASIC_USER,
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Query(() => StringResponse, {
    name: 'getFile',
    description:
      'Retrieves a file by attachment type and optionally company ID, returning it as a base64-encoded string.',
  })
  async getFile(
    @Context() context,
    @Args('attachmentType', { description: 'Type of the attachment to fetch' })
    attachmentType: string,
    @Args('companyId', {
      description: 'Optional: Company ID associated with the file',
      nullable: true,
    })
    companyId?: number,
  ): Promise<any> {
    const decoded = await this.jwtInternalService.decodeJwtToken(context);
    try {
      this.logger.log(
        `Request received while getting the files with input: attachmentType:: ${attachmentType}, companyId:: ${companyId}`,
      );
      const fileDetails = await this.fileUploadService.getFileDetails(
        attachmentType,
        decoded?.userId,
        companyId,
        decoded?.isAdmin,
      );
      this.logger.log(
        `File details fetched with data: ${JSON.stringify(fileDetails)}`,
      );
      if (fileDetails && fileDetails.file_path) {
        try {
          const fileBuffer = await this.objectStorageService.downloadFile(fileDetails.file_path);
          if (fileBuffer) {
            const image = fileBuffer.toString('base64');
            const response = `data:${fileDetails.file_type};base64,${image}`;
            return framedResponse('SUCCESS', response);
          }
        } catch (fileError) {
          this.logger.error(`Failed to read file from storage: ${fileError.message}`);
        }
      }
      return framedResponse('ERROR', `Image not found`);
    } catch (error) {
      this.logger.error(
        `Errored while getting the file details with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.BASIC_USER,
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Mutation(() => StringResponse, {
    name: 'deleteFile',
    description:
      'Deletes a file based on its attachment type and optional company ID, with proper logging for audit purposes.',
  })
  async deleteFile(
    @Context() context,
    @Args('attachmentType', { description: 'Type of the attachment to delete' })
    attachmentType: string,
    @Args('companyId', {
      description: 'Optional: Company ID associated with the file',
      nullable: true,
    })
    companyId?: number,
  ): Promise<any> {
    const decoded = await this.jwtInternalService.decodeJwtToken(context);
    try {
      this.logger.log(
        `Request received for deleting the file with data: attachmentType: ${attachmentType}, companyId:: ${companyId}`,
      );
      const fileDetails = await this.fileUploadService.getFileDetails(
        attachmentType,
        decoded?.userId,
        companyId,
        decoded?.isAdmin,
      );
      this.logger.log(`fileDetails: ${JSON.stringify(fileDetails)}`);
      if (fileDetails && fileDetails.file_path) {
        try {
          await this.objectStorageService.deleteFile(fileDetails.file_path);
          this.logger.log('file was deleted from Object Storage');
        } catch (storageErr) {
          this.logger.error(`Failed to delete file from Object Storage: ${storageErr.message}`);
        }
        const deleteFileResponse = await this.fileUploadService.deleteFile(
          decoded,
          fileDetails.attachment_id,
          companyId,
        );
        this.logger.log(
          `Response received after deleting the file with data: ${JSON.stringify(deleteFileResponse)}`,
        );
        if (attachmentType === 'User_profile') {
          const createActivityLogInput: CreateActivityLogInput = {
            event_template_id: 8,
            admin_id:
              decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                ? decoded?.admin_id
                : null,
            to_user:
              decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                ? decoded?.userId
                : null,
            from_user:
              decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                ? null
                : decoded?.userId,
            is_admin: false,
            company_id: decoded?.userId
              ? await this.activityLogService.getSystemAddedCompanyId(
                  decoded?.userId,
                )
              : null,
            created_by: decoded?.userId,
          };
          await this.activityLogService.insertActivityLog(
            createActivityLogInput,
          );
        } else if (attachmentType === 'Admin_profile') {
          const createActivityLogInput: CreateActivityLogInput = {
            event_template_id: 8,
            admin_id: decoded?.userId,
            is_admin: decoded?.isAdmin,
            created_by: decoded?.userId,
          };
          await this.activityLogService.insertActivityLog(
            createActivityLogInput,
          );
        } else if (attachmentType === 'Company_logo') {
          if (decoded?.isAdmin) {
            const companyLink =
              `${process.env.LOG_BASE_URL}` +
              `${linkExtensions[2]}` +
              `${companyId}` +
              `?from=log`;
            this.logger.log(`companyLink: ${companyLink}`);
            const companyName =
              await this.fileUploadService.getCompanyName(companyId);

            const createActivityLogInput: CreateActivityLogInput = {
              event_template_id: 186,
              admin_id: decoded?.userId,
              is_admin: decoded?.isAdmin,
              dynamic_values: {
                companyLink: companyLink,
                companyName: companyName,
              },
              company_id: companyId,
              created_by: decoded?.userId,
            };
            await this.activityLogService.insertActivityLog(
              createActivityLogInput,
            );
          } else {
            const createActivityLogInput: CreateActivityLogInput = {
              event_template_id: 15,
              admin_id:
                decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                  ? decoded?.admin_id
                  : null,
              to_user:
                decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                  ? decoded?.userId
                  : null,
              from_user:
                decoded?.logged_in_by && decoded?.logged_in_by == 'ADMIN'
                  ? null
                  : decoded?.userId,
              is_admin: decoded?.isAdmin,
              company_id: companyId,
              created_by: decoded?.userId,
            };
            await this.activityLogService.insertActivityLog(
              createActivityLogInput,
            );
          }
        }
        return framedResponse('SUCCESS', `File deleted Successfully`);
      }
      return framedResponse('ERROR', `Image not found`);
    } catch (error) {
      this.logger.error(
        `Errored after deleting the file with message: ${error.message}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.BASIC_USER,
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Mutation(() => StringResponse, {
    name: 'adminDeleteBlogResAttachment',
    description:
      'Allows admin to delete blog or resource attachments, with appropriate activity logging.',
  })
  async adminDeleteBlogResAttachment(
    @Context() context,
    @Args('attachmentType', {
      description:
        'Attachment type to delete (Blog_banner or Resource_attachments)',
    })
    attachmentType: string,
    @Args('blogResId', {
      description:
        'Optional: Blog or Resource ID associated with the attachment',
      nullable: true,
    })
    blogResId?: string,
  ): Promise<any> {
    const decoded = await this.jwtInternalService.decodeJwtToken(context);
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: attachmentType:: ${attachmentType}, blogResId:: ${blogResId}`,
      );
      const fileDetails = await this.fileUploadService.getBlogFileDetails(
        attachmentType,
        blogResId,
      );

      if (!fileDetails || !fileDetails.attachment_id) {
        this.logger.log('No file attachment found - clearing banner reference');
        if (blogResId) {
          await this.fileUploadService.clearBlogAttachmentReference(
            blogResId,
            attachmentType,
          );
        }
        return framedResponse('SUCCESS', `Image removed successfully`);
      }

      try {
        await this.objectStorageService.deleteFile(fileDetails.file_path);
        this.logger.log('file was deleted from Object Storage');
      } catch (storageErr) {
        this.logger.error(`Failed to delete file from Object Storage: ${storageErr.message}`);
      }
      const deleteFileResponse = await this.fileUploadService.deleteBlogFile(
        decoded,
        attachmentType,
        fileDetails.attachment_id,
        blogResId,
      );
      this.logger.log(
        `Response recieved while deleting: ${JSON.stringify(deleteFileResponse.affected)}`,
      );

      const blogRes =
        await this.ptContentsService.getBlogResourceById(blogResId);

      const blogLink =
        `${process.env.LOG_BASE_URL}` +
        `${linkExtensions[24]}` +
        blogResId +
        `?from=log`;
      this.logger.log(`blogLink: ${blogLink}`);

      const resourceLink =
        `${process.env.LOG_BASE_URL}` +
        `${linkExtensions[25]}` +
        blogResId +
        `?from=log`;
      this.logger.log(`resourceLink: ${resourceLink}`);

      let attachType;

      if (attachmentType === 'Resource_attachments') {
        attachType = 'attachment';
      } else if (attachmentType === 'Blog_banner') {
        attachType = 'banner';
      }

      let eventTemplateId;
      if (blogRes.content_type === 'Blog') {
        eventTemplateId = 189;
      } else if (blogRes.content_type === 'Resource') {
        eventTemplateId = 188;
      }

      const createActivityLogInput: CreateActivityLogInput = {
        event_template_id: eventTemplateId,
        admin_id: decoded?.userId,
        dynamic_values: {
          attachType: attachType,
          blogName: blogRes.title,
          blogLink,
          resourceLink,
        },
        is_admin: true,
        created_by: decoded?.userId,
      };
      this.logger.log(`ActivityLog_Input: ${JSON.stringify(createActivityLogInput)}`);
      await this.activityLogService.insertActivityLog(createActivityLogInput);
      return framedResponse('SUCCESS', `File deleted Successfully`);
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.BASIC_USER,
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Query(() => GetFileResponse, {
    name: 'getFileById',
    description:
      'Fetches a file using its unique ID and returns it with base64-encoded content.',
  })
  async getFileById(
    @Args('id', { description: 'Unique ID of the file to fetch' }) id: string,
  ): Promise<any> {
    try {
      this.logger.log(`Request received for getting the file with id: ${id}`);
      const fileDetails = await this.fileUploadService.getFileDetailsById(id);
      this.logger.log(
        `File details fetched with data: ${JSON.stringify(fileDetails)}`,
      );
      if (fileDetails && fileDetails.file_path) {
        try {
          const fileBuffer = await this.objectStorageService.downloadFile(fileDetails.file_path);
          if (fileBuffer) {
            const image = fileBuffer.toString('base64');
            const file = { file: `data:${fileDetails.file_type};base64,${image}` };
            const baseUrl = (process.env.UPLOAD_BASE_URL || '').replace(/\/+$/, '');
            const normalizedPath = fileDetails.file_path.replace(/\\/g, '/').replace(/^\/+/, '');
            fileDetails.file_path = baseUrl + '/' + normalizedPath;
            const response = { ...fileDetails, ...file };
            return framedResponse(
              'SUCCESS',
              `Response successfully sent back to the client`,
              response,
            );
          }
        } catch (fileError) {
          this.logger.error(`Failed to read file from storage: ${fileError.message}`);
        }
      }
      return framedResponse('ERROR', `Image not found`);
    } catch (error) {
      this.logger.error(
        `Errored while getting the file with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.BASIC_USER,
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Query(() => GetFileDetailsResponse, {
    name: 'getTrustTrainingRecordsByCompany',
    description:
      'Retrieves all trust training records for a given company, returning files in base64 format.',
  })
  async getTrustTrainingRecordsByCompany(
    @Context() context,
    @Args('companyId', {
      description: 'ID of the company to fetch trust training records for',
    })
    companyId: number,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request recieved while entering the client with arguments: companyId:: ${companyId}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const fileDetails =
        await this.fileUploadService.getTrustTrainingRecordsByCompany(
          companyId,
        );
      this.logger.log(
        `Response recieved while getting the trust training record `,
      );
      if (fileDetails && fileDetails.length > 0) {
        for (const element of fileDetails) {
          if (element.file_path) {
            try {
              const fileBuffer = await this.objectStorageService.downloadFile(element.file_path);
              if (fileBuffer) {
                const image = fileBuffer.toString('base64');
                element['file'] = `data:${element.file_type};base64,${image}`;
              }
            } catch (fileError) {
              this.logger.error(`Failed to read file from storage: ${fileError.message}`);
            }
            const baseUrl = (process.env.UPLOAD_BASE_URL || '').replace(/\/+$/, '');
            const normalizedPath = element.file_path.replace(/\\/g, '/').replace(/^\/+/, '');
            element.file_path = baseUrl + '/' + normalizedPath;
          }
        }
        return framedResponse(
          'SUCCESS',
          `Response successfully sent back to the client`,
          fileDetails,
        );
      }
      return framedResponse('ERROR', `Image not found`);
    } catch (error) {
      this.logger.error(
        `Errored inside the client with message: ${error.message}`,
      );
      return framedResponse('ERROR', error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.BASIC_USER,
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Query(() => GetFileDetailsResponse, {
    name: 'getFileDetailsByIdAndType',
    description:
      'Fetches file details using a combination of ID and attachment type, including the file content in base64.',
  })
  async getFileDetailsByIdAndType(
    @Context() context,
    @Args('id', { description: 'Unique ID of the file to fetch' }) id: string,
    @Args('attachmentType', { description: 'Type of attachment to fetch' })
    attachmentType: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for getting file details by id: ${id} and attachment type: ${attachmentType}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const fileDetails =
        await this.fileUploadService.getFileDetailsByIdAndType(
          id,
          attachmentType,
        );
      this.logger.log(
        `Response received after getting the file details: ${JSON.stringify(fileDetails.file_name)}`,
      );
      if (fileDetails && fileDetails.file_path) {
        try {
          const fileBuffer = await this.objectStorageService.downloadFile(fileDetails.file_path);
          if (fileBuffer) {
            const image = fileBuffer.toString('base64');
            const baseUrl = (process.env.UPLOAD_BASE_URL || '').replace(/\/+$/, '');
            const normalizedPath = fileDetails.file_path.replace(/\\/g, '/').replace(/^\/+/, '');
            fileDetails.file_path = baseUrl + '/' + normalizedPath;
            fileDetails['file'] = `data:${fileDetails.file_type};base64,${image}`;
            return framedResponse('SUCCESS', `File not imported`, fileDetails);
          }
        } catch (fileError) {
          this.logger.error(`Failed to read file from storage: ${fileError.message}`);
        }
      }
      return framedResponse('ERROR', `Image not found`);
    } catch (error) {
      this.logger.error(
        `Errored whle getting trust training records with message: ${error.message}`,
      );
      return framedResponse(
        'ERROR',
        `Errored while getting file details with message: ${error.message}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.BASIC_USER,
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Mutation(() => StringResponse, {
    name: 'deleteTrustTrainingRecordsById',
    description:
      'Deletes trust training record files by their IDs for a specific company.',
  })
  async deleteTrustTrainingRecordsById(
    @Context() context,
    @Args({
      name: 'idArray',
      type: () => [String],
      description: 'Array of file IDs to delete',
    })
    idArray: string[],
    @Args('companyId', {
      description: 'ID of the company associated with the files',
    })
    companyId: number,
  ): Promise<any> {
    try {
      this.logger.log(
        `Request received for deleting trust training records by id: ${idArray}, companyId: ${companyId}`,
      );
      const decoded = await this.jwtInternalService.decodeJwtToken(context);
      const fileDetails =
        await this.fileUploadService.getTrustTrainingRecordsByIdArray(idArray);
      if (fileDetails && fileDetails.length > 0) {
        for (const element of fileDetails) {
          if (element.file_path) {
            try {
              await this.objectStorageService.deleteFile(element.file_path);
              this.logger.log('file was deleted from Object Storage');
            } catch (storageErr) {
              this.logger.error(`Failed to delete file from Object Storage: ${storageErr.message}`);
            }
          }
        }
        const deleteFileResponse =
          await this.fileUploadService.deleteTrustTrainingRecordsById(
            decoded,
            idArray,
            companyId,
          );
        this.logger.log(
          `Response received after file deletion with data: ${JSON.stringify(deleteFileResponse.affected)}`,
        );
        if (deleteFileResponse) {
          return framedResponse('SUCCESS', `File(s) deleted Successfully`);
        }
        return framedResponse(
          'ERROR',
          `Errored while deleting trust training records with message: ${JSON.stringify(deleteFileResponse.affected)}`,
        );
      }
      return framedResponse('ERROR', `Image not found`);
    } catch (error) {
      this.logger.error(
        `Errored while deleting trust training records with message: ${error.message}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.BASIC_USER,
    Role.STANDARD_USER,
    Role.ADMIN,
    Role.PRIMARY_ADMIN,
    Role.PORTAL_ADMIN,
    Role.RESTRICTED_PORTAL_ADMIN,
  )
  @Mutation(() => StringResponse, {
    name: 'deleteFileByIdAndType',
    description:
      'Deletes a file by its unique ID, attachment ID, and type, with proper audit logging.',
  })
  async deleteFileByIdAndType(
    @Context() context,
    @Args('id', { description: 'ID associated with the entity/file record' })
    id: string,
    @Args('attachmentId', {
      description: 'Attachment ID of the file to delete',
    })
    attachmentId: string,
    @Args('attachmentType', { description: 'Type of attachment to delete' })
    attachmentType: string,
  ): Promise<any> {
    const decoded = await this.jwtInternalService.decodeJwtToken(context);
    try {
      this.logger.log(
        `Request received for deleting the file with data: id :: ${id}, attachmentType: ${attachmentType}, attachmentId:: ${attachmentId}`,
      );
      const fileDetails =
        await this.fileUploadService.getFileDetailsByIdAndType(
          attachmentId,
          attachmentType,
        );
      if (fileDetails && fileDetails.file_path) {
        if (attachmentType !== 'Notices_support_docs') {
          try {
            await this.objectStorageService.deleteFile(fileDetails.file_path);
            this.logger.log('file was deleted from Object Storage');
          } catch (storageErr) {
            this.logger.error(`Failed to delete file from Object Storage: ${storageErr.message}`);
          }
        }
        const deleteFileResponse =
          await this.fileUploadService.deleteFileByIdAndType(
            decoded,
            id,
            attachmentId,
            attachmentType,
          );
        this.logger.log(
          `Response received after deleting the file with data: ${JSON.stringify(deleteFileResponse.affected)}`,
        );
        return framedResponse('SUCCESS', 'File deleted Successfully');
      }
      return framedResponse('ERROR', `Image not found`);
    } catch (error) {
      this.logger.error(
        `Errored after deleting the file with message: ${error.message}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PORTAL_ADMIN, Role.RESTRICTED_PORTAL_ADMIN)
  @Mutation(() => StringResponse, {
    name: 'importHolidayDetail',
    description:
      'Imports holiday details from an Excel file or cancels the import, based on actionType.',
  })
  async importHolidayDetail(
    @Context() context,
    @Args('attachmentId', {
      description: 'Attachment ID of the Excel file to import',
    })
    attachmentId: string,
    @Args('actionType', {
      description: 'Action to perform: "save" to import, "cancel" to discard',
    })
    actionType: 'save' | 'cancel',
  ) {
    try {
      if (actionType === 'cancel' || actionType === 'save') {
        const decoded = await this.jwtInternalService.decodeJwtToken(context);
        const attachmentType = 'Admin_holiday';
        this.logger.log(
          `Request received for  attachmentType: ${attachmentType}, attachmentId:: ${attachmentId}`,
        );

        const fileDetails =
          await this.fileUploadService.getFileDetailsByIdAndType(
            attachmentId,
            attachmentType,
          );

        if (fileDetails && fileDetails?.file_path) {
          if (actionType === 'save') {
            const response =
              await this.ptAdminAccessService.addHolidayFromExcel({
                filePath: fileDetails?.file_path,
                actionType, // save
              });

            if (response) {
              return framedResponse(
                'SUCCESS',
                `Imported holiday details successfully`,
              );
            }
          }
          if (actionType === 'cancel') {
            try {
              await this.objectStorageService.deleteFile(fileDetails?.file_path);
              this.logger.log('file was deleted from Object Storage');
            } catch (storageErr) {
              this.logger.error(`Failed to delete file from Object Storage: ${storageErr.message}`);
            }
            const deleteFileResponse =
              await this.fileUploadService.deleteFileByIdAndType(
                decoded,
                '',
                attachmentId,
                attachmentType,
              );
            return framedResponse(
              'SUCCESS',
              `Response successfully sent back to the client`,
            );
          }
        }

        return framedResponse('ERROR', `Excel not found`);
      }
      return framedResponse('ERROR', `Invalid action type`);
    } catch (error) {
      this.logger.error(
        `Errored after import holiday with message: ${error.message}`,
      );
      const errMsg = await handleError(error).catch((error) => {
        // Handle any rejections or errors

        return error;
      });
      return framedResponse('ERROR', errMsg);
    }
  }
}
