import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://qchzgjhbhnkxkmvebkgw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_P25yjBAHPfz4zaFzhTZKag_jknlwGKI';
const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });

const translations = {
  personal: 'Personal', empresarial: 'Empresarial', micro: 'Personal', flash: 'Empresarial',
  daily: 'Diario', weekly: 'Semanal', biweekly: 'Quincenal', monthly: 'Mensual',
  active: 'Activo', approved: 'Aprobado', pending: 'Pendiente', completed: 'Completado',
  rejected: 'Rechazado', defaulted: 'En mora', blocked: 'Bloqueado', cancelled: 'Cancelado',
  cash: 'Efectivo', transfer: 'Transferencia', zelle: 'Zelle', other: 'Otro'
};

function translateText(root = document.body) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const original = node.nodeValue;
    const trimmed = original.trim();
    if (!trimmed) continue;
    const translated = translations[trimmed.toLowerCase()];
    if (translated) node.nodeValue = original.replace(trimmed, translated);
  }
}

const observer = new MutationObserver(() => translateText());
observer.observe(document.documentElement, { childList: true, subtree: true });
setTimeout(() => translateText(), 100);

function modal(title, body) {
  document.getElementById('loanFixModal')?.remove();
  const el = document.createElement('div');
  el.id = 'loanFixModal';
  el.innerHTML = `<div class="lf-backdrop"><section class="lf-modal"><header><div><small>PRESTA YA</small><h2>${title}</h2></div><button type="button" class="lf-close">×</button></header>${body}</section></div>`;
  document.body.appendChild(el);
  el.querySelector('.lf-close').onclick = () => el.remove();
  return el;
}

async function openLoanForm() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) return;
  const { data: profile } = await db.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
  if (!profile) return;
  const role = profile.role;
  const { data: customers, error } = await db.from('customers').select('id,customer_number,full_name,profile_id').order('customer_number');
  if (error) return showError(error.message);
  const own = (customers || []).find(c => c.profile_id === session.user.id);
  if (role === 'customer' && !own) return showError('Tu cuenta no está vinculada a un cliente.');
  const options = (customers || []).map(c => `<option value="${c.id}" ${own?.id === c.id ? 'selected':''}>#${c.customer_number} — ${escapeHtml(c.full_name)}</option>`).join('');
  const el = modal(role === 'customer' ? 'Solicitar préstamo' : 'Crear préstamo', `
    <form id="loanFixForm" class="lf-form">
      <div class="lf-section"><h3>Tipo de préstamo</h3><div class="lf-types">
        <label class="lf-type"><input type="radio" name="loan_type" value="personal" checked><span><b>Personal</b><small>Para necesidades personales</small></span></label>
        <label class="lf-type"><input type="radio" name="loan_type" value="empresarial"><span><b>Empresarial</b><small>Para actividades de negocio</small></span></label>
      </div></div>
      <div class="lf-section"><h3>Datos del préstamo</h3><div class="lf-grid">
        ${role === 'customer' ? '' : `<label>Cliente<select name="customer_id" required>${options}</select></label>`}
        <label>Monto solicitado<input name="principal" type="number" min="1" max="10000" step="0.01" required placeholder="0.00"></label>
        <label>Tasa de interés (%)<input name="interest_rate" type="number" min="0" step="0.01" value="10" required></label>
        <label>Plazo (semanas)<select name="term_weeks" required><option value="4">4 semanas</option><option value="6">6 semanas</option><option value="8">8 semanas</option><option value="10">10 semanas</option><option value="12" selected>12 semanas</option></select></label>
        <label>Frecuencia<select name="frequency" required><option value="daily">Diario</option><option value="weekly" selected>Semanal</option></select></label>
      </div></div>
      <div class="lf-actions"><button type="button" class="lf-cancel">Cancelar</button><button class="lf-submit">${role === 'customer' ? 'Enviar solicitud' : 'Crear préstamo'}</button></div>
    </form>`);
  el.querySelector('.lf-cancel').onclick = () => el.remove();
  el.querySelector('#loanFixForm').onsubmit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    const principal = Number(form.get('principal'));
    const interestRate = Number(form.get('interest_rate'));
    const termWeeks = Number(form.get('term_weeks'));
    const loanType = String(form.get('loan_type'));
    const frequency = String(form.get('frequency'));
    const customerId = role === 'customer' ? own.id : String(form.get('customer_id'));
    if (!['personal','empresarial'].includes(loanType)) return showError('Selecciona un tipo de préstamo válido.');
    if (!['daily','weekly'].includes(frequency)) return showError('Selecciona una frecuencia válida.');
    if (principal <= 0 || principal > 10000) return showError('El monto debe estar entre $1 y $10,000.');
    if (termWeeks < 4 || termWeeks > 12) return showError('El plazo debe estar entre 4 y 12 semanas.');
    const totalDue = Number((principal + principal * interestRate / 100).toFixed(2));
    const payload = { customer_id: customerId, loan_type: loanType, principal, interest_rate: interestRate, term_weeks: termWeeks, frequency, total_due: totalDue, requested_by: session.user.id, status: role === 'customer' ? 'pending' : 'active' };
    const { data, error: insertError } = await db.from('loans').insert(payload).select().single();
    if (insertError) return showError(insertError.message);
    el.remove();
    alert(role === 'customer' ? 'Solicitud enviada correctamente.' : `Préstamo #${data.loan_number} creado correctamente.`);
    location.reload();
  };
}

function showError(message) {
  const old = document.getElementById('lfError'); old?.remove();
  const e = document.createElement('div'); e.id = 'lfError'; e.className = 'lf-error'; e.textContent = message; document.body.appendChild(e); setTimeout(() => e.remove(), 5000);
}
function escapeHtml(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// Capture the click before the legacy handler so the real form is always used.
document.addEventListener('click', (event) => {
  const button = event.target.closest('#newLoan');
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  openLoanForm();
}, true);
