// Presta Ya — clean authentication interface
(() => {
  const timer = setInterval(() => {
    const sb = window.prestayaSupabase;
    const card = document.querySelector('.authcard');
    if (!sb || !card) return;
    clearInterval(timer);

    card.innerHTML = `
      <div class="logo"><span class="mark">P</span>Presta Ya</div>
      <h2 id="auth-title">Inicia sesión</h2>
      <p id="auth-subtitle">Accede a tu cuenta para continuar.</p>
      <div class="auth-tabs">
        <button type="button" class="auth-tab active" id="login-tab">Iniciar sesión</button>
        <button type="button" class="auth-tab" id="register-tab">Registrarse</button>
      </div>
      <form id="login-form">
        <div class="field"><label>Correo electrónico</label><input id="auth-email" type="email" placeholder="tu@email.com" autocomplete="email" required></div>
        <div class="field"><label>Contraseña</label><input id="auth-password" type="password" placeholder="••••••••" autocomplete="current-password" required></div>
        <button class="btn primary full" type="submit">Iniciar sesión</button>
      </form>
      <form id="register-form" style="display:none">
        <div class="field"><label>Nombre completo</label><input id="reg-name" placeholder="Nombre y apellido" required></div>
        <div class="field"><label>Nombre de usuario</label><input id="reg-username" placeholder="Ej. juanperez" minlength="3" required></div>
        <div class="field"><label>Correo electrónico</label><input id="reg-email" type="email" placeholder="tu@email.com" autocomplete="email" required></div>
        <div class="field"><label>Contraseña</label><input id="reg-password" type="password" placeholder="Mínimo 8 caracteres" minlength="8" autocomplete="new-password" required></div>
        <div class="field"><label>Número de cliente</label><input id="reg-customer" placeholder="Ej. 10025" inputmode="numeric" required></div>
        <div class="field"><label>Número de préstamo</label><input id="reg-loan" placeholder="Ej. P-2025-00123" required></div>
        <button class="btn primary full" type="submit">Crear mi cuenta</button>
        <div class="auth-note">Tus datos de cliente y préstamo se vincularán a tu cuenta. No necesitas volver a registrarlos.</div>
      </form>
      <div class="social-title">O continúa con</div>
      <div class="social-grid"><button type="button" class="btn social" id="google-auth">Google</button><button type="button" class="btn social" id="facebook-auth">Facebook</button></div>
      <div id="auth-message" class="auth-message"></div>
      <div id="bootstrap-slot"></div>
    `;

    const style = document.createElement('style');
    style.id = 'auth-ui-style';
    style.textContent = `
      .auth-tabs{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:18px 0 20px}
      .auth-tab{border:1px solid #d9e1eb;background:#fff;color:#68778c;border-radius:11px;padding:11px;font-weight:850}
      .auth-tab.active{border:2px solid #111d2f;background:#edf5ff;color:#075ddd;padding:10px}
      .auth-note{margin-top:10px;padding:10px;border:1px solid #d9e9ff;background:#f2f8ff;color:#55708e;border-radius:11px;font-size:11px;line-height:1.45}
      .social-title{text-align:center;color:#728096;font-size:11px;font-weight:800;margin:18px 0 9px}
      .social-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.social{background:#fff;border:1px solid #d9e1eb;color:#182235}
      .auth-message{display:none;margin-top:12px;padding:10px;border-radius:10px;font-size:11px;font-weight:800}.auth-message.show{display:block}
      .auth-message.error{background:#fff2f3;color:#a52d36;border:1px solid #ffd2d6}.auth-message.ok{background:#edf8f2;color:#14764e;border:1px solid #ccebdc}
    `;
    document.head.appendChild(style);

    const msg = (text, error=false) => { const m=document.getElementById('auth-message'); m.textContent=text; m.className='auth-message show '+(error?'error':'ok'); };
    const loginTab=document.getElementById('login-tab'), registerTab=document.getElementById('register-tab');
    const loginForm=document.getElementById('login-form'), registerForm=document.getElementById('register-form');
    loginTab.onclick=()=>{loginTab.classList.add('active');registerTab.classList.remove('active');loginForm.style.display='block';registerForm.style.display='none';document.getElementById('auth-title').textContent='Inicia sesión';document.getElementById('auth-subtitle').textContent='Accede a tu cuenta para continuar.'};
    registerTab.onclick=()=>{registerTab.classList.add('active');loginTab.classList.remove('active');loginForm.style.display='none';registerForm.style.display='block';document.getElementById('auth-title').textContent='Crea tu cuenta';document.getElementById('auth-subtitle').textContent='Vincula tu cuenta con tus datos de Presta Ya.'};

    loginForm.onsubmit=async e=>{e.preventDefault();const email=document.getElementById('auth-email').value.trim();const password=document.getElementById('auth-password').value;if(!email||!password)return;try{const {data,error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;location.reload()}catch(err){msg(err.message||'No fue posible iniciar sesión.',true)}};

    registerForm.onsubmit=async e=>{e.preventDefault();const full_name=document.getElementById('reg-name').value.trim();const username=document.getElementById('reg-username').value.trim().toLowerCase();const email=document.getElementById('reg-email').value.trim();const password=document.getElementById('reg-password').value;const customer_number=document.getElementById('reg-customer').value.trim();const loan_number=document.getElementById('reg-loan').value.trim();if(!full_name||!username||!email||password.length<8||!customer_number||!loan_number)return msg('Completa todos los campos. La contraseña debe tener al menos 8 caracteres.',true);try{const {data,error}=await sb.auth.signUp({email,password,options:{data:{full_name,username,customer_number,loan_number}}});if(error)throw error;msg(data.session?'Cuenta creada. Entrando…':'Cuenta creada. Revisa tu correo si se solicita confirmación.');if(data.session)setTimeout(()=>location.reload(),700)}catch(err){msg(err.message||'No fue posible crear la cuenta.',true)}};

    document.getElementById('google-auth').onclick=async()=>{const {error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname}});if(error)msg(error.message,true)};
    document.getElementById('facebook-auth').onclick=async()=>{const {error}=await sb.auth.signInWithOAuth({provider:'facebook',options:{redirectTo:location.origin+location.pathname}});if(error)msg(error.message,true)};

    // Preserve the first-admin bootstrap action, but place it cleanly below the authentication forms.
    if (typeof window.bootstrapAvailable === 'function') {
      try { if (await window.bootstrapAvailable()) { const b=document.createElement('button'); b.className='btn soft full'; b.style.marginTop='10px'; b.textContent='Crear primer administrador'; b.onclick=()=>window.createBootstrapAdmin?.(b); document.getElementById('bootstrap-slot').appendChild(b); } } catch(_) {}
    }
  },100);
})();
