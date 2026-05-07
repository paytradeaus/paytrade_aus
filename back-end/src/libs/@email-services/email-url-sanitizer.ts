import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

const sanitizerLogger = new PaytradeLogger('EMAIL_URL_SANITIZER');

export const DEV_HOST_BLOCKLIST: Array<string | RegExp> = [
  'paytradeaus.replit.app',
  /^[a-z0-9-]+\.replit\.app$/i,
  /^[a-z0-9-]+\.replit\.dev$/i,
  /^[a-z0-9-]+--[a-z0-9-]+\.replit\.dev$/i,
  'localhost',
  '127.0.0.1',
];

export function resolveEnvironment(): string {
  if (process.env.APP_ENVIRONMENT) {
    return process.env.APP_ENVIRONMENT;
  }
  if (process.env.REPL_ID) {
    return process.env.REPLIT_DEPLOYMENT ? 'staging' : 'development';
  }
  return 'production';
}

export function isProductionEnvironment(): boolean {
  return resolveEnvironment() === 'production';
}

export function getProductionHost(): {
  scheme: string;
  host: string;
} | null {
  const raw = process.env.LOG_BASE_URL;
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return { scheme: u.protocol.replace(':', ''), host: u.host };
  } catch {
    return null;
  }
}

export function isBlockedHost(host: string, productionHost: string): boolean {
  const hWithPort = host.toLowerCase();
  const hostnameOnly = hWithPort.split(':')[0];
  const prodHostnameOnly = productionHost.toLowerCase().split(':')[0];
  if (hostnameOnly === prodHostnameOnly) return false;
  for (const entry of DEV_HOST_BLOCKLIST) {
    if (typeof entry === 'string') {
      if (hostnameOnly === entry.toLowerCase()) return true;
    } else {
      if (entry.test(hostnameOnly)) return true;
    }
  }
  return false;
}

export interface UrlRewriteResult {
  rewritten: string;
  count: number;
  hostsRewritten: Set<string>;
}

const URL_REGEX = /\bhttps?:\/\/([^\s"'<>)]+)/gi;

export function rewriteHostsInHtml(
  html: string,
  productionScheme: string,
  productionHost: string,
): UrlRewriteResult {
  let count = 0;
  const hostsRewritten = new Set<string>();
  const rewritten = html.replace(URL_REGEX, (match, rest: string) => {
    const slashIdx = rest.search(/[\/?#]/);
    const host = slashIdx === -1 ? rest : rest.substring(0, slashIdx);
    const remainder = slashIdx === -1 ? '' : rest.substring(slashIdx);
    if (!isBlockedHost(host, productionHost)) return match;
    count++;
    hostsRewritten.add(host.toLowerCase());
    return `${productionScheme}://${productionHost}${remainder}`;
  });
  return { rewritten, count, hostsRewritten };
}

/**
 * Send-time sanitiser. In production, rewrites any blocked dev-host URL in the
 * HTML body to the production host derived from LOG_BASE_URL. In dev/staging,
 * returns the body unchanged. Never throws — on any error returns the original
 * body and logs the failure.
 */
export function sanitizeOutgoingEmailHtml(
  html: string,
  context?: { mailType?: string; template?: string },
): string {
  if (typeof html !== 'string' || html.length === 0) return html;
  try {
    if (!isProductionEnvironment()) return html;
    const prod = getProductionHost();
    if (!prod) return html;
    const result = rewriteHostsInHtml(html, prod.scheme, prod.host);
    if (result.count > 0) {
      const id =
        context?.mailType ||
        context?.template ||
        'unknown-template';
      const hosts = Array.from(result.hostsRewritten).join(', ');
      sanitizerLogger.warn(
        `Send-time URL sanitiser rewrote ${result.count} url(s) for mail_type=${id}; offending hosts=[${hosts}]. Template DB has drifted — re-run cleanup or fix template at source.`,
      );
    }
    return result.rewritten;
  } catch (err) {
    sanitizerLogger.error(
      `Send-time URL sanitiser failed: ${err?.message || err}; returning original body unchanged.`,
    );
    return html;
  }
}
