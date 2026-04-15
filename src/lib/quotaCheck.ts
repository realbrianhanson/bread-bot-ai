/**
 * Shared quota-checking helper for edge functions.
 * Usage in edge function:
 *   import { enforceQuota } from './quotaCheck.ts';
 *   const quotaError = await enforceQuota(supabase, userId, 'chat_message');
 *   if (quotaError) return quotaError;
 */

// This is a *reference* file — edge functions can't import from src/.
// The actual check logic is inlined in each edge function via a helper snippet.
// See the enforceQuota pattern below for copy-pasting.

/*
async function enforceQuota(supabase, userId, usageType, corsHeaders) {
  const { data, error } = await supabase.rpc('get_user_tier_and_usage', { p_user_id: userId });
  if (error || !data?.[0]) return null; // fail open
  const u = data[0];
  const mapping = {
    chat_message: { used: u.chat_messages_used, limit: u.chat_messages_limit },
    browser_task: { used: u.browser_tasks_used, limit: u.browser_tasks_limit },
    code_execution: { used: u.code_executions_used, limit: u.code_executions_limit },
  };
  const quota = mapping[usageType];
  if (!quota) return null;
  if (quota.used >= quota.limit) {
    return new Response(JSON.stringify({
      error: 'quota_exceeded',
      message: `You have used all ${quota.limit} ${usageType.replace('_', ' ')}s for this billing period. Please upgrade your plan.`,
      usage: { used: quota.used, limit: quota.limit },
    }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  return null;
}
*/

export {};
