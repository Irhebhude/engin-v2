/**
 * Supabase client replacement — NO-OP drop-in.
 *
 * All Supabase operations are replaced with Cloudflare D1 via Pages Functions.
 * This file exists only so that existing imports don't break.
 * All queries return empty results; isSupabaseConfigured is always false.
 */

export const isSupabaseConfigured = false;

// No-op chainable query builder
function createNoopQuery(): any {
  const handler: any = {
    then: (resolve: any) => resolve({ data: [], error: null, count: 0 }),
    select: () => createNoopQuery(),
    insert: () => createNoopQuery(),
    update: () => createNoopQuery(),
    delete: () => createNoopQuery(),
    upsert: () => createNoopQuery(),
    eq: () => createNoopQuery(),
    neq: () => createNoopQuery(),
    gt: () => createNoopQuery(),
    lt: () => createNoopQuery(),
    gte: () => createNoopQuery(),
    lte: () => createNoopQuery(),
    like: () => createNoopQuery(),
    ilike: () => createNoopQuery(),
    in: () => createNoopQuery(),
    is: () => createNoopQuery(),
    order: () => createNoopQuery(),
    limit: () => createNoopQuery(),
    range: () => createNoopQuery(),
    single: () => Promise.resolve({ data: null, error: null }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    head: () => createNoopQuery(),
    count: () => createNoopQuery(),
  };
  return handler;
}

export const supabase: any = {
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    signUp: () => Promise.resolve({ data: { user: null, session: null }, error: { message: "Auth not configured — use Cloudflare D1" } }),
    signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: { message: "Auth not configured — use Cloudflare D1" } }),
    signInWithOAuth: () => Promise.resolve({ data: { url: null }, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
  from: (_table: string) => createNoopQuery(),
  rpc: (_fn: string, _params?: any) => Promise.resolve({ data: null, error: null }),
};
