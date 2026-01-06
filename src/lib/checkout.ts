import { supabase } from "@/integrations/supabase/client";

interface CheckoutOptions {
  priceId: string;
  successUrl?: string;
  cancelUrl?: string;
  openInNewTab?: boolean;
}

interface CheckoutResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Check if running inside an iframe
 */
export const isInIframe = (): boolean => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

/**
 * Open URL handling iframe compatibility
 */
export const openExternalUrl = (url: string, newTab = true): void => {
  if (isInIframe()) {
    // Post message to parent for iframe contexts (like Lovable preview)
    window.parent.postMessage(
      { type: "OPEN_EXTERNAL_URL", data: { url } }, 
      "*"
    );
  } else if (newTab) {
    window.open(url, "_blank", "noopener,noreferrer");
  } else {
    window.location.href = url;
  }
};

/**
 * Create a checkout session and redirect to Stripe
 */
export const createCheckout = async ({
  priceId,
  successUrl,
  cancelUrl,
  openInNewTab = true
}: CheckoutOptions): Promise<CheckoutResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { priceId }
    });

    if (error) {
      console.error('Checkout error:', error);
      return { success: false, error: error.message };
    }

    if (data?.url) {
      openExternalUrl(data.url, openInNewTab);
      return { success: true, url: data.url };
    }

    return { success: false, error: 'No checkout URL returned' };
  } catch (err) {
    console.error('Checkout error:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
};

/**
 * Open customer billing portal
 */
export const openBillingPortal = async (returnUrl?: string): Promise<CheckoutResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('customer-portal', {
      body: { returnUrl: returnUrl || window.location.href }
    });

    if (error) {
      console.error('Portal error:', error);
      return { success: false, error: error.message };
    }

    if (data?.url) {
      openExternalUrl(data.url, true);
      return { success: true, url: data.url };
    }

    return { success: false, error: 'No portal URL returned' };
  } catch (err) {
    console.error('Portal error:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
};

/**
 * Check for successful checkout from URL params
 */
export const checkCheckoutSuccess = (): boolean => {
  const params = new URLSearchParams(window.location.search);
  return params.get('checkout') === 'success';
};

/**
 * Check for cancelled checkout from URL params
 */
export const checkCheckoutCancelled = (): boolean => {
  const params = new URLSearchParams(window.location.search);
  return params.get('checkout') === 'cancelled';
};

/**
 * Clear checkout params from URL
 */
export const clearCheckoutParams = (): void => {
  const url = new URL(window.location.href);
  url.searchParams.delete('checkout');
  window.history.replaceState({}, '', url.toString());
};
