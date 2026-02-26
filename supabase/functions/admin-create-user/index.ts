import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify the caller is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the caller's JWT
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: authError } = await adminClient.auth.getUser(token);

    if (authError || !caller) {
      return new Response(JSON.stringify({ error: `Invalid token: ${authError?.message || 'no user returned'}` }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check caller is admin or platform_owner
    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', caller.id)
      .single();

    const callerRole = callerProfile?.role;
    if (callerRole !== 'admin' && callerRole !== 'super-admin' && callerRole !== 'platform_owner') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { email, password, name, title, role, modules, tenant_id } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine tenant_id for the new user:
    // - platform_owner: use the provided tenant_id (can create users in any tenant)
    // - admin/super-admin: forced to caller's own tenant_id (security)
    let resolvedTenantId: string | null = null;
    if (callerRole === 'platform_owner') {
      resolvedTenantId = tenant_id || null;
    } else {
      resolvedTenantId = callerProfile?.tenant_id || null;
    }

    // Create the auth user with service_role (bypasses email confirmation)
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: name || '', title: title || '', role: role || 'user', modules: modules || [] },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update the profile row with tenant_id (the trigger creates the profile, we patch it)
    if (resolvedTenantId) {
      await adminClient
        .from('profiles')
        .update({ tenant_id: resolvedTenantId })
        .eq('id', newUser.user.id);
    }

    return new Response(JSON.stringify({ user: { id: newUser.user.id, email: newUser.user.email } }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
