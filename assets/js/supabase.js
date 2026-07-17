/* ============================================================
   CRV IMOB — SUPABASE.JS
   Configuração global do Supabase
   ============================================================ */

(() => {
  'use strict';

  const SUPABASE_URL = 'https://ppcpghnqavgaaktcjzqe.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwY3BnaG5xYXZnYWFrdGNqenFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MTYwNTksImV4cCI6MjA5NzE5MjA1OX0.Q3bEqxkg_lOSGYU7XzhfmO_hlixCNuWOSE_CNJt2TDA';

  const configured = Boolean(
    window.supabase &&
    SUPABASE_URL.startsWith('https://') &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_ANON_KEY.includes('COLE_AQUI')
  );

  window.CRV_IMOB_CONFIG = {
    supabaseUrl: SUPABASE_URL,
    configured
  };

  window.CRV_SUPABASE = configured
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;
})();

