// Presta Ya authentication portal
(() => {
  const wait = setInterval(() => {
    const sb = window.prestayaSupabase;
    const auth = document.getElementById('auth');
    const card = document.querySelector('.authcard');
    if (!sb || !auth || !card) return;
    clearInterval(wait);
    if (document.getElementById('prestaya-auth-v2')) return;

    const style = document.createElement('style');
    style.id = 'prestaya-auth-v2';
    style.textContent = `.auth-switch{display:flex;gap:6px;margin:18px 0 14px}.auth-switch button{flex:1;border:1px solid #d9e1eb;background:#fff;padding:10px;border-radius:10px;font-weight:800;color:#728096}.auth-switch button.active{background:#edf5ff;color:#155cbf;border-color:#bcd7ff}.social{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.social button{border:1px solid #d9e1eb;background:#fff;padding:11px;border-radius:10px;font-weight:800}.auth-note{font-size:11px;color:#728096;line-height:1.5;margin-top:10px}.linkbox{background:#f7faff;border:1px solid #dce9fb;border-radius:12px;padding:12px;margin-top:12px}`;
    document.head.appendChild(style);

    const p = card.querySelector('.demo'); if (p) p.remove();
    const oldRole = document.getElementById('role'); if (oldRole) oldRole.closest('.field')?.remove();
    const oldLogin = card.querySelector('button[onclick="login()"]'); if (oldLogin) oldLogin.removeAttribute('onclick');

    const switcher = document.createElement('div');
    switcher.className = 'auth-switch';
    switcher.innerHTML = '<button class="active" data-mode="login">Iniciar sesión</button><button data-mode="register">Registrarse</button>';
    card.querySelector('p')?.insertAdjacentElement('afterend', switcher);

    const form = document.createElement('div');
    form.id = 'real-auth-form';
    form.innerHTML = `
      <div class="field login-only"><label>Usuario o correo electrónico</label><input id="login-identifier" placeholder="Tu usuario o correo"></div>
      <div class="field login-only"><label>Contraseña</label><input id="login-password" type="password" placeholder="••••••••"></div>
      <div class="field register-only hide"><label>Nombre completo</label><input id="reg-name" placeholder="Nombre completo"></div>
      <div class="field register-only hide"><label>Nombre de usuario</label><input id="reg-username" placeholder="Ej. blastertech"></div>
      <div class="field register-only hide"><label>Correo electrónico</label><input id="reg-email" type="email" placeholder="tu@email.com"></div>
      <div class="field register-only hide"><label>Contraseña</label><input id="reg-password" type="password" placeholder="Mínimo 8 caracteres"></div>
      <div class="field register-only hide"><label>N.º de cliente</label><input id="reg-customer-number" placeholder="Tu número de cliente"></div>
      <div class="field register-only hide"><label>N.º de préstamo</label><input id="reg-loan-number" placeholder="Tu número de préstamo"></div>
      <button id="real-auth-submit" class="btn primary full">Iniciar sesión</button>
      <div id="real-auth-msg" class="auth-note"></div>
      <div class="social"><button id="google-login">Google</button><button id="facebook-login">Facebook</button></div>
      <div class="auth-note">Los botones sociales requieren que Google/Facebook estén configurados en Supabase Authentication.</div>`;
    switcher.insertAdjacentElement('afterend', form);

    const setMode = mode => {
      switcher.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
      form.querySelectorAll('.register-only').forEach(x => x.classList.toggle('hide', mode !== 'register'));
      form.querySelectorAll('.login-only').forEach(x => x.classList.toggle('hide', mode !== 'login'));
      document.getElementById('real-auth-submit').textContent = mode === 'register' ? 'Crear cuenta' : 'Iniciar sesión';
      document.getElementById('real-auth-msg').textContent = '';
    };
    switcher.querySelectorAll('button').forEach(b => b.onclick = () => setMode(b.dataset.mode));

    async function loginReal() {
      const identifier = document.getElementById('login-identifier').value.trim();
      const password = document.getElementById('login-password').value;
      const msg = document.getElementById('real-auth-msg');
      if (!identifier || !password) { msg.textContent = 'Completa usuario/correo y contraseña.'; return; }
      msg.textContent = 'Entrando…';
      let email = identifier;
      if (!identifier.includes('@')) {
        const { data, error } = await sb.rpc('get_login_email_by_username', { p_username: identifier.toLowerCase() });
        if (error || !data) { msg.textContent = 'Usuario o contraseña incorrectos.'; return; }
        email = data;
      }
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) { msg.textContent = 'Usuario o contraseña incorrectos.'; return; }
      await finishSession(data.user);
    }

    async function registerReal() {
      const full_name = document.getElementById('reg-name').value.trim();
      const username = document.getElementById('reg-username').value.trim().toLowerCase();
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;
      const customer_number = document.getElementById('reg-customer-number').value.trim();
      const loan_number = document.getElementById('reg-loan-number').value.trim();
      const msg = document.getElementById('real-auth-msg');
      if (!full_name || !username || !email || password.length < 8) { msg.textContent = 'Completa nombre, usuario, correo y una contraseña de al menos 8 caracteres.'; return; }
      if (!customer_number || !loan_number) { msg.textContent = 'Para vincular tu cuenta debes introducir tu número de cliente y número de préstamo.'; return; }
      msg.textContent = 'Creando cuenta…';
      const { data: taken } = await sb.from('profiles').select('id').eq('username', username).maybeSingle();
      if (taken) { msg.textContent = 'Ese nombre de usuario ya está en uso.'; return; }
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name, username, customer_number, loan_number } } });
      if (error) { msg.textContent = error.message; return; }
      if (!data.user) { msg.textContent = 'No se pudo crear la cuenta.'; return; }
      const { data: linked, error: linkError } = await sb.rpc('claim_customer_account', { p_customer_number: customer_number, p_loan_number: loan_number, p_user_id: data.user.id, p_username: username });
      if (linkError || linked !== true) { msg.textContent = 'La cuenta se creó, pero no se pudo vincular con esos números. Verifica los datos con Presta Ya.'; return; }
      if (data.session) await finishSession(data.user); else msg.textContent = 'Cuenta creada. Revisa tu correo si se requiere confirmación y luego inicia sesión.';
    }

    async function finishSession(user) {
      const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).single();
      role = profile?.role || 'customer'; name = profile?.full_name || user.user_metadata?.full_name || user.email;
      document.getElementById('auth').classList.add('hide'); document.getElementById('app').classList.remove('hide'); document.getElementById('bottom').classList.remove('hide');
      document.getElementById('rolebox').innerHTML = '<b>' + (roles[role] || 'Cliente') + '</b>Sesión activa · acceso controlado';
      document.getElementById('user').innerHTML = '<span class="av">' + name.slice(0,2).toUpperCase() + '</span>' + name;
      buildNav(); render();
    }

    document.getElementById('real-auth-submit').onclick = () => switcher.querySelector('.active').dataset.mode === 'register' ? registerReal() : loginReal();
    document.getElementById('google-login').onclick = async () => { const { error } = await sb.auth.signInWithOAuth({ provider:'google', options:{redirectTo:location.href} }); if(error) document.getElementById('real-auth-msg').textContent=error.message; };
    document.getElementById('facebook-login').onclick = async () => { const { error } = await sb.auth.signInWithOAuth({ provider:'facebook', options:{redirectTo:location.href} }); if(error) document.getElementById('real-auth-msg').textContent=error.message; };

    sb.auth.getSession().then(async ({data}) => { if (data.session) await finishSession(data.session.user); });
    setMode('login');
  }, 100);
})();
