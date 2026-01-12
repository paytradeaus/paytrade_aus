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
  
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  
  if (filePath.startsWith('/')) {
    return filePath;
  }
  
  const isKnownFolder = FILE_FOLDERS.some(folder => filePath.startsWith(folder + '/'));
  if (isKnownFolder) {
    return `/${filePath}`;
  }
  
  if (filePath.startsWith('uploads/')) {
    return `/${filePath}`;
  }
  
  return `/${filePath}`;
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
