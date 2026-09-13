// Presta Ya — robust employee creation bridge
(() => {
  const API = 'https://qchzgjhbhnkxkmvebkgw.supabase.co/functions/v1/admin-create-user';
  let busy = false;

  const ensureUsername = (form) => {
    if (!form || form.querySelector('[name="username"]')) return;
    const email = form.querySelector('[name="email"]');
    const input = document.createElement('input');
    input.name = 'username';
    input.placeholder = 'Nombre de usuario';
    input.required = true;
    input.autocomplete = 'username';
    (email?.parentElement || form).insertAdjacentElement('afterend', input);
  };

  async function submitEmployee(form) {
    if (busy) return;
    busy = true;
    ensureUsername(form);
    const button = form.querySelector('button[type="submit"]') || [...form.querySelectorAll('button')].find(b => /crear usuario|crear empleado/i.test(b.textContent));
    const msg = form.querySelector('#employee-msg') || document.getElementById('employee-msg');
    const data = Object.fromEntries(new FormData(form).entries());
    data.full_name = String(data.full_name || '').trim();
    data.username = String(data.username || '').trim().toLowerCase();
    data.email = String(data.email || '').trim().toLowerCase();
    data.phone = String(data.phone || '').trim();
    if (!['collector','supervisor','customer'].includes(data.role)) data.role = 'collector';

    const setMsg = (text, error=false) => {
      if (!msg) return;
      msg.className = error ? 'admin-msg admin-danger' : 'admin-msg';
      msg.textContent = text;
    };

    try {
      if (!data.full_name || !data.username || !data.email || !data.password || data.password.length < 8) {
        setMsg('Completa nombre, usuario, correo y una contraseña de al menos 8 caracteres.', true);
        return;
      }
      const sb = window.prestayaSupabase;
      if (!sb) throw new Error('La conexión con Presta Ya todavía no está lista.');
      const { data: sessionData, error: sessionError } = await sb.auth.getSession();
      if (sessionError || !sessionData.session?.access_token) throw new Error('La sesión del administrador no es válida. Inicia sesión nuevamente.');
      if (button) { button.disabled = true; button.dataset.originalText = button.textContent; button.textContent = 'Creando empleado…'; }
      setMsg('Creando empleado…');
      const res = await fetch(API, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionData.session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error || `No se pudo crear el empleado (${res.status}).`);
      setMsg(`Empleado creado correctamente: ${out.email || data.email}.`);
      form.reset();
      if (typeof window.render === 'function' && window.state?.section === 'employees') setTimeout(() => window.render(), 150);
    } catch (error) {
      setMsg(error?.message || 'No se pudo crear el empleado.', true);
    } finally {
      busy = false;
      if (button) { button.disabled = false; button.textContent = button.dataset.originalText || 'Crear empleado'; }
    }
  }

  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== 'employee-form') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    submitEmployee(form);
  }, true);

  document.addEventListener('click', (event) => {
    const button = event.target.closest?.('#employee-form button[type="submit"], #employee-form button');
    if (!button) return;
    const form = button.closest('#employee-form');
    if (!form) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    submitEmployee(form);
  }, true);

  setInterval(() => {
    const form = document.getElementById('employee-form');
    if (form) ensureUsername(form);
  }, 1000);
})();
