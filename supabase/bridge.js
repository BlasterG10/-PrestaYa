// Presta Ya — production Supabase bridge (classic script)
// Injected after the existing V2 script so it can use its global state safely.
(async () => {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const supabase = createClient('https://qchzgjhbhnkxkmvebkgw.supabase.co','sb_publishable_P25yjBAHPfz4zaFzhTZKag_jknlwGKI',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  window.prestayaSupabase = supabase;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const roleName=r=>({admin:'Administrador',supervisor:'Supervisor',collector:'Cobrador',client:'Cliente',customer:'Cliente'}[r]||r);
  const statusName=s=>({active:'Activo',approved:'Aprobado',pending:'Pendiente',rejected:'Rechazado',completed:'Completado',defaulted:'En mora',cancelled:'Cancelado'}[s]||s);
  const paymentName=s=>({cash:'Efectivo',transfer:'Transferencia',zelle:'Zelle',other:'Otro'}[s]||s);
  async function profileFor(userId){const {data,error}=await supabase.from('profiles').select('id,full_name,role,phone,active').eq('id',userId).single();if(error)throw error;if(!data.active)throw new Error('La cuenta está desactivada.');return data;}
  async function syncData(){
    const [{data:cs,error:ce},{data:ls,error:le},{data:ps,error:pe}]=await Promise.all([
      supabase.from('customers').select('id,customer_number,profile_id,full_name,phone,status').order('customer_number'),
      supabase.from('loans').select('id,loan_number,customer_id,principal,total_due,status,created_at').order('created_at',{ascending:false}),
      supabase.from('payments').select('id,receipt_number,loan_id,amount,method,paid_at').order('paid_at',{ascending:false})
    ]);
    if(ce)throw ce;if(le)throw le;if(pe)throw pe;
    const byId=new Map((cs||[]).map(c=>[c.id,c]));const loanById=new Map((ls||[]).map(l=>[l.id,l]));
    const customerRows=(cs||[]).map(c=>[String(c.customer_number),c.full_name,c.phone||'',c.status==='active'?'Activo':c.status==='blocked'?'Bloqueado':'Inactivo']);
    const loanRows=(ls||[]).map(l=>{const c=byId.get(l.customer_id);return[String(l.loan_number),c?.full_name||'—',Number(l.principal||0),Number(l.total_due||l.principal||0),0,statusName(l.status),new Date(l.created_at).toLocaleDateString('es-DO')]});
    const paymentRows=(ps||[]).map(p=>{const l=loanById.get(p.loan_id);const c=l?byId.get(l.customer_id):null;return[p.receipt_number,c?.full_name||'—',l?String(l.loan_number):'—',Number(p.amount),paymentName(p.method),new Date(p.paid_at).toLocaleDateString('es-DO')]});
    if(typeof clients!=='undefined')clients.splice(0,clients.length,...customerRows);
    if(typeof loans!=='undefined')loans.splice(0,loans.length,...loanRows);
    if(typeof payments!=='undefined')payments.splice(0,payments.length,...paymentRows);
  }
  function errorBox(message){let b=document.getElementById('supabase-error');if(!b){b=document.createElement('div');b.id='supabase-error';b.style.cssText='margin-top:12px;padding:10px;border:1px solid #ffd2d6;background:#fff2f3;color:#a52d36;border-radius:11px;font-size:11px;font-weight:700';document.querySelector('.authcard')?.appendChild(b)}b.textContent=message;}
  async function openApp(user,profile){
    window.role=profile.role==='customer'?'client':profile.role;window.name=profile.full_name||user.email?.split('@')[0]||'Usuario';
    await syncData();document.getElementById('auth').classList.add('hide');document.getElementById('app').classList.remove('hide');document.getElementById('bottom').classList.remove('hide');
    document.getElementById('rolebox').innerHTML='<b>'+esc(roleName(window.role))+'</b>Sesión activa · acceso controlado';document.getElementById('user').innerHTML='<span class="av">'+esc(window.name.slice(0,2).toUpperCase())+'</span>'+esc(window.name);buildNav();render();
  }
  async function realLogin(){
    const email=document.getElementById('email')?.value.trim(),password=document.querySelector('#auth input[type="password"]')?.value||'';
    if(!email||!password)return errorBox('Escribe tu correo y contraseña.');const button=document.querySelector('#auth button.primary');if(button){button.disabled=true;button.textContent='Entrando…';}
    try{const {data,error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;const profile=await profileFor(data.user.id);await openApp(data.user,profile)}catch(e){errorBox(e?.message||'No fue posible iniciar sesión.')}finally{if(button){button.disabled=false;button.textContent='Iniciar sesión'}}
  }
  async function restore(){const {data:{session}}=await supabase.auth.getSession();if(!session?.user)return;try{const profile=await profileFor(session.user.id);await openApp(session.user,profile)}catch(e){await supabase.auth.signOut();errorBox('Tu sesión no tiene un perfil válido. Contacta al administrador.')}}
  window.addEventListener('DOMContentLoaded',async()=>{window.login=realLogin;document.getElementById('role')?.closest('.field')?.remove();const demo=document.querySelector('.demo');if(demo)demo.textContent='Autenticación protegida por Supabase Auth. El rol se obtiene de tu perfil.';const logout=document.querySelector('.logout');if(logout)logout.onclick=async()=>{await supabase.auth.signOut();location.reload()};await restore()});
})();
