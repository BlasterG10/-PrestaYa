// Presta Ya — initial administrator bootstrap + admin management UI
(() => {
  const waitForSupabase = setInterval(async () => {
    const sb = window.prestayaSupabase;
    if (!sb) return;
    clearInterval(waitForSupabase);

    const apiBase = 'https://qchzgjhbhnkxkmvebkgw.supabase.co/functions/v1/admin-create-user';
    const bootstrapApi = 'https://qchzgjhbhnkxkmvebkgw.supabase.co/functions/v1/bootstrap-admin';

    async function bootstrapAvailable() {
      const { data, error } = await sb.rpc('bootstrap_admin_available');
      return !error && data === true;
    }

    async function addBootstrapButton() {
      if (!(await bootstrapAvailable())) return;
      const card = document.querySelector('.authcard');
      if (!card || document.getElementById('bootstrap-admin')) return;
      const button = document.createElement('button');
      button.id = 'bootstrap-admin';
      button.className = 'btn soft full';
      button.style.marginTop = '9px';
      button.textContent = 'Crear primer administrador';
      button.onclick = async () => {
        const email = document.getElementById('email')?.value.trim();
        const password = document.querySelector('#auth input[type="password"]')?.value || '';
        if (!email || !password) return alert('Escribe primero el correo y una contraseña de al menos 8 caracteres.');
        const full_name = prompt('Nombre completo del administrador:');
        if (!full_name?.trim()) return;
        button.disabled = true;
        button.textContent = 'Creando administrador…';
        try {
          const res = await fetch(bootstrapApi, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email,password,full_name:full_name.trim()}) });
          const out = await res.json().catch(()=>({}));
          if (!res.ok) { alert(out.error || 'No fue posible crear el administrador.'); button.disabled=false; button.textContent='Crear primer administrador'; return; }
          alert('Administrador creado correctamente. Ahora inicia sesión con ese correo y contraseña.');
          location.reload();
        } catch (err) {
          alert(err?.message || 'Error de conexión con el servidor.');
          button.disabled=false;
          button.textContent='Crear primer administrador';
        }
      };
      card.appendChild(button);
    }

    function addAdminNav() {
      if (window.role !== 'admin') return;
      const nav = document.getElementById('nav');
      if (!nav || nav.querySelector('[data-admin-users]')) return;
      const b = document.createElement('button');
      b.dataset.adminUsers = '1';
      b.innerHTML = '<i>⚙</i> Administración';
      b.onclick = renderAdmin;
      nav.appendChild(b);
    }

    function addFormStyles() {
      if (document.getElementById('admin-ui-style')) return;
      const s = document.createElement('style'); s.id = 'admin-ui-style';
      s.textContent = '.admin-grid{display:grid;grid-template-columns:1fr 1fr;gap:15px}.admin-form{display:grid;gap:9px}.admin-form input,.admin-form select{width:100%;padding:11px;border:1px solid #d9e1eb;border-radius:10px}.admin-msg{padding:10px;border-radius:10px;background:#edf5ff;color:#155cbf;font-size:11px;font-weight:700}.admin-danger{background:#fff2f3;color:#a52d36}@media(max-width:800px){.admin-grid{grid-template-columns:1fr}}';
      document.head.appendChild(s);
    }

    async function renderAdmin() {
      if (window.role !== 'admin') return;
      addFormStyles();
      const title = document.getElementById('title');
      const content = document.getElementById('content');
      title.textContent = 'Administración';
      content.innerHTML = `
        <div class="admin-grid">
          <section class="card"><div class="head"><h2>Crear empleado / usuario</h2></div>
            <form id="employee-form" class="admin-form">
              <input name="full_name" placeholder="Nombre completo" required>
              <input name="email" type="email" placeholder="Correo electrónico" required>
              <input name="phone" placeholder="Teléfono">
              <select name="role"><option value="collector">Cobrador</option><option value="supervisor">Supervisor</option><option value="customer">Cliente con acceso</option></select>
              <input name="password" type="password" placeholder="Contraseña (mínimo 8 caracteres)" minlength="8" required>
              <button class="btn primary" type="submit">Crear usuario</button>
              <div id="employee-msg"></div>
            </form>
          </section>
          <section class="card"><div class="head"><h2>Registrar cliente</h2></div>
            <form id="customer-form" class="admin-form">
              <input name="full_name" placeholder="Nombre completo" required>
              <input name="identification_number" placeholder="Cédula / identificación">
              <input name="phone" placeholder="Teléfono">
              <input name="address" placeholder="Dirección">
              <input name="notes" placeholder="Notas">
              <button class="btn primary" type="submit">Crear cliente</button>
              <div id="customer-msg"></div>
            </form>
          </section>
        </div>
        <section class="card" style="margin-top:15px"><div class="head"><h2>Control de acceso</h2></div><p class="muted">El primer usuario creado mediante “Crear primer administrador” recibe el rol Administrador automáticamente. Después, solamente un Administrador puede crear empleados o usuarios desde este panel.</p></section>`;

      document.getElementById('employee-form').onsubmit = async e => {
        e.preventDefault();
        const msg = document.getElementById('employee-msg');
        const data = Object.fromEntries(new FormData(e.target).entries());
        msg.className = 'admin-msg'; msg.textContent = 'Creando…';
        const { data: sessionData } = await sb.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) { msg.className='admin-msg admin-danger'; msg.textContent='Sesión no válida.'; return; }
        const res = await fetch(apiBase, { method:'POST', headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'}, body:JSON.stringify(data) });
        const out = await res.json().catch(()=>({}));
        if (!res.ok) { msg.className='admin-msg admin-danger'; msg.textContent=out.error||'No fue posible crear el usuario.'; return; }
        msg.textContent = `Usuario creado correctamente. Rol: ${data.role}.`;
        e.target.reset();
      };

      document.getElementById('customer-form').onsubmit = async e => {
        e.preventDefault();
        const msg = document.getElementById('customer-msg');
        const body = Object.fromEntries(new FormData(e.target).entries());
        msg.className = 'admin-msg'; msg.textContent = 'Registrando…';
        const { data, error } = await sb.from('customers').insert(body).select('customer_number,full_name').single();
        if (error) { msg.className='admin-msg admin-danger'; msg.textContent=error.message; return; }
        msg.textContent = `Cliente creado. N.º de cliente: ${data.customer_number}.`;
        e.target.reset();
      };
    }

    const originalBuildNav = window.buildNav;
    if (typeof originalBuildNav === 'function') {
      window.buildNav = function(...args) { const r = originalBuildNav.apply(this,args); setTimeout(addAdminNav,0); return r; };
    }
    window.addEventListener('DOMContentLoaded', () => {
      addBootstrapButton();
      setTimeout(addAdminNav, 700);
    });
    setInterval(() => { if (!document.getElementById('bootstrap-admin')) addBootstrapButton(); if (window.role === 'admin') addAdminNav(); }, 2000);
  }, 100);
})();
