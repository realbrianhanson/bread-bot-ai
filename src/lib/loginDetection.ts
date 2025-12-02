// Login detection utility for automatic pause on login pages

const LOGIN_URL_PATTERNS = [
  '/login',
  '/signin',
  '/sign-in',
  '/auth',
  '/authenticate',
  '/account/login',
  '/user/login',
  '/sso',
  'accounts.google.com',
  'login.microsoftonline.com',
  'login.live.com',
  'signin.aws.amazon.com',
  'accounts.github.com',
];

const LOGIN_KEYWORDS = [
  'login',
  'log in',
  'sign in',
  'signin',
  'credentials',
  'password',
  'authenticate',
  'authentication',
  'enter your password',
  'enter password',
  'username',
  'email address',
  'two-factor',
  '2fa',
  'verification code',
  'captcha',
  'security check',
];

export interface LoginDetectionResult {
  isLoginPage: boolean;
  loginUrl?: string;
  loginSite?: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Detects if a given URL and step description indicate a login page
 */
export function detectLoginPage(url?: string, description?: string): LoginDetectionResult {
  if (!url && !description) {
    return { isLoginPage: false, confidence: 'low' };
  }

  let isLoginPage = false;
  let confidence: 'high' | 'medium' | 'low' = 'low';
  const lowerUrl = url?.toLowerCase() || '';
  const lowerDescription = description?.toLowerCase() || '';

  // Check URL patterns
  const urlMatch = LOGIN_URL_PATTERNS.some(pattern => lowerUrl.includes(pattern));
  
  // Check description keywords
  const descriptionMatch = LOGIN_KEYWORDS.some(keyword => 
    lowerDescription.includes(keyword)
  );

  // Determine confidence level
  if (urlMatch && descriptionMatch) {
    isLoginPage = true;
    confidence = 'high';
  } else if (urlMatch) {
    isLoginPage = true;
    confidence = 'medium';
  } else if (descriptionMatch && (
    lowerDescription.includes('password') || 
    lowerDescription.includes('credentials') ||
    lowerDescription.includes('authenticate')
  )) {
    isLoginPage = true;
    confidence = 'medium';
  }

  // Extract site name from URL for display
  let loginSite: string | undefined;
  if (isLoginPage && url) {
    try {
      const urlObj = new URL(url);
      loginSite = urlObj.hostname.replace('www.', '');
    } catch {
      loginSite = url;
    }
  }

  return {
    isLoginPage,
    loginUrl: isLoginPage ? url : undefined,
    loginSite,
    confidence,
  };
}
