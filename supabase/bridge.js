// Presta Ya — production Supabase bridge
// Connects the existing V2 UI to Supabase Auth + PostgreSQL without replacing the UI.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://qchzgjhbhnkxkmvebkgw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_P25yjBAHPfz4zaFzhTZKag_jknlwGKI';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const wait = ms => new Promise(r => setTimeout(r, ms));
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const moneyLocal = n => 'RD$' + Number(n || 0).toLocaleString('es-DO', {minimumFractionDigits:2});

async function getProfile(userId) {
  const { data, error } = await sb.from('profiles').select('id,full_name,role,phone,active').eq('id', userId).single();
  if (error) throw error;
  if (!data.active) throw new Error('La cuenta está desactivada.');
  return data;
}

async function loadData(profile) {
  // Staff can read operational data according to RLS; customers are restricted to their own records.
  const [{ data: customers }, { data: loansData }, { data: paymentsData }] = await Promise.all([
    sb.from('customers').select('id,customer_number,profile_id,full_name,phone,status').order('customer_number'),
    sb.from('loans').select('id,loan_number,customer_id,principal,total_due,status,created_at').order('created_at', { ascending:false }),
    sb.from('payments').select('id,receipt_number,loan_id,amount,method,paid_at').order('paid_at', { ascending:false })
  ]);

  const customerRows = (customers || []).map(c => [
    String(c.customer_number), c.full_name, c.phone || '',
    c.status === 'active' ? 'Activo' : c.status === 'blocked' ? 'Bloqueado' : 'Inactivo'
  ]);
  const customerById = new Map((customers || []).map(c => [c.id, c]));
  const loanRows = (loansData || []).map(l => {
    const c = customerById.get(l.customer_id);
    const total = Number(l.total_due || l.principal || 0);
    const principal = Number(l.principal || 0);
    const statusMap = {active:'Activo', approved:'Aprobado', pending:'Pendiente', rejected:'Rechazado', completed:'Completado', defaulted:'En mora', cancelled:'Cancelado'};
    return [String(l.loan_number), c?.full_name || '—', principal, total, total > 0 ? Math.max(0, Math.min(100, Math.round(((total - Math.max(0,total-principal))/total)*100))) : 0, statusMap[l.status] || l.status, new Date(l.created_at).toLocaleDateString('es-DO')];
  });
  const loanById = new Map((loansData || []).map(l => [l.id, l]));
  const paymentRows = (paymentsData || []).map(p => {
    const l = loanById.get(p.loan_id);
    const c = l ? customerById.get(l.customer_id) : null;
    const methods = {cash:'Efectivo',transfer:'Transferencia',zelle:'Zelle',other:'Otro'};
    return [p.receipt_number, c?.full_name || '—', l ? String(l.loan_number) : '—', Number(p.amount), methods[p.method] || p.method, new Date(p.paid_at).toLocaleDateString('es-DO')];
  });

  if (Array.isArray(window.clients)) window.clients.splice(0, window.clients.length, ...customerRows);
  if (Array.isArray(window.loans)) window.loans.splice(0, window.loans.length, ...loanRows);
  if (Array.isArray(window.payments)) window.payments.splice(0, window.payments.length, ...paymentRows);

  return { customers: customers || [], loans: loansData || [], payments: paymentsData || [] };
}

function showAuthError(message) {
  let box = document.getElementById('supabase-error');
  if (!box) {
    box = document.createElement('div');
    box.id = 'supabase-error';
    box.style.cssText = 'margin-top:12px;padding:10px;border:1px solid #ffd2d6;background:#fff2f3;color:#a52d36;border-radius:11px;font-size:11px;font-weight:700';
    document.querySelector('.authcard')?.appendChild(box);
  }
  box.textContent = message;
}

async function productionLogin() {
  const email = document.getElementById('email')?.value.trim();
  const password = document.querySelector('#auth input[type="password"]')?.value || '';
  if (!email || !password) return showAuthError('Escribe tu correo y contraseña.');

  const button = document.querySelector('#auth button.primary');
  if (button) { button.disabled = true; button.textContent = 'Entrando…'; }
  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const profile = await getProfile(data.user.id);
    window.__prestayaProfile = profile;
    window.role = profile.role === 'customer' ? 'client' : profile.role;
    window.name = profile.full_name || email.split('@')[0];
    await loadData(profile);
    document.getElementById('auth').classList.add('hide');
    document.getElementById('app').classList.remove('hide');
    document.getElementById('bottom').classList.remove('hide');
    document.getElementById('rolebox').innerHTML = '<b>' + esc({admin:'Administrador',supervisor:'Supervisor',collector:'Cobrador',client:'Cliente'}[window.role] || window.role) + '</b>Sesión activa · acceso controlado';
    document.getElementById('user').innerHTML = '<span class="av">' + esc(window.name.slice(0,2).toUpperCase()) + '</span>' + esc(window.name);
    if (typeof window.buildNav === 'function') window.buildNav();
    if (typeof window.render === 'function') window.render();
  } catch (err) {
    showAuthError(err?.message || 'No fue posible iniciar sesión.');
  } finally {
    if (button) { button.disabled = false; button.textContent = 'Iniciar sesión'; }
  }
}

async function productionLogout() {
  await sb.auth.signOut();
  location.reload();
}

window.addEventListener('DOMContentLoaded', async () => {
  // Replace the demo login with real Supabase Auth.
  window.login = productionLogin;
  const roleField = document.getElementById('role');
  if (roleField) {
    roleField.closest('.field')?.remove();
  }
  const demo = document.querySelector('.demo');
  if (demo) demo.textContent = 'Autenticación protegida por Supabase Auth. Tu acceso se determina por tu perfil y rol.';
  const logout = document.querySelector('.logout');
  if (logout) logout.onclick = productionLogout;

  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) return;
  try {
    const profile = await getProfile(session.user.id);
    window.__prestayaProfile = profile;
    window.role = profile.role === 'customer' ? 'client' : profile.role;
    window.name = profile.full_name || session.user.email?.split('@')[0] || 'Usuario';
    await loadData(profile);
    document.getElementById('auth').classList.add('hide');
    document.getElementById('app').classList.remove('hide');
    document.getElementById('bottom').classList.remove('hide');
    document.getElementById('rolebox').innerHTML = '<b>' + esc({admin:'Administrador',supervisor:'Supervisor',collector:'Cobrador',client:'Cliente'}[window.role] || window.role) + '</b>Sesión activa · acceso controlado';
    document.getElementById('user').innerHTML = '<span class="av">' + esc(window.name.slice(0,2).toUpperCase()) + '</span>' + esc(window.name);
    if (typeof window.buildNav === 'function') window.buildNav();
    if (typeof window.render === 'function') window.render();
  } catch (err) {
    await sb.auth.signOut();
    showAuthError('Tu sesión no tiene un perfil válido. Contacta al administrador.');
  }
});

// Keep the current session/data synchronized when Auth changes.
sb.auth.onAuthStateChange((_event, session) => {
  if (!session) return;
});

export { sb };
