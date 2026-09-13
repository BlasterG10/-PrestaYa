// Presta Ya — live dashboard renderer
// Keeps the existing V2 shell and replaces the brittle demo render with a real, role-aware view.
(() => {
  const wait = setInterval(() => {
    if (!window.prestayaSupabase || !document.getElementById('content')) return;
    clearInterval(wait);

    const sb = window.prestayaSupabase;
    const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const money = n => 'RD$' + Number(n || 0).toLocaleString('es-DO', {minimumFractionDigits:2, maximumFractionDigits:2});
    const status = s => ({active:'Activo',approved:'Aprobado',pending:'Pendiente',rejected:'Rechazado',completed:'Completado',defaulted:'En mora',cancelled:'Cancelado'}[s] || s || '—');
    const payment = s => ({cash:'Efectivo',transfer:'Transferencia',zelle:'Zelle',other:'Otro'}[s] || s || '—');

    const css = document.createElement('style');
    css.id = 'live-dashboard-style';
    css.textContent = `
      .live{display:grid;gap:18px}.live-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.live-stat{padding:18px;background:#fff;border:1px solid #e5eaf1;border-radius:18px;box-shadow:0 10px 30px #1a29400d}.live-stat span{color:#728096;font-size:11px;font-weight:800}.live-stat b{display:block;font-size:25px;margin-top:8px;letter-spacing:-.04em}.live-stat small{color:#8a96a8}.live-grid{display:grid;grid-template-columns:1.35fr .65fr;gap:15px}.live-card{background:#fff;border:1px solid #e5eaf1;border-radius:18px;padding:20px;box-shadow:0 10px 30px #1a29400d}.live-card h2{margin:0;font-size:16px}.live-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}.live-list{display:grid;gap:9px}.live-item{display:grid;grid-template-columns:1.4fr .9fr .8fr .8fr;gap:10px;align-items:center;padding:13px;border:1px solid #edf0f5;border-radius:13px}.live-item b{font-size:12px}.live-item small{display:block;color:#7b8798;margin-top:3px}.live-pill{display:inline-flex;justify-content:center;padding:5px 8px;border-radius:999px;font-size:10px;font-weight:900;background:#e8f1ff;color:#155cbf}.live-pill.green{background:#ddf7eb;color:#11774d}.live-pill.amber{background:#fff2cf;color:#98610a}.live-pill.red{background:#ffe1e4;color:#a52d36}.live-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}.live-action{border:1px solid #e5eaf1;background:#fff;border-radius:15px;padding:16px;text-align:left;cursor:pointer}.live-action b{display:block;margin-top:8px}.live-action small{display:block;color:#728096;margin-top:4px}.live-empty{text-align:center;padding:28px;color:#728096;font-size:12px}.live-table{overflow:auto}.live-table table{width:100%;border-collapse:collapse;min-width:620px}.live-table th,.live-table td{padding:11px 9px;border-bottom:1px solid #edf0f5;text-align:left;font-size:12px}.live-table th{font-size:10px;text-transform:uppercase;color:#728096}.live-hero{padding:24px;border-radius:19px;color:#fff;background:radial-gradient(circle at 90% 15%,#3f91ff55,transparent 28%),linear-gradient(135deg,#081525,#173764)}.live-hero h2{margin:8px 0;font-size:28px;letter-spacing:-.05em}.live-hero p{margin:0;color:#cbd7e7;line-height:1.5}.live-loading{padding:35px;text-align:center;color:#728096}@media(max-width:1050px){.live-stats{grid-template-columns:1fr 1fr}.live-grid{grid-template-columns:1fr}}@media(max-width:680px){.live-stats{grid-template-columns:1fr 1fr}.live-item{grid-template-columns:1fr 1fr}.live-hero h2{font-size:23px}}
    `;
    document.head.appendChild(css);

    async function loadData() {
      const [{data:customers,error:ce},{data:loans,error:le},{data:payments,error:pe}] = await Promise.all([
        sb.from('customers').select('id,customer_number,full_name,phone,status,profile_id').order('customer_number'),
        sb.from('loans').select('id,loan_number,customer_id,principal,total_due,status,created_at').order('created_at',{ascending:false}),
        sb.from('payments').select('id,receipt_number,loan_id,amount,method,paid_at').order('paid_at',{ascending:false})
      ]);
      if (ce) throw ce;if (le) throw le;if (pe) throw pe;
      return {customers:customers||[],loans:loans||[],payments:payments||[]};
    }

    function renderDashboard(data) {
      const {customers,loans,payments}=data;
      const activeLoans=loans.filter(x=>['active','approved'].includes(x.status));
      const overdue=loans.filter(x=>x.status==='defaulted');
      const principal=loans.reduce((a,x)=>a+Number(x.principal||0),0);
      const paid=payments.reduce((a,x)=>a+Number(x.amount||0),0);
      const byId=new Map(customers.map(c=>[c.id,c]));
      const loanById=new Map(loans.map(l=>[l.id,l]));
      const role=window.role||'client';
      const user=window.name||'Usuario';
      const customer = customers.find(c=>c.profile_id===window.prestayaUserId) || null;
      const scopedLoans=role==='client'&&customer?loans.filter(l=>l.customer_id===customer.id):loans;
      const scopedPayments=role==='client'&&customer?payments.filter(p=>loanById.get(p.loan_id)?.customer_id===customer.id):payments;
      const scopedPrincipal=scopedLoans.reduce((a,x)=>a+Number(x.principal||0),0);
      const scopedPaid=scopedPayments.reduce((a,x)=>a+Number(x.amount||0),0);
      const scopedDue=scopedLoans.reduce((a,x)=>a+Number(x.total_due||x.principal||0),0)-scopedPaid;

      if(role==='client'){
        document.getElementById('content').innerHTML=`<div class="live">
          <section class="live-hero"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.12em;font-weight:900;color:#9bc7ff">Tu cuenta</div><h2>Bienvenido, ${esc(user)}</h2><p>Aquí puedes consultar tus préstamos, pagos y saldo desde un solo lugar.</p></section>
          <div class="live-stats"><div class="live-stat"><span>Préstamos</span><b>${scopedLoans.length}</b><small>Asociados a tu cuenta</small></div><div class="live-stat"><span>Capital</span><b>${money(scopedPrincipal)}</b><small>Total financiado</small></div><div class="live-stat"><span>Pagado</span><b>${money(scopedPaid)}</b><small>Pagos registrados</small></div><div class="live-stat"><span>Saldo pendiente</span><b>${money(Math.max(0,scopedDue))}</b><small>Por pagar</small></div></div>
          <div class="live-grid"><section class="live-card"><div class="live-head"><h2>Mis préstamos</h2><span class="live-pill">${scopedLoans.length} registros</span></div><div class="live-list">${scopedLoans.slice(0,6).map(l=>{const c=byId.get(l.customer_id);return `<div class="live-item"><div><b>${esc(l.loan_number)}</b><small>${esc(c?.full_name||user)}</small></div><div><small>Principal</small><b>${money(l.principal)}</b></div><div><small>Saldo</small><b>${money(Math.max(0,Number(l.total_due||l.principal||0)-scopedPayments.filter(p=>p.loan_id===l.id).reduce((a,p)=>a+Number(p.amount||0),0)))}</b></div><div><span class="live-pill ${l.status==='defaulted'?'red':l.status==='active'?'green':'amber'}">${esc(status(l.status))}</span></div></div>`}).join('')||'<div class="live-empty">No hay préstamos asociados a esta cuenta.</div>'}</div></section><section class="live-card"><div class="live-head"><h2>Acciones rápidas</h2></div><div class="live-actions"><button class="live-action" data-live-nav="loans">▣<b>Mis préstamos</b><small>Ver detalles e imprimir</small></button><button class="live-action" data-live-nav="payments">▤<b>Mis pagos</b><small>Consultar historial</small></button></div></section></div>
        </div>`;
      } else {
        document.getElementById('content').innerHTML=`<div class="live">
          <section class="live-hero"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.12em;font-weight:900;color:#9bc7ff">Panel operativo</div><h2>Buenos días, ${esc(user)}</h2><p>Resumen actualizado de clientes, cartera y pagos.</p></section>
          <div class="live-stats"><div class="live-stat"><span>Clientes</span><b>${customers.length}</b><small>Registrados</small></div><div class="live-stat"><span>Préstamos activos</span><b>${activeLoans.length}</b><small>En cartera</small></div><div class="live-stat"><span>Capital colocado</span><b>${money(principal)}</b><small>Total de préstamos</small></div><div class="live-stat"><span>Pagos registrados</span><b>${money(paid)}</b><small>Acumulado</small></div></div>
          <div class="live-grid"><section class="live-card"><div class="live-head"><h2>Préstamos recientes</h2><span class="live-pill">${loans.length} total</span></div><div class="live-list">${loans.slice(0,7).map(l=>{const c=byId.get(l.customer_id);return `<div class="live-item"><div><b>${esc(l.loan_number)}</b><small>${esc(c?.full_name||'Cliente')}</small></div><div><small>Principal</small><b>${money(l.principal)}</b></div><div><small>Total</small><b>${money(l.total_due||l.principal)}</b></div><div><span class="live-pill ${l.status==='defaulted'?'red':l.status==='active'?'green':'amber'}">${esc(status(l.status))}</span></div></div>`}).join('')||'<div class="live-empty">No hay préstamos todavía.</div>'}</div></section><section class="live-card"><div class="live-head"><h2>Resumen de cartera</h2></div><div style="display:grid;gap:14px"><div><small class="muted">En mora</small><div style="font-size:25px;font-weight:900;margin-top:5px">${overdue.length}</div></div><div><small class="muted">Clientes</small><div style="font-size:25px;font-weight:900;margin-top:5px">${customers.length}</div></div><div><small class="muted">Pagos</small><div style="font-size:25px;font-weight:900;margin-top:5px">${payments.length}</div></div></div></section></div>
          <section class="live-card"><div class="live-head"><h2>Últimos pagos</h2><span class="live-pill">Tiempo real</span></div><div class="live-table"><table><thead><tr><th>Recibo</th><th>Cliente</th><th>Préstamo</th><th>Monto</th><th>Método</th><th>Fecha</th></tr></thead><tbody>${payments.slice(0,8).map(p=>{const l=loanById.get(p.loan_id);const c=l?byId.get(l.customer_id):null;return `<tr><td><b>${esc(p.receipt_number)}</b></td><td>${esc(c?.full_name||'—')}</td><td>${esc(l?.loan_number||'—')}</td><td><b>${money(p.amount)}</b></td><td>${esc(payment(p.method))}</td><td>${p.paid_at?new Date(p.paid_at).toLocaleDateString('es-DO'):'—'}</td></tr>`}).join('')||'<tr><td colspan="6" class="live-empty">No hay pagos registrados.</td></tr>'}</tbody></table></div></section>
        </div>`;
      }
      document.querySelectorAll('[data-live-nav]').forEach(b=>b.onclick=()=>{if(typeof window.activate==='function')window.activate(b.dataset.liveNav)});
    }

    async function refresh() {
      const content=document.getElementById('content');
      if(!document.getElementById('app')?.classList.contains('hide')) content.innerHTML='<div class="live-loading">Cargando información…</div>';
      try { renderDashboard(await loadData()); } catch(e) { content.innerHTML='<div class="live-card"><h2>No pudimos cargar el dashboard</h2><p class="muted">'+esc(e?.message||'Error de conexión con Supabase.')+'</p></div>'; }
    }

    window.render = refresh;
    window.prestayaRefreshDashboard = refresh;
    if (window.prestayaSupabase) {
      sb.auth.onAuthStateChange((event, session) => { if(session?.user) { window.prestayaUserId=session.user.id; setTimeout(refresh,0); } });
    }
    if(!document.getElementById('app')?.classList.contains('hide')) refresh();
  }, 50);
})();
