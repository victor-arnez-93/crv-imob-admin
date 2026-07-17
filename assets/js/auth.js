/* ============================================================
   CRV IMOB — AUTH.JS
   Sessão, perfil e empresa atual
   ============================================================ */

(() => {
  'use strict';

  const client = window.CRV_SUPABASE;

  async function getSession() {
    if (!client) {
      return null;
    }

    const { data, error } = await client.auth.getSession();

    if (error) {
      console.error('Falha ao recuperar a sessão:', error.message);
      return null;
    }

    return data.session;
  }

  async function getProfile(user) {
    const metadata = user?.user_metadata || {};
    const fallback = {
      id: user?.id || '',
      fullName: metadata.full_name || metadata.name || user?.email?.split('@')[0] || 'Usuário',
      role: metadata.role || 'Administrador',
      email: user?.email || '',
      organizationId: metadata.organization_id || '',
      companyName: metadata.company_name || metadata.business_name || 'Sua empresa',
      businessType: metadata.business_type || 'Corretor ou imobiliária'
    };

    if (!client || !user) {
      return fallback;
    }

    const { data, error } = await client
      .from('profiles')
      .select(`
        id,
        full_name,
        role,
        organization_id,
        organizations (
          id,
          name,
          business_type
        )
      `)
      .eq('id', user.id)
      .maybeSingle();

    if (error || !data) {
      return fallback;
    }

    const organization = Array.isArray(data.organizations)
      ? data.organizations[0]
      : data.organizations;

    return {
      id: data.id,
      fullName: data.full_name || fallback.fullName,
      role: data.role || fallback.role,
      email: fallback.email,
      organizationId: data.organization_id || organization?.id || fallback.organizationId,
      companyName: organization?.name || fallback.companyName,
      businessType: organization?.business_type || fallback.businessType
    };
  }

  async function requireSession() {
    const session = await getSession();

    if (!session) {
      window.location.replace('login.html');
      return null;
    }

    const profile = await getProfile(session.user);

    return {
      session,
      user: session.user,
      profile
    };
  }

  async function signOut() {
    if (client) {
      await client.auth.signOut();
    }

    window.location.replace('login.html');
  }

  window.CRV_AUTH = {
    getSession,
    getProfile,
    requireSession,
    signOut
  };
})();

