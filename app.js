import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://qchzgjhbhnkxkmvebkgw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_P25yjBAHPfz4zaFzhTZKag_jknlwGKI';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });

const state = { user: null, profile: null, customers: [], loans: [], payments: [], section: 'dashboard' };
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const money = (v) => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(Number(v || 0));
const roleName = (r) => ({ admin:'Administrador', supervisor:'Supervisor', collector:'Cobrador', customer:'Cliente' }[r] || r || 'Usuario');

function toast(message, error = false) {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = message; el.className = `toast on ${error ? 'err' : 'ok'}`;
  setTimeout(() => { el.className = 'toast'; }, 3500);
}

async function getProfile() {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', state.user.id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Tu cuenta todavía no tiene un perfil en PrestaYa.');
  return data;
}

async function loadData() {
  const [customers, loans, payments] = await Promise.all([
    supabase.from('customers').select('*').order('customer_number'),
    supabase.from('loans').select('*').order('created_at', { ascending:false }),
    supabase.from('payments').select('*').order('paid_at', { ascending:false })
  ]);
  if (customers.error) throw customers.error;
  if (loans.error) throw loans.error;
  if (payments.error) throw payments.error;
  state.customers = customers.data || [];
  state.loans = loans.data || [];
  state.payments = payments.data || [];
}

function loginScreen() {
  document.body.innerHTML = `
    <main class="login"><section class="login-card">
      <div class="brand big"><span>P</span><div><b>Presta Ya</b><small>Plataforma financiera</small></div></div>
      <h1>Bienvenido</h1><p>Inicia sesión para acceder a tu cuenta.</p>
      <form id="loginForm"><label>Correo o nombre de usuario<input id="identifier" required autocomplete="username" placeholder="tu@email.com o usuario"></label><label>Contraseña<input id="password" required type="password" autocomplete="current-password" placeholder="Contraseña"></label><button class="primary full">Iniciar sesión</button></form>
      <div class="or">o continúa con</div><div class="social"><button type="button" id="google">Google</button><button type="button" id="facebook">Facebook</button></div>
      <p class="login-note">Acceso protegido por Supabase Auth.</p>
      <div id="loginError" class="login-error"></div>
    </section></main>`;

  document.getElementById('loginForm').onsubmit = async (event) => {
    event.preventDefault();
    const identifier = document.getElementById('identifier').value.trim();
    const password = document.getElementById('password').value;
    let email = identifier;
    if (!identifier.includes('@')) {
      const { data, error } = await supabase.rpc('resolve_login_email', { p_username: identifier });
      if (error || !data) return toast('No encontramos ese nombre de usuario.', true);
      email = data;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return toast(error.message, true);
    await startApp();
  };
  for (const provider of ['google', 'facebook']) {
    document.getElementById(provider).onclick = async () => {
      const { error } = await supabase.auth.signInWithOAuth({ provider, options:{ redirectTo:window.location.href } });
      if (error) toast(error.message, true);
    };
  }
}

function navItems() {
  const r = state.profile.role;
  let items = [['dashboard','⌂','Dashboard'],['customers','♙','Clientes'],['loans','▣','Préstamos'],['payments','◉','Pagos']];
  if (['admin','supervisor'].includes(r)) items.push(['approvals','✓','Aprobaciones'],['analysis','◒','Análisis'],['pending','◷','Préstamos pendientes'],['applications','▤','Solicitudes']);
  if (r === 'admin') items.push(['employees','♙','Empleados']);
  if (['admin','supervisor'].includes(r)) items.push(['ids','#','Números de clientes y préstamos']);
  if (r === 'customer') items = [['dashboard','⌂','Mi cuenta'],['loans','▣','Mis préstamos'],['payments','◉','Mis pagos']];
  return items;
}

function shell() {
  document.body.innerHTML = `<div class="app"><aside class="side"><div class="brand"><span>P</span><div><b>Presta Ya</b><small>Finanzas inteligentes</small></div></div><nav id="nav"></nav><div class="side-bottom"><div class="secure">● Sistema protegido<br><small>Supabase + RLS</small></div><button id="logout" class="ghost">Cerrar sesión</button></div></aside><main><header><div><span class="eyebrow">Panel de control</span><h1 id="title">Dashboard</h1></div><div class="user"><span class="avatar">${esc((state.profile.full_name || 'U').slice(0,2).toUpperCase())}</span><div><b>${esc(state.profile.full_name || 'Usuario')}</b><small>${roleName(state.profile.role)}</small></div></div></header><section id="view"></section></main></div><div id="toast" class="toast"></div>`;
  document.getElementById('logout').onclick = async () => { await supabase.auth.signOut(); location.reload(); };
  renderNav();
}

function renderNav() {
  document.getElementById('nav').innerHTML = navItems().map(([id, icon, label]) => `<button class="nav ${state.section === id ? 'active':''}" data-section="${id}"><i>${icon}</i>${label}</button>`).join('');
  document.querySelectorAll('.nav').forEach((button) => button.onclick = () => { state.section = button.dataset.section; renderNav(); render(); });
}

function visibleData() {
  if (state.profile.role !== 'customer') return { customers:state.customers, loans:state.loans, payments:state.payments };
  const customers = state.customers.filter(c => c.profile_id === state.user.id);
  const ids = new Set(customers.map(c => c.id));
  const loans = state.loans.filter(l => ids.has(l.customer_id));
  const loanIds = new Set(loans.map(l => l.id));
  return { customers, loans, payments:state.payments.filter(p => loanIds.has(p.loan_id)) };
}

function render() {
  const data = visibleData();
  const titles = { dashboard:state.profile.role === 'customer' ? 'Mi cuenta':'Dashboard', customers:'Clientes', loans:state.profile.role === 'customer'?'Mis préstamos':'Préstamos', payments:'Pagos', approvals:'Aprobaciones', analysis:'Análisis', pending:'Préstamos pendientes', applications:'Solicitudes', employees:'Empleados', ids:'Números de clientes y préstamos' };
  document.getElementById('title').textContent = titles[state.section] || 'Dashboard';
  if (state.section === 'dashboard') return dashboard(data);
  if (state.section === 'customers') return customers(data.customers);
  if (state.section === 'loans') return loans(data.loans);
  if (state.section === 'payments') return payments(data.payments);
  if (state.section === 'employees') return employees();
  if (state.section === 'ids') return ids(data.customers, data.loans);
  if (state.section === 'analysis') return analysis(data);
  return workflow(state.section, data.loans);
}

function dashboard(data) {
  const active = data.loans.filter(l => ['approved','active'].includes(l.status)).length;
  const committed = data.loans.reduce((s,l) => s + Number(l.total_due || 0), 0);
  const paid = data.payments.reduce((s,p) => s + Number(p.amount || 0), 0);
  document.getElementById('view').innerHTML = `<div class="hero"><div><span>RESUMEN OPERATIVO</span><h2>${state.profile.role === 'customer' ? 'Tus finanzas, en un solo lugar':'Una vista clara de tu cartera'}</h2><p>Datos conectados directamente con PrestaYa.</p></div><button class="primary" id="newLoan">+ ${state.profile.role === 'customer' ? 'Solicitar préstamo':'Nuevo préstamo'}</button></div><div class="metrics"><div><small>Clientes</small><strong>${data.customers.length}</strong><em>Registrados</em></div><div><small>Préstamos activos</small><strong>${active}</strong><em>En curso</em></div><div><small>Total comprometido</small><strong>${money(committed)}</strong><em>Cartera</em></div><div><small>Total pagado</small><strong>${money(paid)}</strong><em>Acumulado</em></div></div><div class="grid2"><div class="card"><div class="cardhead"><div><span class="eyebrow">PRÉSTAMOS</span><h3>Actividad reciente</h3></div></div>${data.loans.slice(0,6).map(l => `<div class="row"><span class="badge">#${esc(l.loan_number)}</span><div class="grow"><b>${money(l.principal)}</b><small>${esc(l.loan_type)} · ${esc(l.status)}</small></div><strong>${money(l.total_due)}</strong></div>`).join('') || '<div class="empty">No hay préstamos todavía.</div>'}</div><div class="card"><div class="cardhead"><div><span class="eyebrow">PAGOS</span><h3>Últimos movimientos</h3></div></div>${data.payments.slice(0,6).map(p => `<div class="row"><span class="receipt">✓</span><div class="grow"><b>${esc(p.receipt_number || 'Pago')}</b><small>${esc(p.method || '')}</small></div><strong>${money(p.amount)}</strong></div>`).join('') || '<div class="empty">No hay pagos todavía.</div>'}</div></div>`;
  document.getElementById('newLoan').onclick = () => loanForm();
}

function customers(list) {
  document.getElementById('view').innerHTML = `<div class="toolbar"><div><span class="eyebrow">CARTERA</span><h2>Clientes</h2><p class="muted">Perfil, identificación, dirección, empleo e información financiera.</p></div><button class="primary" id="newCustomer">+ Nuevo cliente</button></div><div class="card table"><table><thead><tr><th>N.º Cliente</th><th>Cliente</th><th>Identificación</th><th>Teléfono</th><th>Estado</th></tr></thead><tbody>${list.map(c => `<tr><td><b>#${esc(c.customer_number)}</b></td><td><b>${esc(c.full_name)}</b><small>${esc(c.email || '')}</small></td><td>${esc(c.identification_type || '—')} ${esc(c.identification_number || '')}</td><td>${esc(c.phone || '—')}</td><td><span class="status ${esc(c.status || '')}">${esc(c.status || 'active')}</span></td></tr>`).join('') || '<tr><td colspan="5" class="empty">No hay clientes.</td></tr>'}</tbody></table></div>`;
  document.getElementById('newCustomer').onclick = () => customerForm();
}

function loans(list) {
  document.getElementById('view').innerHTML = `<div class="toolbar"><div><span class="eyebrow">CARTERA</span><h2>Préstamos</h2></div><button class="primary" id="newLoan">+ ${state.profile.role === 'customer' ? 'Solicitar préstamo':'Nuevo préstamo'}</button></div><div class="card table"><table><thead><tr><th>N.º Préstamo</th><th>Cliente</th><th>Principal</th><th>Total</th><th>Estado</th></tr></thead><tbody>${list.map(l => { const c=state.customers.find(x=>x.id===l.customer_id); return `<tr><td><b>#${esc(l.loan_number)}</b></td><td>${esc(c?.full_name || '—')}</td><td>${money(l.principal)}</td><td>${money(l.total_due)}</td><td><span class="status ${esc(l.status || '')}">${esc(l.status || '')}</span></td></tr>`; }).join('') || '<tr><td colspan="5" class="empty">No hay préstamos.</td></tr>'}</tbody></table></div>`;
  document.getElementById('newLoan').onclick = () => loanForm();
}

function payments(list) {
  document.getElementById('view').innerHTML = `<div class="toolbar"><div><span class="eyebrow">MOVIMIENTOS</span><h2>Pagos</h2></div></div><div class="card table"><table><thead><tr><th>Recibo</th><th>Préstamo</th><th>Monto</th><th>Método</th><th>Fecha</th></tr></thead><tbody>${list.map(p => { const l=state.loans.find(x=>x.id===p.loan_id); return `<tr><td><b>${esc(p.receipt_number || '—')}</b></td><td>#${esc(l?.loan_number || '—')}</td><td><b>${money(p.amount)}</b></td><td>${esc(p.method || '—')}</td><td>${p.paid_at ? new Date(p.paid_at).toLocaleDateString('es-DO') : '—'}</td></tr>`; }).join('') || '<tr><td colspan="5" class="empty">No hay pagos.</td></tr>'}</tbody></table></div>`;
}

function customerForm() {
  modal('Crear cliente', `<form id="customerForm" class="form-grid"><div class="form-section"><h3>Información personal</h3><div class="fields"><label>Nombre completo<input name="full_name" required></label><label>Fecha de nacimiento<input name="date_of_birth" type="date"></label><label>Género<select name="gender"><option value="">Seleccionar</option><option>Femenino</option><option>Masculino</option><option>Otro</option></select></label><label>Estado civil<select name="marital_status"><option value="">Seleccionar</option><option>Soltero/a</option><option>Casado/a</option><option>Divorciado/a</option><option>Viudo/a</option></select></label><label>Correo<input name="email" type="email"></label><label>Teléfono<input name="phone"></label></div></div><div class="form-section"><h3>Identificación oficial</h3><div class="fields"><label>Tipo de documento<select name="identification_type" required><option value="">Seleccionar</option><option>Driver License</option><option>State ID</option><option>Passport</option><option>Other</option></select></label><label>Número de documento<input name="identification_number" required></label><label>Fecha de emisión<input name="identification_issued_date" type="date"></label><label>Fecha de expiración<input name="identification_expiration_date" type="date"></label><label>País de emisión<input name="identification_country" value="USA"></label></div></div><div class="form-section"><h3>Dirección y empleo</h3><div class="fields"><label>Dirección<input name="address"></label><label>Ciudad<input name="city"></label><label>Estado<input name="state"></label><label>ZIP<input name="zip_code"></label><label>Empleador<input name="employer"></label><label>Ocupación<input name="occupation"></label><label>Ingreso mensual<input name="monthly_income" type="number" step="0.01"></label><label>Gastos mensuales<input name="monthly_expenses" type="number" step="0.01"></label></div></div><div class="form-actions"><button type="button" class="ghost" onclick="document.getElementById('modal').remove()">Cancelar</button><button class="primary">Guardar cliente</button></div></form>`);
  document.getElementById('customerForm').onsubmit = async (e) => { e.preventDefault(); const f=new FormData(e.target); const obj=Object.fromEntries(f.entries()); for(const k of ['monthly_income','monthly_expenses']) obj[k]=obj[k]?Number(obj[k]):null; const {data,error}=await supabase.from('customers').insert(obj).select().single(); if(error)return toast(error.message,true); state.customers.push(data); document.getElementById('modal').remove(); toast('Cliente creado correctamente'); render(); };
}

function loanForm() {
  if (state.profile.role === 'customer') {
    const c=state.customers.find(x=>x.profile_id===state.user.id); if(!c)return toast('Tu cuenta no está vinculada a un cliente.',true);
  }
  const customerOptions = state.customers.map(c=>`<option value="${c.id}">${esc(c.customer_number)} — ${esc(c.full_name)}</option>`).join('');
  modal(state.profile.role === 'customer' ? 'Solicitar préstamo':'Crear préstamo', `<form id="loanForm" class="form-grid"><div class="form-section"><h3>Datos del préstamo</h3><div class="fields">${state.profile.role === 'customer' ? '' : `<label>Cliente<select name="customer_id" required>${customerOptions}</select></label>`}<label>Monto<input name="principal" type="number" min="1" step="0.01" required></label><label>Tasa de interés (%)<input name="interest_rate" type="number" min="0" step="0.01" value="10" required></label><label>Plazo (semanas)<input name="term_weeks" type="number" min="1" value="12" required></label><label>Frecuencia<select name="frequency"><option>weekly</option><option>biweekly</option><option>monthly</option></select></label></div></div><div class="form-actions"><button type="button" class="ghost" onclick="document.getElementById('modal').remove()">Cancelar</button><button class="primary">${state.profile.role === 'customer' ? 'Enviar solicitud':'Crear préstamo'}</button></div></form>`);
  document.getElementById('loanForm').onsubmit = async (e) => { e.preventDefault(); const f=new FormData(e.target); const principal=Number(f.get('principal')); const rate=Number(f.get('interest_rate')); const weeks=Number(f.get('term_weeks')); let customer_id=f.get('customer_id'); if(state.profile.role==='customer') customer_id=state.customers.find(x=>x.profile_id===state.user.id)?.id; const total_due=principal+(principal*rate/100); const status=state.profile.role==='customer'?'pending':'active'; const {data,error}=await supabase.from('loans').insert({customer_id,principal,interest_rate:rate,term_weeks:weeks,frequency:f.get('frequency'),total_due,status}).select().single(); if(error)return toast(error.message,true); state.loans.unshift(data); document.getElementById('modal').remove(); toast(state.profile.role==='customer'?'Solicitud enviada':'Préstamo creado'); render(); };
}

function employees(){ document.getElementById('view').innerHTML=`<div class="toolbar"><div><span class="eyebrow">ADMINISTRACIÓN</span><h2>Empleados</h2></div><button class="primary" id="newEmployee">+ Nuevo empleado</button></div><div class="card"><div class="empty">Crea Supervisores y Cobradores desde el formulario seguro.</div></div>`; document.getElementById('newEmployee').onclick=()=>employeeForm(); }
function employeeForm(){ modal('Crear empleado',`<form id="employeeForm" class="form-grid"><div class="fields"><label>Nombre completo<input name="full_name" required></label><label>Nombre de usuario<input name="username" required></label><label>Correo<input name="email" type="email" required></label><label>Teléfono<input name="phone"></label><label>Rol<select name="role"><option value="supervisor">Supervisor</option><option value="collector">Cobrador</option></select></label><label>Contraseña<input name="password" type="password" minlength="8" required></label></div><div class="form-actions"><button type="button" class="ghost" onclick="document.getElementById('modal').remove()">Cancelar</button><button class="primary">Crear empleado</button></div></form>`); document.getElementById('employeeForm').onsubmit=async(e)=>{e.preventDefault();const body=Object.fromEntries(new FormData(e.target).entries());const {data:{session}}=await supabase.auth.getSession();const res=await fetch(`${SUPABASE_URL}/functions/v1/admin-create-user`,{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`, 'Content-Type':'application/json'},body:JSON.stringify(body)});const out=await res.json();if(!res.ok)return toast(out.error||'No se pudo crear el empleado.',true);document.getElementById('modal').remove();toast('Empleado creado correctamente');}; }
function ids(cs,ls){ document.getElementById('view').innerHTML=`<div class="toolbar"><div><span class="eyebrow">IDENTIFICACIÓN</span><h2>Números de clientes y préstamos</h2></div></div><div class="card table"><table><thead><tr><th>N.º Cliente</th><th>Cliente</th><th>N.º Préstamo</th><th>Estado</th></tr></thead><tbody>${ls.map(l=>{const c=cs.find(x=>x.id===l.customer_id);return `<tr><td><b>#${esc(c?.customer_number||'—')}</b></td><td>${esc(c?.full_name||'—')}</td><td><b>#${esc(l.loan_number||'—')}</b></td><td><span class="status ${esc(l.status||'')}">${esc(l.status||'')}</span></td></tr>`}).join('')||'<tr><td colspan="4" class="empty">No hay registros.</td></tr>'}</tbody></table></div>`; }
function analysis(data){ const paid=data.payments.reduce((s,p)=>s+Number(p.amount||0),0);document.getElementById('view').innerHTML=`<div class="metrics"><div><small>Clientes</small><strong>${data.customers.length}</strong></div><div><small>Préstamos</small><strong>${data.loans.length}</strong></div><div><small>Pagos</small><strong>${data.payments.length}</strong></div><div><small>Cobrado</small><strong>${money(paid)}</strong></div></div><div class="card"><span class="eyebrow">ANÁLISIS</span><h3>Resumen de cartera</h3><p class="muted">Los indicadores se calculan desde los datos actuales de PrestaYa.</p></div>`; }
function workflow(section,ls){ const title=section==='pending'?'Préstamos pendientes':section==='approvals'?'Aprobaciones':'Solicitudes';const rows=ls.filter(l=>l.status==='pending');document.getElementById('view').innerHTML=`<div class="toolbar"><div><span class="eyebrow">OPERACIONES</span><h2>${title}</h2></div></div><div class="card table"><table><thead><tr><th>Préstamo</th><th>Principal</th><th>Plazo</th><th>Estado</th><th>Acción</th></tr></thead><tbody>${rows.map(l=>`<tr><td><b>#${esc(l.loan_number)}</b></td><td>${money(l.principal)}</td><td>${esc(l.term_weeks)} semanas</td><td><span class="status pending">Pendiente</span></td><td>${['admin','supervisor'].includes(state.profile.role)?`<button class="link" onclick="window.approveLoan('${l.id}')">Aprobar</button>`:'En revisión'}</td></tr>`).join('')||'<tr><td colspan="5" class="empty">No hay registros pendientes.</td></tr>'}</tbody></table></div>`; }
window.approveLoan=async(id)=>{const {error}=await supabase.from('loans').update({status:'approved'}).eq('id',id);if(error)return toast(error.message,true);const l=state.loans.find(x=>x.id===id);if(l)l.status='approved';toast('Préstamo aprobado');render()};
function modal(title, body){ document.getElementById('modal')?.remove(); document.body.insertAdjacentHTML('beforeend',`<div id="modal" class="modal-back"><div class="modal"><div class="modal-head"><div><span class="eyebrow">PRESTA YA</span><h2>${title}</h2></div><button class="modal-close" onclick="document.getElementById('modal').remove()">×</button></div>${body}</div></div>`); }

async function startApp(){
  const { data:{session} } = await supabase.auth.getSession();
  if (!session) return loginScreen();
  state.user=session.user;
  try { state.profile=await getProfile(); await loadData(); shell(); render(); }
  catch(error){ console.error(error); await supabase.auth.signOut(); loginScreen(); toast(error.message || 'No se pudo cargar PrestaYa.', true); }
}

supabase.auth.onAuthStateChange((event, session) => { if (event === 'SIGNED_OUT') loginScreen(); });
startApp();