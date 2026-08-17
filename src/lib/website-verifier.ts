import dns from 'dns/promises';

export type WebsiteStatus = 'HAS_WEBSITE' | 'NO_WEBSITE' | 'UNKNOWN' | 'ERROR';

export interface VerificationResult {
  status: WebsiteStatus;
  finalUrl?: string;
  error?: string;
}

/**
 * Normalizes a URL.
 */
function normalizeUrl(url: string): string {
  let normalized = url.trim().toLowerCase();
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = `https://${normalized}`;
  }
  return normalized;
}

/**
 * Checks if a domain is a known social media or directory parked domain,
 * which shouldn't count as a true "business website".
 */
function isSocialOrDirectory(hostname: string): boolean {
  const blockedDomains = [
    'facebook.com', 'fb.me',
    'instagram.com', 'instagr.am',
    'twitter.com', 'x.com',
    'linkedin.com',
    'justdial.com', 'indiamart.com', 'sulekha.com', 'tradeindia.com',
    'google.com', 'g.page', 'business.site',
    'linktr.ee'
  ];
  return blockedDomains.some(d => hostname === d || hostname.endsWith(`.${d}`));
}

/**
 * Verifies if a website URL is active and resolves properly.
 */
export async function verifyWebsite(url: string): Promise<VerificationResult> {
  if (!url || url.trim() === '') {
    return { status: 'UNKNOWN', error: 'No URL provided' };
  }

  const targetUrl = normalizeUrl(url);

  try {
    const parsedUrl = new URL(targetUrl);
    
    // 1. Check if it's a social media or directory link
    if (isSocialOrDirectory(parsedUrl.hostname)) {
      return { 
        status: 'NO_WEBSITE', 
        error: `Social media or directory link (${parsedUrl.hostname}) is not a dedicated website.` 
      };
    }

    // 2. DNS check to fail fast for non-existent domains
    try {
      await dns.lookup(parsedUrl.hostname);
    } catch (dnsErr: any) {
      if (dnsErr.code === 'ENOTFOUND') {
        return { status: 'NO_WEBSITE', error: 'Domain does not exist (DNS ENOTFOUND).' };
      }
      return { status: 'ERROR', error: `DNS lookup failed: ${dnsErr.message}` };
    }

    // 3. HTTP fetch with timeout and redirect following
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout

    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: controller.signal as any,
        redirect: 'follow', // Follow redirects
      });

      clearTimeout(timeoutId);

      // Check where it finally redirected
      const finalParsed = new URL(response.url);
      if (isSocialOrDirectory(finalParsed.hostname)) {
         return { 
          status: 'NO_WEBSITE', 
          finalUrl: response.url,
          error: `Redirected to social media/directory (${finalParsed.hostname}).` 
        };
      }

      // We consider 200-399 range as success
      if (response.ok || (response.status >= 300 && response.status < 400)) {
        return { status: 'HAS_WEBSITE', finalUrl: response.url };
      } else if (response.status >= 400 && response.status < 500) {
        // 403 Forbidden or 401 Unauthorized might mean a firewall blocked our bot, NOT that there's no website
        if (response.status === 403 || response.status === 401 || response.status === 406) {
           return { status: 'HAS_WEBSITE', finalUrl: response.url, error: `Website exists but returned ${response.status} (likely WAF/Bot Protection).` };
        }
        // 404 Not Found usually means the domain exists but no site is hosted at the root, 
        // however it could just be a broken link, but since DNS resolved, we'll mark as NO_WEBSITE or ERROR
        return { status: 'ERROR', error: `HTTP ${response.status}: ${response.statusText}` };
      } else {
        // 500+ server errors
        return { status: 'ERROR', error: `Server error HTTP ${response.status}: ${response.statusText}` };
      }
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      
      if (fetchErr.name === 'AbortError') {
        return { status: 'ERROR', error: 'Connection timed out after 10 seconds.' };
      }

      // SSL errors, connection refused, etc.
      // E.g. ERR_CERT_COMMON_NAME_INVALID, ECONNREFUSED
      if (fetchErr.cause?.code === 'ECONNREFUSED' || fetchErr.message.includes('ECONNREFUSED')) {
        return { status: 'ERROR', error: 'Connection refused. Server may be down.' };
      }

      return { status: 'ERROR', error: `Network error: ${fetchErr.message}` };
    }

  } catch (err: any) {
    return { status: 'ERROR', error: `Invalid URL format: ${err.message}` };
  }
}
