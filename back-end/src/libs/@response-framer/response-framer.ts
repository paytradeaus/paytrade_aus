export interface IFramedResponse<T> {
  status: 'ERROR' | 'SUCCESS';
  message: string;
  data?: T;
  warnings?: any[];
}

export type ApiStatusType = 'SUCCESS' | 'ERROR' | 'WARNING' | 'XERO_REFRESH';

export function framedResponse<T>(
  status: ApiStatusType,
  message?: string,
  data?: T,
  warnings?: any[],
) {
  return {
    status,
    message,
    data,
    warnings,
  };
}
