const FILE_FOLDERS = [
  'profile_photo', 'admin_profile_photo', 'company_logo', 'communication',
  'trust_training_records', 'blog_banner', 'resources', 'notice-templates',
  'notices', 'recieved-notices', 'notices_supporting_docs', 'contracts',
  'variations', 'bank_statements', 'retention_trust_certificates',
  'transaction_csv_file_attachments', 'optional_attachments', 'compulsory_attachments',
  'optional_supporting_statement_attachments', 'audit_reports', 'generated_aba_files',
  'Admin_holiday', 'misc'
];

export function getFileUrl(filePath: string | null | undefined): string {
  if (!filePath) return '';
  
  // Handle full URLs
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  
  // Strip any leading slashes to normalize, then add exactly one
  const normalizedPath = filePath.replace(/^\/+/, '');
  
  // Return with single leading slash
  return `/${normalizedPath}`;
}

/**
 * Build a cache-busted file URL for a file-attachment-like object.
 *
 * Why: generated PDFs (notices, etc.) live behind Cloudflare with the
 * original long-TTL cache headers. When a notice is regenerated the file on
 * R2 is overwritten but Cloudflare keeps serving the stale copy until the
 * cached entry expires. Regenerate also deletes the old fileAttachment row
 * and creates a fresh one with a NEW id (and updated_at), so we can use
 * those as a stable cache-bust token that automatically changes after every
 * regenerate — no Cloudflare API call required.
 */
export function getFileUrlWithVersion(
  file:
    | { file_path?: string | null; id?: number | string | null; updated_at?: string | Date | null; created_on?: string | Date | null }
    | null
    | undefined,
): string {
  if (!file?.file_path) return '';
  const base = getFileUrl(file.file_path);
  if (!base) return '';

  const versionRaw =
    file.updated_at ?? file.created_on ?? file.id ?? null;
  if (versionRaw === null || versionRaw === undefined) return base;

  const versionStr =
    versionRaw instanceof Date
      ? String(versionRaw.getTime())
      : String(versionRaw);
  const token = encodeURIComponent(versionStr);

  return base.includes('?') ? `${base}&v=${token}` : `${base}?v=${token}`;
}

export function getAbsoluteFileUrl(filePath: string | null | undefined): string {
  if (!filePath) return '';
  
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  
  const baseUrl = process.env.NEXT_PUBLIC_DEPLOYED_URL || '';
  const normalizedPath = getFileUrl(filePath);
  
  if (baseUrl && !normalizedPath.startsWith('http')) {
    return `${baseUrl.replace(/\/$/, '')}${normalizedPath}`;
  }
  
  return normalizedPath;
}
