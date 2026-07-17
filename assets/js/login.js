/* ============================================================
   CRV IMOB — LOGIN.JS
   Autenticação real com Supabase
   ============================================================ */

(() => {
  'use strict';

  const client = window.CRV_SUPABASE;
  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('loginEmail');
  const passwordInput = document.getElementById('loginPassword');
  const submitButton = document.getElementById('loginSubmit');
  const feedback = document.getElementById('loginFeedback');

  function setFeedback(message, success = false) {
    feedback.textContent = message;
    feedback.classList.toggle('is-success', success);
  }

  function setLoading(loading) {
    submitButton.disabled = loading;
    submitButton.querySelector('span').textContent = loading ? 'Entrando...' : 'Entrar';
  }

  async function redirectAuthenticatedUser() {
    if (!client) {
      return;
    }

    const { data } = await client.auth.getSession();

    if (data.session) {
      window.location.replace('dashboard.html');
    }
  }

  document.getElementById('togglePassword')?.addEventListener('click', (event) => {
    const visible = passwordInput.type === 'text';

    passwordInput.type = visible ? 'password' : 'text';
    event.currentTarget.setAttribute('aria-label', visible ? 'Mostrar senha' : 'Ocultar senha');
    event.currentTarget.innerHTML = visible
      ? '<i class="fa-regular fa-eye"></i>'
      : '<i class="fa-regular fa-eye-slash"></i>';
  });

  document.getElementById('forgotPassword')?.addEventListener('click', async () => {
    const email = emailInput.value.trim();

    if (!client) {
      setFeedback('Configure a chave anon em assets/js/supabase.js antes de autenticar.');
      return;
    }

    if (!emailInput.checkValidity()) {
      emailInput.reportValidity();
      return;
    }

    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {
      setFeedback('Não foi possível enviar a recuperação agora.');
      return;
    }

    setFeedback('Enviamos as instruções de recuperação para seu e-mail.', true);
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (!client) {
      setFeedback('Configure a chave anon em assets/js/supabase.js antes de autenticar.');
      return;
    }

    setLoading(true);
    setFeedback('');

    const { error } = await client.auth.signInWithPassword({
      email: emailInput.value.trim(),
      password: passwordInput.value
    });

    if (error) {
      setLoading(false);
      setFeedback('E-mail ou senha inválidos. Verifique os dados e tente novamente.');
      return;
    }

    setFeedback('Acesso autorizado. Abrindo o painel...', true);
    window.location.replace('dashboard.html');
  });

  redirectAuthenticatedUser();
})();
