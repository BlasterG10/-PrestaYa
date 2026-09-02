# -PrestaYa
Proyecto de microprestamos 
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MicroPréstamos Beta 0.1</title>
<style>
*{box-sizing:border-box}
body{margin:0;font-family:Arial,Helvetica,sans-serif;background:#f4f6f8;color:#1f2937}
button,input,select,textarea{font:inherit}
.login{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.card{background:white;border-radius:16px;box-shadow:0 8px 30px #0001;padding:28px}
.login .card{width:100%;max-width:420px}
h1,h2,h3{margin-top:0}
label{display:block;font-size:14px;font-weight:bold;margin:14px 0 6px}
input,select,textarea{width:100%;padding:11px;border:1px solid #d1d5db;border-radius:9px;background:white}
button{border:0;border-radius:9px;padding:11px 15px;cursor:pointer;font-weight:bold}
.primary{background:#2563eb;color:white}.secondary{background:#e5e7eb}.danger{background:#dc2626;color:white}
.app{display:none;min-height:100vh}
.sidebar{position:fixed;left:0;top:0;bottom:0;width:235px;background:#111827;color:white;padding:22px 15px}
.brand{font-size:21px;font-weight:bold;margin-bottom:28px}
.nav button{display:block;width:100%;text-align:left;background:transparent;color:#d1d5db;margin:5px 0}
.nav button:hover,.nav button.active{background:#1f2937;color:white}
.main{margin-left:235px;padding:25px}
.top{display:flex;justify-content:space-between;align-items:center;margin-bottom:22px}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:15px}
.stat{background:white;border-radius:14px;padding:18px;box-shadow:0 3px 15px #0000000d}
.stat b{font-size:25px;display:block;margin-top:8px}
.section{display:none}.section.active{display:block}
table{width:100%;border-collapse:collapse;background:white;border-radius:12px;overflow:hidden}
th,td{padding:12px;border-bottom:1px solid #eee;text-align:left;font-size:14px}
th{background:#f9fafb}
.badge{padding:5px 9px;border-radius:20px;font-size:12px;font-weight:bold;background:#fef3c7}
.badge.ok{background:#dcfce7}.badge.red{background:#fee2e2}
.actions{display:flex;gap:8px;flex-wrap:wrap}
.form-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:15px}
.notice{padding:12px;border-radius:9px;background:#eff6ff;margin-bottom:15px}
.hidden{display:none!important}
@media(max-width:800px){
.sidebar{position:static;width:100%;height:auto}.main{margin-left:0}.grid{grid-template-columns:repeat(2,1fr)}
.form-grid{grid-template-columns:1fr}
}
</style>
</head>
<body>

<div id="login" class="login">
  <div class="card">
    <h1>MicroPréstamos</h1>
    <p>Beta 0.1 — sistema de prueba</p>
    <label>Usuario</label>
    <input id="user" placeholder="admin">
    <label>Rol</label>
    <select id="role">
      <option value="admin">Administrador</option>
      <option value="supervisor">Supervisor</option>
      <option value="empleado">Empleado / Cobrador</option>
    </select>
    <label>Contraseña</label>
    <input id="pass" type="password" value="1234">
    <button class="primary" style="width:100%;margin-top:18px" onclick="login()">Entrar</button>
    <p style="font-size:12px;color:#6b7280">Demo: cualquier usuario y contraseña funcionan.</p>
  </div>
</div>

<div id="app" class="app">
  <aside class="sidebar">
    <div class="brand">💰 MicroPréstamos</div>
    <div id="roleLabel" style="font-size:13px;color:#9ca3af;margin-bottom:15px"></div>
    <div class="nav">
      <button class="active" onclick="show('dashboard',this)">📊 Dashboard</button>
      <button onclick="show('clientes',this)">👥 Clientes</button>
      <button onclick="show('prestamos',this)">💵 Préstamos</button>
      <button onclick="show('pagos',this)">🧾 Pagos</button>
      <button id="approvalNav" onclick="show('aprobaciones',this)">✅ Aprobaciones</button>
    </div>
    <button class="secondary" style="width:100%;margin-top:25px" onclick="logout()">Cerrar sesión</button>
  </aside>

  <main class="main">
    <div class="top">
      <div><h2 id="title">Dashboard</h2><span id="date"></span></div>
      <strong id="currentUser"></strong>
    </div>

    <section id="dashboard" class="section active">
      <div class="grid">
        <div class="stat">Clientes activos<b id="sClientes">0</b></div>
        <div class="stat">Préstamos activos<b id="sPrestamos">0</b></div>
        <div class="stat">Saldo pendiente<b id="sSaldo">$0</b></div>
        <div class="stat">Pagos registrados<b id="sPagos">0</b></div>
      </div>
      <div class="card" style="margin-top:18px">
        <h3>Flujo de prueba</h3>
        <p>Los empleados pueden registrar clientes y solicitar préstamos. Los cambios financieros quedan pendientes de aprobación.</p>
      </div>
    </section>

    <section id="clientes" class="section">
      <div class="card">
        <div class="top"><h3>Clientes</h3><button class="primary" onclick="toggle('clienteForm')">+ Nuevo cliente</button></div>
        <div id="clienteForm" class="hidden">
          <div class="form-grid">
            <div><label>Nombre completo</label><input id="cNombre"></div>
            <div><label>Teléfono</label><input id="cTelefono"></div>
            <div><label>Tipo de identificación</label><select id="cIdTipo"><option>Cédula</option><option>Pasaporte</option><option>Otra</option></select></div>
            <div><label>Número de identificación</label><input id="cId"></div>
            <div><label>Dirección</label><input id="cDireccion"></div>
            <div><label>Notas</label><textarea id="cNotas"></textarea></div>
          </div>
          <button class="primary" onclick="addClient()">Guardar cliente</button>
          <hr>
        </div>
        <table><thead><tr><th>Cliente</th><th>Teléfono</th><th>Identificación</th><th>Estado</th></tr></thead>
        <tbody id="clientTable"></tbody></table>
      </div>
    </section>

    <section id="prestamos" class="section">
      <div class="card">
        <h3>Solicitud de préstamo</h3>
        <div class="notice">Reglas Beta: Micropréstamo ≤ RD$5,000 → 15%. Préstamo Flash hasta RD$10,000 → configurable; mínimo 4 y máximo 12 semanas.</div>
        <div class="form-grid">
          <div><label>Cliente</label><select id="pCliente"></select></div>
          <div><label>Tipo</label><select id="pTipo" onchange="calc()"><option value="micro">Micropréstamo</option><option value="flash">Préstamo Flash</option></select></div>
          <div><label>Monto (RD$)</label><input id="pMonto" type="number" min="1" max="10000" oninput="calc()"></div>
          <div><label>Frecuencia</label><select id="pFreq"><option>Diario</option><option>Semanal</option></select></div>
          <div><label>Semanas</label><input id="pSemanas" type="number" min="4" max="12" value="4" oninput="calc()"></div>
          <div><label>Garantía (Flash)</label><input id="pGarantia" placeholder="Descripción de la garantía"></div>
        </div>
        <div class="card" style="margin:15px 0;background:#f9fafb">
          <b>Interés: <span id="interes">15%</span></b><br>
          Interés: <span id="iMonto">RD$0</span><br>
          Total a pagar: <span id="total">RD$0</span><br>
          Cuota aproximada: <span id="cuota">RD$0</span>
        </div>
        <button class="primary" onclick="requestLoan()">Enviar solicitud</button>
      </div>
      <div class="card" style="margin-top:18px">
        <h3>Préstamos</h3>
        <table><thead><tr><th>Cliente</th><th>Tipo</th><th>Monto</th><th>Total</th><th>Estado</th></tr></thead>
        <tbody id="loanTable"></tbody></table>
      </div>
    </section>

    <section id="pagos" class="section">
      <div class="card">
        <h3>Registrar pago</h3>
        <div class="form-grid">
          <div><label>Préstamo</label><select id="payLoan"></select></div>
          <div><label>Monto (RD$)</label><input id="payAmount" type="number"></div>
          <div><label>Método</label><select id="payMethod"><option>Efectivo</option><option>Transferencia</option><option>Zelle</option><option>Otro</option></select></div>
        </div>
        <button class="primary" style="margin-top:15px" onclick="registerPayment()">Registrar pago</button>
      </div>
      <div class="card" style="margin-top:18px">
        <h3>Historial de pagos</h3>
        <table><thead><tr><th>Recibo único</th><th>Préstamo</th><th>Monto</th><th>Método</th><th>Fecha</th></tr></thead>
        <tbody id="paymentTable"></tbody></table>
      </div>
    </section>

    <section id="aprobaciones" class="section">
      <div class="card">
        <h3>Aprobaciones</h3>
        <p>Solo Supervisor y Administrador pueden aprobar solicitudes financieras.</p>
        <table><thead><tr><th>Solicitud</th><th>Cliente</th><th>Monto</th><th>Estado</th><th>Acción</th></tr></thead>
        <tbody id="approvalTable"></tbody></table>
      </div>
    </section>
  </main>
</div>

<script>
let role='';
let clients=JSON.parse(localStorage.getItem('clients')||'[]');
let loans=JSON.parse(localStorage.getItem('loans')||'[]');
let payments=JSON.parse(localStorage.getItem('payments')||'[]');

const money=n=>'RD$'+Number(n||0).toLocaleString('es-DO',{minimumFractionDigits:2});
function save(){localStorage.setItem('clients',JSON.stringify(clients));localStorage.setItem('loans',JSON.stringify(loans));localStorage.setItem('payments',JSON.stringify(payments));}
function login(){
 role=document.getElementById('role').value;
 document.getElementById('login').style.display='none';
 document.getElementById('app').style.display='block';
 document.getElementById('roleLabel').textContent='Rol: '+(role==='admin'?'Administrador':role==='supervisor'?'Supervisor':'Empleado / Cobrador');
 document.getElementById('currentUser').textContent=document.getElementById('user').value||'Usuario';
 document.getElementById('approvalNav').style.display=(role==='admin'||role==='supervisor')?'block':'none';
 document.getElementById('date').textContent=new Date().toLocaleDateString('es-DO');
 render();
}
function logout(){location.reload()}
function show(id,btn){
 document.querySelectorAll('.section').forEach(x=>x.classList.remove('active'));
 document.getElementById(id).classList.add('active');
 document.querySelectorAll('.nav button').forEach(x=>x.classList.remove('active'));
 if(btn)btn.classList.add('active');
 document.getElementById('title').textContent=btn?btn.textContent.replace(/[^\p{L}\s\/]/gu,'').trim():'';
 render();
}
function toggle(id){document.getElementById(id).classList.toggle('hidden')}
function addClient(){
 let name=cNombre.value.trim(); if(!name){alert('Escribe el nombre del cliente.');return}
 clients.push({id:crypto.randomUUID(),name,telefono:cTelefono.value,idtipo:cIdTipo.value,idnum:cId.value,direccion:cDireccion.value,notas:cNotas.value,status:'Activo'});
 save(); alert('Cliente registrado.'); document.getElementById('clienteForm').classList.add('hidden'); render();
}
function calc(){
 let amount=Number(pMonto.value||0), type=pTipo.value, weeks=Math.max(4,Math.min(12,Number(pSemanas.value||4)));
 let rate=type==='micro'?0.15:0.20;
 interes.textContent=(rate*100)+'%'; iMonto.textContent=money(amount*rate); total.textContent=money(amount*(1+rate)); cuota.textContent=money((amount*(1+rate))/weeks);
}
function requestLoan(){
 let amount=Number(pMonto.value), type=pTipo.value, weeks=Number(pSemanas.value);
 if(!pCliente.value){alert('Selecciona un cliente.');return}
 if(!amount || amount<1 || amount>10000){alert('El monto debe estar entre RD$1 y RD$10,000.');return}
 if(type==='micro' && amount>5000){alert('El micropréstamo tiene un máximo de RD$5,000.');return}
 if(weeks<4||weeks>12){alert('La duración debe ser de 4 a 12 semanas en esta beta.');return}
 let rate=type==='micro'?0.15:0.20;
 loans.push({id:crypto.randomUUID(),clientId:pCliente.value,type,amount,rate,total:amount*(1+rate),weeks,freq:pFreq.value,guarantee:pGarantia.value,status:'Pendiente',created:new Date().toISOString()});
 save(); alert('Solicitud creada y enviada para aprobación.'); render();
}
function approve(id,ok){
 if(role!=='admin'&&role!=='supervisor'){alert('No tienes permiso.');return}
 let l=loans.find(x=>x.id===id); if(!l)return;
 l.status=ok?'Aprobado':'Rechazado'; l.approvedBy=document.getElementById('user').value||role; l.approvedAt=new Date().toISOString();
 save(); render();
}
function registerPayment(){
 let l=loans.find(x=>x.id===payLoan.value), amount=Number(payAmount.value);
 if(!l||l.status!=='Aprobado'){alert('Solo puedes registrar pagos de préstamos aprobados.');return}
 if(!amount||amount<=0){alert('Indica un monto válido.');return}
 let receipt='RC-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,7).toUpperCase();
 payments.push({id:crypto.randomUUID(),receipt,loanId:l.id,amount,method:payMethod.value,date:new Date().toISOString(),user:document.getElementById('user').value||role});
 save(); alert('Pago registrado. Recibo: '+receipt); render();
}
function render(){
 sClientes.textContent=clients.length;
 sPrestamos.textContent=loans.filter(l=>l.status==='Aprobado').length;
 sSaldo.textContent=money(loans.filter(l=>l.status==='Aprobado').reduce((a,l)=>a+l.total,0)-payments.reduce((a,p)=>a+p.amount,0));
 sPagos.textContent=payments.length;
 clientTable.innerHTML=clients.map(c=>`<tr><td>${esc(c.name)}</td><td>${esc(c.telefono)}</td><td>${esc(c.idtipo)} ${esc(c.idnum)}</td><td><span class="badge ok">${c.status}</span></td></tr>`).join('')||'<tr><td colspan="4">No hay clientes.</td></tr>';
 pCliente.innerHTML=clients.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');
 loanTable.innerHTML=loans.map(l=>{let c=clients.find(x=>x.id===l.clientId);return `<tr><td>${esc(c?.name||'—')}</td><td>${l.type==='flash'?'Flash':'Micro'}</td><td>${money(l.amount)}</td><td>${money(l.total)}</td><td><span class="badge ${l.status==='Aprobado'?'ok':l.status==='Rechazado'?'red':''}">${l.status}</span></td></tr>`}).join('')||'<tr><td colspan="5">No hay préstamos.</td></tr>';
 payLoan.innerHTML=loans.filter(l=>l.status==='Aprobado').map(l=>{let c=clients.find(x=>x.id===l.clientId);return `<option value="${l.id}">${esc(c?.name||'—')} — ${money(l.total)}</option>`}).join('');
 paymentTable.innerHTML=payments.map(p=>`<tr><td><b>${p.receipt}</b></td><td>${p.loanId.slice(0,8)}</td><td>${money(p.amount)}</td><td>${esc(p.method)}</td><td>${new Date(p.date).toLocaleString('es-DO')}</td></tr>`).join('')||'<tr><td colspan="5">No hay pagos.</td></tr>';
 approvalTable.innerHTML=loans.filter(l=>l.status==='Pendiente').map(l=>{let c=clients.find(x=>x.id===l.clientId);return `<tr><td>${l.id.slice(0,8)}</td><td>${esc(c?.name||'—')}</td><td>${money(l.amount)}</td><td><span class="badge">${l.status}</span></td><td><div class="actions"><button class="primary" onclick="approve('${l.id}',true)">Aprobar</button><button class="danger" onclick="approve('${l.id}',false)">Rechazar</button></div></td></tr>`}).join('')||'<tr><td colspan="5">No hay solicitudes pendientes.</td></tr>';
 calc();
}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
</script>
</body>
</html>
