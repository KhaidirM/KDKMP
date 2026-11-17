const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'assets/catalog.json'), 'utf8'));
const forms = new Map();
const sessions = new Map();
const audits = [];
const passwords = new Map(['pmo','manager','pengurus','guest'].map(role => [role, 'demo1234']));
const groups = catalog.map((g, i) => ({ kelompok_id:g.id, nama_kelompok:g.name, urutan:i+1, aktif:true }));
const items = catalog.flatMap(g => g.items.map(i => ({ item_id:i.item_id, kelompok_id:g.id, nama_item:i.name, urutan:i.order, jumlah_rencana:(String(i.target).match(/^\d+/)||[])[0] ? Number((String(i.target).match(/^\d+/)||[])[0]) : null, daftar_tipe:i.types||[], spesifikasi:{}, aktif:true })));
const coop = {nik:'1604010101001',kdkmp:'Koperasi Merah Putih',desa:'Merapi',kecamatan:'Merapi Barat',manager_name:'Manager Demo',pengurus_names:['Pengurus Demo'],items_total:96,items_rated:0,items_ready:0,items_missing:0,items_damaged:0,items_unchecked:0,items_below_plan:0,last_saved_at:null};

const readBody = req => new Promise((resolve,reject)=>{let b='';req.on('data',x=>b+=x);req.on('end',()=>{try{resolve(b?JSON.parse(b):{})}catch(e){reject(e)}})});
function send(res,status,value,type='application/json'){res.writeHead(status,{'content-type':type,'access-control-allow-origin':'*'});res.end(type==='application/json'?JSON.stringify(value):value)}
function audit(req,session,target,activity,entity){
  const f=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  audits.push({role:session.role,nik_pelaku:session.nik||null,nik_koperasi:target||null,aktivitas:activity,entitas:entity,ip_address:req.socket.remoteAddress||null,user_agent:req.headers['user-agent']||null,waktu:new Date().toISOString(),waktu_wib:f.format(new Date()),zona_waktu:'GMT+7'});
}
function dashboard(){
  const f=forms.get(coop.nik)||{items:[],groups:[]};let rated=0,missing=0,damaged=0,unchecked=0,ready=0,below=0;
  for(const x of f.items){if(x.keberadaan){rated++;if(x.keberadaan==='tidak_ada')missing++;const a=x.detail?.kondisi_jumlah||{};if(Number(a.rusak||x.jumlah_rusak||0)>0)damaged++;if(Number(a.belum_dicek||0)>0||x.kondisi==='belum_dicek')unchecked++;if(x.keberadaan==='ada'&&x.kondisi==='baik')ready++;}}
  const last=f.items.map(x=>x.diubah_pada).filter(Boolean).sort().at(-1)||null;
  return {generated_at:new Date().toISOString(),coops:[{...coop,items_rated:rated,items_missing:missing,items_damaged:damaged,items_unchecked:unchecked,items_ready:ready,items_below_plan:below,last_saved_at:last}],districts:[{kecamatan:coop.kecamatan,coop_count:1,coops_started:rated?1:0,completion_pct:Math.round(rated/96*100),items_total:96,items_rated:rated}],priorities:[],totals:{coop_count:1,district_count:1,items_total:96,items_rated:rated,items_scored:rated,items_unrated:96-rated,items_ready:ready,items_missing:missing,items_damaged:damaged,items_unchecked:unchecked,items_below_plan:below,items_attention:missing+damaged+unchecked,coops_not_started:rated?0:1,coops_started:rated?1:0,coops_complete:rated===96?1:0,coops_attention:missing+damaged+unchecked?1:0,last_saved_at:last}};
}
function profile(session,nik){
  const selected=String(nik||session.nik||'')===coop.nik?coop:null;
  return {role:session.role,operator_name:session.role==='pmo'?(session.nik==='1111'?'Khaidir':'Iqnabila'):session.role==='guest'?'Tamu':session.role==='manager'?coop.manager_name:coop.pengurus_names[0],manager_name:selected?.manager_name||null,pengurus_names:selected?.pengurus_names||[],nik:selected?.nik||null,desa:selected?.desa||null,kecamatan:selected?.kecamatan||null};
}

const server=http.createServer(async(req,res)=>{try{
  const u=new URL(req.url,'http://localhost');
  if(req.method==='OPTIONS'){res.writeHead(204,{'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'*'});return res.end();}
  if(u.pathname==='/supabase-config.js')return send(res,200,"window.KDKMP_SUPABASE={url:location.origin,publishableKey:'local-demo'};",'application/javascript');
  if(u.pathname.startsWith('/rest/v1/')){
    const route=u.pathname.split('/').pop();
    if(route==='sarpras_kelompok')return send(res,200,groups);
    if(route==='sarpras_katalog')return send(res,200,items);
    if(u.pathname.includes('/rpc/')){
      const name=route,b=await readBody(req);
      if(name==='kdmp_coop_picker')return send(res,200,[coop]);
      if(name==='kdmp_login'){
        const role=b.p_role,nik=role==='manager'||role==='pengurus'?b.p_nik:role==='pmo'?b.p_nik:null;
        if(!['manager','pengurus','pmo','guest'].includes(role)||b.p_pin!==passwords.get(role))return send(res,400,{message:'Login demo gagal. Gunakan kata sandi demo1234.'});
        if((role==='manager'||role==='pengurus')&&String(nik)!==coop.nik)return send(res,400,{message:'Gunakan NIK koperasi demo 1604010101001.'});
        if(role==='pmo'&&!['1111','2222'].includes(String(nik)))return send(res,400,{message:'Pilih identitas PMO 1111 atau 2222.'});
        const token=crypto.randomBytes(24).toString('hex'),session={role,nik:nik?String(nik):null};sessions.set(token,session);audit(req,session,session.nik,'login','app_sessions');
        return send(res,200,{token,role,nik:session.nik,operator_name:profile(session,session.nik).operator_name,coop_name:null});
      }
      const session=sessions.get(b.p_token);
      if(!session)return send(res,401,{message:'Sesi simulasi tidak valid. Masuk kembali.'});
      if(name==='kdmp_list_coops')return send(res,200,[{...coop,...dashboard().coops[0]}]);
      if(name==='kdmp_dashboard')return session.role==='pmo'?send(res,200,dashboard()):send(res,403,{message:'Ringkasan hanya tersedia untuk PMO.'});
      if(name==='kdmp_profile')return send(res,200,profile(session,b.p_nik));
      if(name==='kdmp_change_password'){
        if(passwords.get(session.role)!==b.p_current_password)return send(res,400,{message:'Kata sandi saat ini tidak sesuai.'});
        if(String(b.p_new_password||'').length<8)return send(res,400,{message:'Kata sandi baru minimal 8 karakter.'});
        passwords.set(session.role,b.p_new_password);audit(req,session,session.nik,'ganti_kata_sandi','app_role_pins');
        for(const [key,value] of sessions)if(value.role===session.role)sessions.delete(key);
        return send(res,200,{changed:true,sessions_invalidated:true});
      }
      if(name==='kdmp_load_form'){
        if(!String(b.p_nik||''))return send(res,400,{message:'Pilih koperasi.'});
        const f=forms.get(String(b.p_nik))||{items:[],groups:[]};return send(res,200,{items:f.items,groups:f.groups});
      }
      if(name==='kdmp_save_form'){
        if(session.role==='guest')return send(res,403,{message:'Sesi ini tidak dapat menyimpan.'});
        if(['manager','pengurus'].includes(session.role)&&String(session.nik)!==String(b.p_nik))return send(res,403,{message:'Tidak berhak mengubah koperasi ini.'});
        const now=new Date().toISOString(),rows=(b.p_rows||[]).map(x=>({...x,diubah_pada:now}));
        forms.set(String(b.p_nik),{items:rows,groups:b.p_groups||[]});audit(req,session,b.p_nik,'simpan','sarpras_isian');
        return send(res,200,{saved_rows:rows.length,saved_groups:(b.p_groups||[]).length,saved_at:now});
      }
      return send(res,404,{message:'RPC demo tidak ditemukan.'});
    }
  }
  const file=path.resolve(root,'.'+decodeURIComponent(u.pathname)),relative=path.relative(root,file);
  if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))return send(res,403,'Forbidden','text/plain');
  const target=u.pathname==='/'?path.join(root,'index.html'):file;
  if(!fs.existsSync(target)||!fs.statSync(target).isFile())return send(res,404,'Not found','text/plain');
  const ext=path.extname(target).toLowerCase(),types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png'};
  send(res,200,fs.readFileSync(target),types[ext]||'application/octet-stream');
}catch(e){send(res,500,{message:e.message});}});

const port=Number(process.env.KDMP_PORT||8012);
server.listen(port,'127.0.0.1',()=>console.log('KDKMP LOCAL DEMO at http://127.0.0.1:'+port+' — isolated mock, no Supabase requests or writes'));
