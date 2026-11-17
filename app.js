/* KDKMP Lahat · client application
 * No third-party runtime dependency. Reference assets stay on hosting;
 * only structured inventory data is sent to Supabase.
 */
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = (value) => new Intl.NumberFormat('id-ID').format(Number(value || 0));
const dateTime = (value) => value ? new Date(value).toLocaleString('id-ID', {dateStyle:'medium',timeStyle:'short'}) : 'Belum ada simpanan';
const cfg = window.KDKMP_SUPABASE;
const localDemo = cfg?.publishableKey === 'local-demo';
const role = sessionStorage.getItem('kdmp-role') || '';
const readOnly = role === 'guest';
const state = {
  live:false, error:'', catalog:[], allItems:[], coops:[], dashboard:null,
  activeNik:sessionStorage.getItem('kdmp-active-nik') || sessionStorage.getItem('kdmp-nik') || '',
  activeCoop:null, form:{items:{},groups:{},versions:{},groupVersions:{}},
  page:location.hash.slice(1) || 'summary', district:'all', village:'all',
  coopSearch:'', coopDistrict:'all', coopVillage:'all', coopPageSize:20, coopPage:1, summaryStatus:'all', summarySearch:'', itemFilter:'all', itemSearch:'',
  focusReturn:null, saving:false, resetKeyHandler:null
};
const token = () => sessionStorage.getItem('kdmp-token') || '';
const localKey = (nik) => 'kdmp-draft:' + nik + ':form-b';
const rpc = async (name, body) => {
  if (!cfg?.url || !cfg?.publishableKey) throw new Error('Konfigurasi server belum tersedia.');
  const res = await fetch(cfg.url + '/rest/v1/rpc/' + name, {
    method:'POST', headers:{apikey:cfg.publishableKey,'Content-Type':'application/json'},
    body:JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data.message || data.details || data.hint || 'Permintaan server gagal.';
    if (/sesi berakhir|session expired/i.test(message)) {
      sessionStorage.removeItem('kdmp-token');
      sessionStorage.removeItem('kdmp-role');
      sessionStorage.removeItem('kdmp-nik');
      sessionStorage.removeItem('kdmp-name');
      sessionStorage.removeItem('kdmp-coop-name');
      location.reload();
    }
    throw new Error(message);
  }
  return data;
};
const apiHeaders = () => ({apikey:cfg.publishableKey,'Content-Type':'application/json'});
const toast = (message, tone='') => {
  const node = $('#toast');
  if (!node) return;
  node.textContent = message;
  node.dataset.tone = tone;
  node.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove('show'), 3300);
};
function closeGroupDialog(modal,restoreFocus=true) {
  if(!modal||modal.hidden)return;
  const launcher=modal.closest('.group')?.querySelector('[data-group-open]');
  modal.hidden=true;
  launcher?.setAttribute('aria-expanded','false');
  document.body.classList.remove('group-modal-open');
  if(restoreFocus)launcher?.focus({preventScroll:true});
}
const roleLabel = ({pmo:'PMO',manager:'Manager',pengurus:'Pengurus',guest:'Tamu'}[role] || 'Pengguna');
const operatorName = sessionStorage.getItem('kdmp-name') || '';
const profileTitle = operatorName||roleLabel;
function shell() {
  $('#app').innerHTML =
    '<header class="appbar"><button class="brand" data-page="' + (role==='pmo'?'summary':'coops') + '" aria-label="Buka halaman utama">' +
      '<img src="./assets/logo-kdmp.svg" alt=""><span>KDKMP <i>Lahat</i></span></button>' +
      '<div class="bar-right"><span class="online" id="connection-label">● Menghubungkan…</span>' +
        '<span class="role-pill">' + esc(roleLabel) + '</span><button class="profile-trigger" data-page="profile" aria-label="Buka profil"><span class="avatar" aria-hidden="true">' + esc((operatorName || roleLabel).slice(0,1)) + '</span>' +
        '<span class="profile-info"><span class="profile-name">' + esc(profileTitle) + '</span><small class="profile-subtitle">Profil</small></span></button>' +
        '<button class="logout" id="logout">Keluar</button></div></header>' +
    '<div class="layout"><aside class="sidebar" aria-label="Navigasi utama">' +
      '<div class="side-label">Pemantauan</div>' +
      '<button class="nav ' + (role!=='pmo'?'nav-locked':'') + '" data-page="summary" aria-label="Ringkasan" ' + (role!=='pmo'?'disabled aria-disabled="true" title="Khusus PMO · Ringkasan"':'title="Ringkasan"') + '><span class="icon" aria-hidden="true">▦</span><span class="nav-label">Ringkasan</span></button>' +
      '<button class="nav" data-page="coops" aria-label="Koperasi" title="Koperasi"><span class="icon" aria-hidden="true">⌂</span><span class="nav-label">Koperasi</span></button>' +
      '<div class="side-label">Pendataan</div>' +
      '<button class="nav" data-page="sarpras" aria-label="Pendataan Sarpras" title="Pendataan Sarpras"><span class="icon" aria-hidden="true">☷</span><span class="nav-label">Pendataan Sarpras</span></button>' +
      '<button class="nav ' + (role!=='pmo'?'nav-locked':'') + '" data-page="export" aria-label="Ekspor Data" ' + (role!=='pmo'?'disabled aria-disabled="true" title="Khusus PMO · Ekspor Data"':'title="Ekspor Data"') + '><span class="icon" aria-hidden="true">⇩</span><span class="nav-label">Ekspor Data</span></button>' +
      '<div class="sidefoot" id="server-status">Menghubungkan ke server…</div></aside>' +
      '<main class="main" id="main"><section id="page-summary" class="page"></section>' +
      '<section id="page-coops" class="page hidden"></section><section id="page-sarpras" class="page hidden"></section>' +
      '<section id="page-export" class="page hidden"></section><section id="page-profile" class="page hidden"></section></main></div>' +
    '<div class="save hidden" id="savebar"><span id="save-label">Draft hanya di perangkat</span>' +
      '<button id="save" type="button">Simpan perubahan</button></div>' +
    '<div id="toast" class="toast" role="status" aria-live="polite"></div>';
  $('#logout').addEventListener('click', () => {
    ['kdmp-token','kdmp-role','kdmp-nik','kdmp-name','kdmp-coop-name','kdmp-active-nik'].forEach(k => sessionStorage.removeItem(k));
    location.reload();
  });
  // Keep the persistent shell navigation independent from page content. The
  // document-level handler below remains for buttons rendered into each page.
  $$('[data-page]', $('#app')).forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    navigateToPage(button.dataset.page);
  }));
}
function navigateToPage(page) {
  if(page==='sarpras'&&state.live){
    const own=['manager','pengurus'].includes(role)?String(sessionStorage.getItem('kdmp-nik')):state.activeNik;
    state.activeNik=own;
    currentCoop();
    loadCoopForm().then(()=>renderPage('sarpras')).catch(error=>{state.error=error.message;toast(error.message,'error');renderPage('sarpras');});
  } else renderPage(page);
}
function percent(n, d) { return d ? Math.round((Number(n || 0) / Number(d)) * 100) : 0; }
function getDraft() {
  if (!state.activeNik) return {items:{},groups:{},updatedAt:null,pending:false};
  try {
    const draft = JSON.parse(localStorage.getItem(localKey(state.activeNik)) || '{}');
    return {items:draft.items || {},groups:draft.groups || {},versions:draft.versions||{},groupVersions:draft.groupVersions||{},updatedAt:draft.updatedAt||null,pending:!!draft.pending};
  } catch (_) { return {items:{},groups:{},updatedAt:null,pending:false}; }
}
function setDraft() {
  if (!state.activeNik) return;
  localStorage.setItem(localKey(state.activeNik), JSON.stringify({
    items:state.form.items, groups:state.form.groups, versions:state.form.versions,
    groupVersions:state.form.groupVersions, updatedAt:new Date().toISOString(), pending:true
  }));
  $('#save-label').textContent = 'Draft tersimpan di perangkat · belum dikirim';
  const sync = $('#sync-state');
  if (sync) sync.innerHTML = '<b>● Draft tersimpan di perangkat</b><span>Perubahan akan dikirim setelah tombol Simpan ditekan.</span>';
}
function itemStats(items) {
  const result = {rated:0,ready:0,missing:0,damaged:0,unchecked:0,below:0,attention:0,unrated:0};
  items.forEach(item => {
    const v = state.form.items[item.id] || {};
    if (v.presence !== 'ada' && v.presence !== 'tidak_ada') { result.unrated++; return; }
    result.rated++;
    if (v.presence === 'tidak_ada') result.missing++;
    const tracksQuantity=(item.assessment||'').includes('Jumlah'),conditionQuantity=conditionQuantityItem(item);
    const allocation=conditionQuantity?normalizedAllocation(item,v):(v.allocation||{});
    const actual=conditionQuantity?allocationTotal(allocation):(v.actual===''||v.actual==null?0:Number(v.actual));
    if ((conditionQuantity?Number(allocation.rusak||0):Number(allocation.rusak||v.damaged||0)) > 0 || v.condition === 'rusak') result.damaged++;
    if (Number(allocation.belum_dicek || 0) > 0 || v.condition === 'belum_dicek') result.unchecked++;
    if (item.target != null && v.presence === 'ada' && tracksQuantity && actual < Number(item.target)) result.below++;
    const quantityOk=!tracksQuantity||(actual>0&&(item.target==null||actual>=Number(item.target)));
    const allGood=inventoryItem(item)?v.ketersediaan==='Tersedia':conditionQuantity?
      actual>0&&Number(allocation.baik||0)===actual&&!Number(allocation.rusak||0)&&!Number(allocation.belum_dicek||0):
      (!v.condition||v.condition==='baik')&&!Number(v.damaged||0);
    if(v.presence==='tidak_ada'||Number(allocation.rusak||0)>0||Number(allocation.belum_dicek||0)>0||v.condition==='rusak'||v.condition==='belum_dicek'||(item.target!=null&&tracksQuantity&&actual<Number(item.target)))result.attention++;
    if (v.presence === 'ada' && allGood && quantityOk) result.ready++;
  });
  return result;
}
function coopStats(coop) {
  return {
    rated:Number(coop.items_rated || 0), total:Number(coop.items_total || state.allItems.length),
    ready:Number(coop.items_ready || 0), missing:Number(coop.items_missing || 0),
    damaged:Number(coop.items_damaged || 0), unchecked:Number(coop.items_unchecked || 0),
    below:Number(coop.items_below_plan || 0), last:coop.last_saved_at || null
  };
}
function statusName(coop) {
  const s = coopStats(coop);
  if (!s.rated) return 'Belum mulai';
  if (s.rated >= s.total && s.ready >= s.total && !s.missing && !s.damaged && !s.unchecked && !s.below) return 'Siap';
  if (s.missing || s.damaged || s.unchecked || s.below) return 'Perlu perhatian';
  return 'Berjalan';
}
function coopName(coop) { const desa=coop?.desa||''; const kec=coop?.kecamatan||''; return desa ? 'KDKMP ' + desa + (kec?' · '+kec:'') : 'KDKMP (desa belum tercatat)'; }
function currentCoop() {
  state.activeCoop = state.coops.find(x => String(x.nik) === String(state.activeNik)) || state.coops[0] || null;
  if (state.activeCoop) {
    state.activeNik = String(state.activeCoop.nik);
    sessionStorage.setItem('kdmp-active-nik',state.activeNik);
  }
  return state.activeCoop;
}
function field(label,key,value,options,kind='select') {
  let input;const enabled=canEditActive()&&state.fieldPresence==='ada';
  if (kind === 'number') {
    input = '<input class="input" type="number" min="0" step="1" value="' + esc(value ?? '') +
      '" data-key="' + esc(state.fieldItem) + '" data-field="' + key + '" inputmode="numeric" ' + (enabled?'':'disabled') + '>';
  } else {
    input = '<select class="input" data-key="' + esc(state.fieldItem) + '" data-field="' + key + '">' +
      '<option value="">Pilih…</option>' + options.map(o => '<option value="' + esc(o.value ?? o) + '"' +
      ((value ?? '') === (o.value ?? o) ? ' selected' : '') + '>' + esc(o.label ?? o) + '</option>').join('') + '</select>';
    if(!enabled) input=input.replace('<select class="input"','<select class="input" disabled');
  }
  return '<label class="detail-field"><span>' + label + '</span>' + input + '</label>';
}
function canEditActive(){return role==='pmo'||(['manager','pengurus'].includes(role)&&String(state.activeNik)===String(sessionStorage.getItem('kdmp-nik')));}
function specialFields(item,v) {
  const name=item.name.toLowerCase(),assessment=item.assessment||'';
  const old=state.fieldItem,oldPresence=state.fieldPresence;
  state.fieldItem=item.id;state.fieldPresence=v.presence;
  let fields='';
  if (name.includes('sumber air')) {
    if(assessment.includes('Jenis sumber air'))fields += field('Jenis sumber air','jenis_air',v.jenis_air,['Sumur bor','Sumur warga','Sumur desa','PAM desa','PAMSIMAS','Aliran sungai','Lainnya']);
    if(assessment.includes('Terhubung ke instalasi'))fields += field('Terhubung ke instalasi air','terpasang',v.terpasang,['Ya','Tidak']);
  } else if (name.includes('pompa air')) {
    if(assessment.includes('Fungsi'))fields += field('Status fungsi','fungsi_pompa',v.fungsi_pompa,['Berfungsi','Belum dicek','Rusak']);
  } else if (name==='internet') {
    if(assessment.includes('Jenis koneksi'))fields += field('Jenis koneksi','jenis_koneksi',v.jenis_koneksi,['Fiber optik','Kabel','Modem seluler','Radio wireless','Lainnya']);
  } else if (name.includes('keran air') || name.includes('wastafel')) {
    if(assessment.includes('Aliran air'))fields += field('Aliran air','teraliri',v.teraliri,['Teraliri','Tidak teraliri','Belum dicek']);
  } else if (name==='wc' || name.startsWith('wc ')) {
    if(assessment.includes('Tipe WC'))fields += field('Tipe WC','tipe_wc',v.tipe_wc,['Jongkok','Duduk']);
    if(assessment.includes('Bidet'))fields += field('Bidet / jet washer','bidet',v.bidet,['Ada','Tidak ada']);
    if(assessment.includes('Terhubung septic tank'))fields += field('Terhubung septic tank','terhubung_septic',v.terhubung_septic,['Ya','Tidak']);
  } else if (name.includes('instalasi listrik')) {
    if(assessment.includes('Kelayakan'))fields += field('Kelayakan instalasi','layak',v.layak,['Layak','Tidak layak']);
    if(assessment.includes('Letak posisi'))fields += field('Letak posisi','lokasi_instalasi',v.lokasi_instalasi,['Di dalam gudang utama','Di luar gudang utama','Lainnya']);
  } else if (name==='mcb') {
    if(assessment.includes('Daya terpasang'))fields += field('Daya terpasang','daya_va',v.daya_va,['1.300','2.200','3.500','4.400','5.500','6.600','7.700','10.600','11.000','13.200','16.500','23.000','33.000','41.500','53.000','66.000','82.500','Lainnya']);
    if(assessment.includes('Daya terpasang')&&v.daya_va==='Lainnya')fields += field('Nominal daya (VA)','daya_va_lainnya',v.daya_va_lainnya,[],'number');
  } else if(name==='panel listrik') {
    if(assessment.includes('Letak posisi'))fields += field('Letak posisi','lokasi_instalasi',v.lokasi_instalasi,['Di dalam gudang utama','Di luar gudang utama','Lainnya']);
  } else if (name.includes('lampu') || name.includes('colokan')) {
    if(assessment.includes('Aliran listrik'))fields += field('Aliran listrik','teraliri',v.teraliri,['Ya','Tidak','Belum dicek']);
    if(name.includes('lampu')&&assessment.includes('Saklar'))fields += field('Saklar','saklar',v.saklar,['Ada','Tidak ada']);
  }
  state.fieldItem=old;state.fieldPresence=oldPresence;
  return fields ? '<div class="detail-fields presence-dependent' + (v.presence==='ada'?'':' hidden') + '">' + fields + '</div>' : '';
}
function hasSpecs(item) {
  return !!(item.images?.files?.length || item.spec?.default || Object.keys(item.spec?.variants || {}).length);
}
const conditionKeys=['baik','rusak','belum_dicek'];
function inventoryItem(item) { return ['struk','thermal label'].includes(item.name.toLowerCase()); }
function conditionQuantityItem(item) {
  const assessment=item.assessment||'';
  return assessment.includes('Jumlah')&&!inventoryItem(item)&&
    (assessment.includes('Kondisi')||assessment.includes('Fungsi')||assessment.includes('Status berfungsi'));
}
function hasConditionCounts(item) {
  return !inventoryItem(item) && /Kondisi|Fungsi|Status berfungsi/.test(item?.assessment||'');
}
function normalizedAllocation(item,v) {
  const source=v.allocation||v.kondisi_jumlah||{},result={baik:0,rusak:0,belum_dicek:0};
  conditionKeys.forEach(key=>{const n=Number(source[key]);result[key]=Number.isFinite(n)&&n>=0?n:0;});
  const total=conditionKeys.reduce((sum,key)=>sum+result[key],0);
  const legacyActual=Number(v.actual);
  if(v.condition&&total===0&&(legacyActual>0||(Number(item.target)===1&&(v.actual==null||v.actual===''))))
    result[v.condition]=legacyActual>0?legacyActual:1;
  return result;
}
function allocationTotal(allocation) { return conditionKeys.reduce((sum,key)=>sum+(Number(allocation[key])||0),0); }
function isConditionSelected(v,allocation,key) {
  return !!v.condition_choices?.[key]||Number(allocation[key])>0||v.condition===key;
}
function updateConditionQuantity(item,v) {
  if(!conditionQuantityItem(item))return normalizedAllocation(item,v);
  v.allocation=normalizedAllocation(item,v);
  v.condition_choices=v.condition_choices||{};
  if(v.presence==='ada') {
    v.actual=allocationTotal(v.allocation);
    v.damaged=Number(v.allocation.rusak)||0;
    v.condition=conditionKeys.find(key=>v.condition_choices[key]||Number(v.allocation[key])>0)||'';
  }
  return v.allocation;
}
function syncConditionQuantities(row,item,v) {
  const allocation=conditionQuantityItem(item)?updateConditionQuantity(item,v):normalizedAllocation(item,v);
  row.querySelectorAll('.quantity-input[data-field^="allocation-"]').forEach(input=>{
    const parts=input.dataset.field.split('-'),key=parts[1];
    const choice=row.querySelector('[data-field="allocation-'+key+'"]');
    const selected=!!choice?.checked||isConditionSelected(v,allocation,key);
    input.value=String(allocation[key]??0);
    input.classList.toggle('hidden',!selected);
    input.disabled=!canEditActive()||v.presence!=='ada';
  });
  const total=row.querySelector('[data-field="actual"]');
  if(total&&conditionQuantityItem(item))total.value=String(v.actual??0);
}
function syncPresenceUI(row,item,v) {
  const present=v.presence==='ada';
  if(present&&conditionQuantityItem(item))updateConditionQuantity(item,v);
  if(present&&inventoryItem(item)&&(item.assessment||'').includes('Jumlah')&&(v.actual==null||v.actual===''))v.actual=0;
  row.querySelectorAll('.presence-dependent').forEach(node=>node.classList.toggle('hidden',!present));
  row.querySelectorAll('.presence-dependent input,.presence-dependent select,.presence-dependent textarea').forEach(control=>{
    control.disabled=!canEditActive()||!present;
  });
  syncConditionQuantities(row,item,v);
}
function itemRow(item, number) {
  const v=state.form.items[item.id] || {};
  const allocation=normalizedAllocation(item,v);
  const lowerName=item.name.toLowerCase(),assessment=item.assessment||'';
  const inventoryOnly=inventoryItem(item),serviceItem=lowerName==='internet'||lowerName.includes('perangkat lunak kasir');
  const showType=assessment.includes('Tipe/Jenis')&&(item.types||[]).length>1;
  const showImage=assessment.includes('Gambar');
  const showCondition=assessment.includes('Kondisi')||assessment.includes('Fungsi')||assessment.includes('Status berfungsi');
  const showQuantity=assessment.includes('Jumlah');
  const singleUnit=Number(item.target)===1;
  const oneCondition=singleUnit||!showQuantity||serviceItem;
  const showNote=assessment.includes('Catatan');
  const conditionQuantity=conditionQuantityItem(item);
  const editable=canEditActive();
  const conditionDisabled=!editable || v.presence !== 'ada';
  const conditionLabel=['internet','perangkat lunak kasir'].some(x=>lowerName.includes(x))?'Status berfungsi':'Kondisi';
  const conditionHidden=v.presence==='ada'?'':' hidden';
  const typeOptions=(item.types || []).map(t => '<option value="' + esc(t) + '"' + (v.type === t?' selected':'') + '>' + esc(t) + '</option>').join('');
  const visibleImage=showImage&&hasSpecs(item);
  const targetLabel=item.targetLabel || (item.target==null?'—':fmt(item.target)+' unit');
  const actualDisplay=conditionQuantity?allocationTotal(allocation):(v.actual==null||v.actual===''?0:v.actual);
  return '<article class="item-card" data-name="' + esc(item.name.toLowerCase()) + '" data-item-id="' + esc(item.id) + '">' +
    '<div class="item-main"><div class="item-info"><span class="item-number">' + number + '</span><button class="item-title-toggle" type="button" aria-expanded="true" aria-label="Lipat isian ' + esc(item.name) + '"><span class="item-title-line"><strong>' + esc(item.name) +
      '</strong><span class="item-fold-mark" aria-hidden="true"><svg viewBox="0 0 20 20"><path class="fold-horizontal" d="M5 10h10"/><path class="fold-vertical" d="M10 5v10"/></svg></span></span><small>Rencana: ' + esc(targetLabel) + '</small></button></div><div class="item-controls">' +
    '<label class="control presence-control"><span>Keberadaan</span><select class="input" data-key="' + esc(item.id) + '" data-field="presence" ' + (!editable?'disabled':'') + '>' +
      '<option value="">Belum dinilai</option><option value="ada"' + (v.presence==='ada'?' selected':'') + '>Ada</option>' +
      '<option value="tidak_ada"' + (v.presence==='tidak_ada'?' selected':'') + '>Tidak Ada</option></select></label><div class="item-quick-fields">' +
    (showType?'<label class="control presence-dependent quick-type' + conditionHidden + '"><span>Tipe / Jenis</span><select class="input" data-key="' + esc(item.id) + '" data-field="type" ' + (!editable||v.presence!=='ada'?'disabled':'') + '><option value="">Pilih tipe</option>' + typeOptions + '</select></label>':'') +
    (showImage?'<button class="view quick-image presence-dependent' + conditionHidden + '" type="button" data-media-key="' + esc(item.id) + '" ' + (!visibleImage?'disabled':'') +
      ' aria-label="' + (visibleImage?'Lihat gambar dan spesifikasi ':'Gambar dan spesifikasi belum tersedia untuk ') + esc(item.name) + '" title="' +
      (visibleImage?'Lihat gambar dan spesifikasi':'Gambar dan spesifikasi belum tersedia') + '"><svg class="eye-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg><small>Gambar/spek</small></button>':'') +
    '</div></div></div><div class="item-fields">' +
    (inventoryOnly?'<label class="control presence-dependent' + conditionHidden + '"><span>Ketersediaan</span><select class="input" data-key="'+esc(item.id)+'" data-field="ketersediaan" '+(conditionDisabled?'disabled':'')+'><option value="">Pilih…</option>'+['Tersedia','Tidak tersedia'].map(x=>'<option'+(v.ketersediaan===x?' selected':'')+'>'+x+'</option>').join('')+'</select></label>' +
      (showQuantity?'<label class="control presence-dependent' + conditionHidden + '"><span>Jumlah aktual</span><input class="input" type="number" min="0" step="1" inputmode="numeric" value="' + esc(actualDisplay) + '" data-key="' + esc(item.id) + '" data-field="actual" ' + (conditionDisabled?'disabled':'') + '></label>':''):'') +
    (!inventoryOnly&&showCondition?'<div class="condition-allocation presence-dependent' + conditionHidden + (serviceItem?' service-condition':'') + '" data-condition-control><div class="condition-heading"><span>' + conditionLabel + '</span><small class="allocation-hint hidden" data-allocation-hint></small></div><div class="condition-options">' +
      [['baik',conditionLabel==='Kondisi'?'Baik':'Berfungsi'],['rusak','Rusak'],['belum_dicek','Belum dicek']].map(([key,label])=>{const selected=isConditionSelected(v,allocation,key);return '<label class="condition-chip condition-'+key+'"><input type="'+(oneCondition?'radio':'checkbox')+'" '+(oneCondition?'name="condition-'+esc(item.id)+'"':'')+' data-key="'+esc(item.id)+'" data-field="allocation-'+key+'" '+(selected?'checked':'')+' '+(conditionDisabled?'disabled':'')+' aria-label="Pilih kondisi '+label+' untuk '+esc(item.name)+'"><span>'+label+'</span>'+(showQuantity&&!serviceItem?'<input class="input quantity-input condition-quantity'+(selected?'':' hidden')+'" type="number" min="0" max="'+(singleUnit?'1':'')+'" step="1" inputmode="numeric" aria-label="Jumlah '+label+'" data-key="'+esc(item.id)+'" data-field="allocation-'+key+'-count" value="'+esc(allocation[key])+'" '+(conditionDisabled?'disabled':'')+(singleUnit?' readonly':'')+'>':'')+'</label>';}).join('')+'</div></div>':'') +
    (!serviceItem&&!inventoryOnly&&showQuantity?'<label class="control presence-dependent' + conditionHidden + '"><span>Jumlah aktual</span><input class="input" type="number" min="0" step="1" inputmode="numeric" value="' + esc(actualDisplay) + '" data-key="' + esc(item.id) + '" data-field="actual" ' + (conditionQuantity?'readonly ':'') + (!editable||v.presence!=='ada'?'disabled':'') + '></label>':'') +
    specialFields(item,v) +
    (showNote?'<label class="note-field' + (v.condition==='rusak'?' note-damaged':'') + '"><span>Catatan' + ((Number(v.allocation?.rusak)||Number(v.damaged)||0)>0?' · Wajib':'') + '</span><textarea maxlength="800" rows="2" data-key="' + esc(item.id) + '" data-field="note" ' + (!editable?'disabled':'') +
      ' placeholder="catatan">' + esc(v.note || '') + '</textarea>' +
      '<small class="field-reminder note-hint hidden" data-note-hint></small></label>':'') + '</div></article>';
}
function groupSection(group,index) {
  const items=group.items;
  const stats=itemStats(items);
  const assessment=state.form.groups[group.id] || '';
  const dialogId='group-dialog-'+group.id;
  return '<section class="group" data-group="' + esc(group.id) + '"><button class="card group-launch" type="button" data-group-open="' + esc(group.id) + '" aria-haspopup="dialog" aria-expanded="false" aria-controls="' + esc(dialogId) + '">' +
    '<span class="num">' + String(index+1).padStart(2,'0') + '</span><span class="group-title"><strong>' + esc(group.name) + '</strong><small>' + items.length + ' item · ' + stats.rated + ' sudah dinilai</small></span>' +
    '<span class="group-progress">' + stats.rated + '/' + items.length + ' dinilai</span><span class="group-open-hint">Buka grup <span aria-hidden="true">↗</span></span></button>' +
    '<div class="group-modal" data-group-modal="' + esc(group.id) + '" hidden><section class="group-dialog" id="' + esc(dialogId) + '" role="dialog" aria-modal="true" aria-labelledby="' + esc(dialogId) + '-title" tabindex="-1">' +
    '<header class="group-dialog-head"><div class="group-dialog-heading"><span class="num">' + String(index+1).padStart(2,'0') + '</span><div class="group-title"><h2 id="' + esc(dialogId) + '-title">' + esc(group.name) + '</h2><small>' + items.length + ' item · ' + stats.rated + ' sudah dinilai</small></div></div>' +
    '<label class="group-assessment"><span>Status kelompok</span><select class="input" data-group-key="' + esc(group.id) + '" ' + (!canEditActive()?'disabled':'') + '>' +
      '<option value="">Belum dinilai</option><option value="ada"' + (assessment==='ada'?' selected':'') + '>Ada</option>' +
      '<option value="tidak_ada"' + (assessment==='tidak_ada'?' selected':'') + '>Tidak Ada</option>' +
      '<option value="custom"' + (assessment==='custom'?' selected':'') + '>Sebagian</option></select></label>' +
    (canEditActive()?'<button class="btn primary group-save" type="button" data-group-save>Simpan</button>':'') +
    '<button class="group-close" type="button" data-group-close aria-label="Tutup grup">Tutup <span aria-hidden="true">×</span></button></header>' +
    '<div class="group-dialog-body"><div class="group-items">' + items.map((item,i)=>itemRow(item, item.formNo || (index+1)+'.'+(i+1))).join('') + '</div></div></section></div></section>';
}
function formStatsMarkup(stats) {
  return '<div class="formmetrics">' +
    '<div class="card"><small>Kelengkapan</small><b id="metric-rated">' + stats.rated + ' / ' + state.allItems.length + '</b></div>' +
    '<div class="card"><small>Siap</small><b id="metric-ready">' + stats.ready + '</b></div>' +
    '<div class="card"><small>Perlu perhatian</small><b id="metric-attention">' + stats.attention + '</b></div>' +
    '<div class="card"><small>Belum dinilai</small><b id="metric-unrated">' + stats.unrated + '</b></div></div>';
}
function summaryPage() {
  const d=state.dashboard;
  if (!d) return errorPanel(state.error || 'Ringkasan sedang dimuat…');
  const coops=filteredSummaryCoops();
  const t=summaryTotals(coops);
  const districts=d.districts || [];
  const priorities=summaryPriorities(coops);
  const rows=coops.slice(0,8).map(coopSummaryTableRow).join('');
  const districtRows=districts.filter(x=>state.district==='all'||x.kecamatan===state.district)
    .sort((a,b)=>Number(b.completion_pct||0)-Number(a.completion_pct||0)).slice(0,8).map(x =>
      '<div class="district-row"><span>' + esc(x.kecamatan || 'Belum diketahui') + '</span><div class="track"><i style="width:' + percent(x.items_rated,x.items_total) + '%"></i></div>' +
      '<b>' + percent(x.items_rated,x.items_total) + '%</b><small>' + fmt(x.coops_started) + '/' + fmt(x.coop_count) + ' mulai</small></div>').join('');
  return '<div class="heading"><div><span class="eyebrow">PEMANTAUAN KABUPATEN</span><h1>Ringkasan pendataan</h1><div class="muted">Data dihitung dari isian yang tersimpan di server. Terakhir diperbarui ' + esc(dateTime(d.generated_at)) + '.</div></div>' +
    '<div class="actions"><select class="input" id="summary-district"><option value="all">Semua kecamatan</option>' +
      (d.districts||[]).map(x=>'<option value="' + esc(x.kecamatan) + '"' + (state.district===x.kecamatan?' selected':'') + '>' + esc(x.kecamatan) + '</option>').join('') +
      '</select><select class="input" id="summary-village"><option value="all">Semua desa</option>' +
      [...new Set(state.coops.filter(c=>state.district==='all'||c.kecamatan===state.district).map(c=>c.desa).filter(Boolean))].sort().map(x=>'<option value="' + esc(x) + '"' + (state.village===x?' selected':'') + '>' + esc(x) + '</option>').join('') +
      '</select><select class="input" id="summary-status"><option value="all">Semua status</option>' +
      ['Belum mulai','Berjalan','Perlu perhatian','Siap'].map(x=>'<option value="' + x + '"' + (state.summaryStatus===x?' selected':'') + '>' + x + '</option>').join('') +
      '</select><input class="input summary-search" id="summary-search" type="search" value="' + esc(state.summarySearch) + '" placeholder="Cari koperasi / NIK">' +
      '<button class="btn primary" data-page="export">↓ Ekspor data</button></div></div>' +
    '<div class="card context"><div><strong>Seluruh wilayah kerja</strong><small>' + fmt(t.coop_count) + ' KDKMP · ' + fmt(t.district_count) + ' kecamatan · ' +
      fmt(t.items_total) + ' peluang penilaian item · katalog ' + state.allItems.length + ' item</small></div><span class="chip">' + esc(roleLabel) + '</span></div>' +
    '<div class="metrics">' +
      metric('Kelengkapan pendataan',percent(t.items_rated,t.items_total)+'%',fmt(t.items_rated)+' dari '+fmt(t.items_total)+' item sudah dinilai','blue') +
      metric('Item siap',fmt(t.items_ready),fmt(t.items_scored)+' item sudah dinilai','green') +
      metric('Perlu perhatian',fmt(t.items_attention),fmt(t.coops_attention)+' koperasi memiliki temuan','gold') +
      metric('Belum mulai',fmt(t.coops_not_started),fmt(t.coops_started)+' koperasi sudah memiliki isian','violet') +
    '</div><div class="summary-kpis">' +
      '<article class="card summary-card"><div class="panelhead"><div><strong>Komposisi status item</strong><small class="block-muted">Penyebut hanya item yang sudah dinilai</small></div></div><div class="panelbody">' +
        statusBar('Siap',t.items_ready,t.items_scored,'green') + statusBar('Tidak Ada',t.items_missing,t.items_scored,'red') +
        statusBar('Rusak',t.items_damaged,t.items_scored,'gold') + statusBar('Belum dicek',t.items_unchecked,t.items_scored,'violet') +
        '<div class="summary-unrated">Belum dinilai <b>' + fmt(t.items_unrated) + '</b> item</div></div></article>' +
      '<article class="card summary-card"><div class="panelhead"><div><strong>Temuan prioritas</strong><small class="block-muted">Jumlah temuan pada isian yang disimpan</small></div>' +
        '<button class="btn small" data-page="coops">Buka daftar koperasi →</button></div><div class="panelbody">' +
        priorityRows(priorities) + '</div></article></div>' +
    '<div class="summary-kpis">' +
      '<article class="card summary-card"><div class="panelhead"><div><strong>Progres per kecamatan</strong><small class="block-muted">Kelengkapan item rata-rata</small></div></div>' +
        '<div class="panelbody district-list">' + (districtRows || '<div class="empty">Belum ada data kecamatan.</div>') + '</div></article>' +
      '<article class="card summary-card"><div class="panelhead"><div><strong>Aktivitas pendataan</strong><small class="block-muted">Waktu penyimpanan terbaru yang tercatat</small></div></div>' +
        '<div class="panelbody activity"><div><b>' + fmt(t.coops_started) + '</b><small>Koperasi mulai mengisi</small></div>' +
        '<div><b>' + fmt(t.coops_complete) + '</b><small>Lengkap dinilai</small></div>' +
        '<div><b>' + fmt(t.items_rated) + '</b><small>Item sudah dinilai</small></div>' +
        '<div><b>' + esc(dateTime(t.last_saved_at)) + '</b><small>Simpan terbaru</small></div></div></article></div>' +
    '<section class="card table"><div class="panelhead"><div><strong>Daftar koperasi</strong><small class="block-muted">Menampilkan hingga delapan koperasi sesuai filter ringkasan.</small></div>' +
      '<button class="btn" data-page="coops">Lihat semua koperasi →</button></div><table><thead><tr><th>Koperasi / NIK</th><th>Kelengkapan</th><th>Siap / dinilai</th><th>Temuan</th><th>Status</th><th></th></tr></thead><tbody>' + (rows || '<tr><td colspan="6" class="empty">Tidak ada data pada filter ini.</td></tr>') + '</tbody></table></section>';
}
function metric(title,value,foot,tone) {
  return '<div class="metric metric-' + tone + '"><label>' + title + '</label><b>' + value + '</b><small>' + foot + '</small></div>';
}
function statusBar(label,value,total,tone) {
  return '<div class="barrow"><span>' + label + '</span><div class="track"><i class="fill-' + tone + '" style="width:' + percent(value,total) + '%"></i></div><b>' +
    fmt(value) + ' <small>(' + percent(value,total) + '%)</small></b></div>';
}
function priorityRows(rows) {
  const map={missing:['Tidak Ada','red','×'],damaged:['Rusak','gold','!'],unchecked:['Belum dicek','violet','◷'],below:['Di bawah rencana','blue','↓']};
  return ['missing','damaged','unchecked','below'].map(key => {
    const p=rows.find(x=>x.kind===key) || {count:0,coops:0};
    const x=map[key];
    return '<div class="finding"><span class="ficon tone-' + x[1] + '">' + x[2] + '</span><div><b>' + x[0] + '</b><small>' +
      fmt(p.coops) + ' koperasi terdampak</small></div><span class="count">' + fmt(p.count) + '</span></div>';
  }).join('');
}
function coopSummaryTableRow(c) {
  const s=coopStats(c), problems=Number(c.items_attention ?? (s.missing+s.damaged+s.unchecked+s.below));
  const status=statusName(c), cls=status==='Siap'?'ok':status==='Belum mulai'?'neutral':'';
  return '<tr><td><b>' + esc(coopName(c)) + '</b><small>NIK ' + esc(c.nik) + '</small></td>' +
    '<td><div class="cell-progress"><span>' + fmt(s.rated) + ' / ' + fmt(s.total) + '</span><i><b style="width:' + percent(s.rated,s.total) + '%"></b></i></div></td>' +
    '<td>' + fmt(s.ready) + ' / ' + fmt(s.rated) + '</td><td>' + fmt(problems) + '</td>' +
    '<td><span class="status ' + cls + '">' + esc(status) + '</span></td><td><button class="btn small" data-open-coop data-nik="' +
    esc(c.nik) + '">Detail</button></td></tr>';
}
function coopTableRow(c) {
  const s=coopStats(c), problems=Number(c.items_attention ?? (s.missing+s.damaged+s.unchecked+s.below));
  return '<tr><td class="coop-nik">' + esc(c.nik) + '</td><td>' + esc(c.desa||'—') + '</td><td>' + esc(c.kecamatan||'—') + '</td>' +
    '<td><div class="cell-progress"><span>' + fmt(s.rated) + ' / ' + fmt(s.total) + '</span><i><b style="width:' + percent(s.rated,s.total) + '%"></b></i></div></td>' +
    '<td>' + fmt(s.ready) + ' / ' + fmt(s.rated) + '</td><td>' + fmt(problems) + '</td>' +
    '<td><button class="btn small" data-open-coop data-nik="' +
    esc(c.nik) + '">Detail</button></td></tr>';
}
function filteredSummaryCoops() {
  return state.coops.filter(c => (coopName(c)+' '+c.nik+' '+(c.desa||'')+' '+(c.kecamatan||'')).toLowerCase().includes(state.summarySearch.toLowerCase()) &&
    (state.district==='all' || c.kecamatan===state.district) &&
    (state.village==='all' || c.desa===state.village) &&
    (state.summaryStatus==='all' || statusName(c)===state.summaryStatus));
}
function filteredCoops() {
  const query=state.coopSearch.trim().toLowerCase();
  return state.coops.filter(c=>
    (!query || (coopName(c)+' '+c.nik+' '+(c.desa||'')+' '+(c.kecamatan||'')).toLowerCase().includes(query)) &&
    (state.coopDistrict==='all'||c.kecamatan===state.coopDistrict) &&
    (state.coopVillage==='all'||c.desa===state.coopVillage)
  );
}
function summaryTotals(coops) {
  const totals={coop_count:coops.length,district_count:new Set(coops.map(c=>c.kecamatan).filter(Boolean)).size,
    items_total:0,items_rated:0,items_ready:0,items_missing:0,items_damaged:0,items_unchecked:0,
    items_below_plan:0,coops_not_started:0,coops_started:0,coops_complete:0,coops_attention:0,last_saved_at:null};
  coops.forEach(c=>{
    const s=coopStats(c),problem=Number(c.items_attention ?? (s.missing+s.damaged+s.unchecked+s.below));
    totals.items_total+=s.total;totals.items_rated+=s.rated;totals.items_ready+=s.ready;
    totals.items_missing+=s.missing;totals.items_damaged+=s.damaged;totals.items_unchecked+=s.unchecked;
    totals.items_below_plan+=s.below;totals.coops_not_started+=s.rated===0?1:0;
    totals.coops_started+=s.rated>0?1:0;totals.coops_complete+=s.rated>=s.total?1:0;
    totals.coops_attention+=problem>0?1:0;
    if(s.last && (!totals.last_saved_at || s.last>totals.last_saved_at))totals.last_saved_at=s.last;
  });
  totals.items_scored=totals.items_rated;totals.items_unrated=Math.max(0,totals.items_total-totals.items_rated);
  totals.items_attention=coops.reduce((sum,c)=>sum+Number(c.items_attention ?? (Number(c.items_missing||0)+Number(c.items_damaged||0)+Number(c.items_unchecked||0)+Number(c.items_below_plan||0))),0);
  return totals;
}
function summaryPriorities(coops) {
  return [['missing','missing'],['damaged','damaged'],['unchecked','unchecked'],['below','below']].map(([kind,key])=>
    ({kind,count:coops.reduce((n,c)=>n+coopStats(c)[key],0),coops:coops.filter(c=>coopStats(c)[key]>0).length}));
}
function coopsPage() {
  if(!state.coops.length&&!state.live) return errorPanel(state.error || 'Koneksi ke data koperasi belum tersedia.');
  const districts=[...new Set(state.coops.map(c=>c.kecamatan).filter(Boolean))].sort();
  const villages=[...new Set(state.coops.filter(c=>state.coopDistrict==='all'||c.kecamatan===state.coopDistrict).map(c=>c.desa).filter(Boolean))].sort();
  const filtered=filteredCoops();
  const pages=state.coopPageSize==='all'?1:Math.max(1,Math.ceil(filtered.length/Number(state.coopPageSize)));
  state.coopPage=Math.min(state.coopPage,pages);
  const shown=state.coopPageSize==='all'?filtered:filtered.slice((state.coopPage-1)*Number(state.coopPageSize),state.coopPage*Number(state.coopPageSize));
  const rows=shown.map(coopTableRow).join('');
  return '<div class="heading"><div><span class="eyebrow">DATA WILAYAH</span><h1>Daftar koperasi</h1><div class="muted">Pilih kecamatan, lalu desa jika ingin mempersempit daftar.</div></div>' +
    (role==='pmo'?'<button class="btn primary" data-page="export">↓ Ekspor</button>':'') + '</div><div class="coop-tools">' +
    '<select class="input" id="coop-district" aria-label="Pilih kecamatan"><option value="all">Semua kecamatan</option>' + districts.map(x=>'<option value="' + esc(x) + '"' + (state.coopDistrict===x?' selected':'') + '>' + esc(x) + '</option>').join('') + '</select>' +
    '<select class="input" id="coop-village" aria-label="Pilih desa" ' + (state.coopDistrict==='all'?'disabled':'') + '><option value="all">' + (state.coopDistrict==='all'?'Pilih kecamatan dulu':'Semua desa') + '</option>' + villages.map(x=>'<option value="' + esc(x) + '"' + (state.coopVillage===x?' selected':'') + '>' + esc(x) + '</option>').join('') + '</select>' +
    '<div class="coop-search-wrap"><button class="btn coop-search-toggle" id="coop-search-toggle" type="button" aria-label="Tampilkan pencarian" aria-expanded="' + (!!state.coopSearch) + '" title="Cari nama, desa, atau NIK"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.4"></circle><path d="m16 16 4.2 4.2"></path></svg></button><input id="coop-search" class="input" type="search" value="' + esc(state.coopSearch) + '" placeholder="Cari nama, desa, atau NIK" ' + (state.coopSearch?'':'hidden') + '></div>' +
    '<label class="page-size">Tampilkan <select class="input" id="coop-page-size"><option value="20"' + (state.coopPageSize===20?' selected':'') + '>20</option><option value="50"' + (state.coopPageSize===50?' selected':'') + '>50</option><option value="100"' + (state.coopPageSize===100?' selected':'') + '>100</option><option value="all"' + (state.coopPageSize==='all'?' selected':'') + '>Semua</option></select></label>' +
    '<span class="muted" id="coop-count">' + fmt(filtered.length) + ' dari ' + fmt(state.coops.length) + ' koperasi</span></div>' +
    '<section class="card table coop-table"><table><thead><tr><th>NIK</th><th>Desa</th><th>Kecamatan</th><th>Kelengkapan</th><th>Siap / dinilai</th><th>Temuan</th><th></th></tr></thead><tbody id="coop-rows">' +
      (rows || '<tr><td colspan="7" class="empty">Tidak ada koperasi yang cocok.</td></tr>') + '</tbody></table></section>' +
    '<div class="pagination"><button class="btn" id="coop-prev" ' + (state.coopPage<=1?'disabled':'') + '>← Sebelumnya</button><span id="coop-page-label">Halaman ' + state.coopPage + ' dari ' + pages + '</span><button class="btn" id="coop-next" ' + (state.coopPage>=pages?'disabled':'') + '>Berikutnya →</button></div>';
}
function exportPage() {
  const isPmo=role==='pmo' || role==='guest';
  const coopOptions=state.coops.map(c => '<option value="' + esc(c.nik) + '"' + (c.nik===state.activeNik?' selected':'') + '>' +
    esc(coopName(c) + ' · ' + (c.desa || '') + ' · NIK ' + c.nik) + '</option>').join('');
  return '<div class="heading"><div><span class="eyebrow">LAPORAN</span><h1>Ekspor data</h1><div class="muted">Unduh CSV berformat UTF-8 yang dapat dibuka di Microsoft Excel atau LibreOffice.</div></div></div>' +
    '<div class="export-grid"><article class="card export-card"><div class="export-icon">▤</div><h2>Ringkasan koperasi</h2><p>Progress dan jumlah temuan per koperasi mengikuti filter saat ini.</p>' +
      '<button class="btn primary" id="export-summary">Unduh ringkasan CSV</button><small>Termasuk kecamatan, desa, kelengkapan, status, jumlah temuan, dan waktu simpan.</small></article>' +
    '<article class="card export-card"><div class="export-icon">☷</div><h2>Detail sarana-prasarana</h2><p>Seluruh item dan detail isian dari satu koperasi, beserta tipe dan catatan lapangan.</p>' +
      '<label class="export-select">Koperasi<select class="input" id="export-nik">' + coopOptions + '</select></label>' +
      '<button class="btn primary" id="export-detail">Unduh detail CSV</button><small>' + (isPmo?'Pilih satu koperasi. Ekspor seluruh kabupaten dapat dilakukan melalui ringkasan.':'Ekspor hanya tersedia untuk koperasi dalam cakupan akun.') + '</small></article></div>' +
    '<div class="card export-note"><strong>Catatan data</strong><p>Gambar dan aset tidak dimasukkan ke CSV; file gambar tetap berada di folder aset hosting. Spesifikasi katalog ikut tersedia di panel detail aplikasi.</p></div>';
}
function sarprasPage() {
  const coop=currentCoop();
  if (!coop) return errorPanel('Pilih koperasi dari daftar sebelum membuka Form B.', 'coops');
  const stats=itemStats(state.allItems);
  const groupMarkup=state.catalog.map(groupSection).join('');
  const draft=getDraft();
  const pending=!!(draft.updatedAt || draft.pending);
  return '<div class="heading"><div><span class="eyebrow">PRA-VERVAL · FORM B</span><h1>Pendataan sarana-prasarana</h1><div class="muted">' +
    esc(coopName(coop)) + ' · NIK ' + esc(coop.nik) + '</div></div>' +
    '<button class="btn" data-page="coops">Ganti koperasi</button></div>' +
    '<div class="card context"><div><strong>Form B</strong><small>Urutan dan target berasal dari katalog. Isian kosong tidak dihitung sebagai penilaian.</small></div>' +
      '<span class="chip">' + esc(roleLabel) + '</span></div>' +
    '<div class="mini-summary"><div class="mini-head"><div><strong>Progres form ini</strong><small>Terpisah dari Ringkasan kabupaten.</small></div>' +
      '<span class="muted">Simpan terakhir: ' + esc(dateTime(coop.last_saved_at)) + '</span></div>' + formStatsMarkup(stats) + '</div>' +
    '<div class="sync" id="sync-state"><b>' + (pending?'● Draft lokal siap dikirim':'● Data dari server siap') + '</b><span>' +
      (pending?'Perubahan terakhir ' + esc(dateTime(draft.updatedAt)) + '. Belum disimpan ke server.':'Perubahan hanya terkirim saat Anda menekan Simpan.') + '</span></div>' +
    '<div class="filters"><input id="item-search" class="input" type="search" value="' + esc(state.itemSearch) + '" placeholder="Cari nama item">' +
      '<select class="input" id="item-filter"><option value="all">Semua item</option><option value="empty"' + (state.itemFilter==='empty'?' selected':'') + '>Belum dinilai</option>' +
      '<option value="none"' + (state.itemFilter==='none'?' selected':'') + '>Tidak Ada</option><option value="attention"' + (state.itemFilter==='attention'?' selected':'') + '>Perlu perhatian</option></select>' +
      '<span class="muted">' + state.allItems.length + ' item · ' + state.catalog.length + ' kelompok</span></div>' +
      '<div id="form-groups">' + groupMarkup + '</div><div class="form-end"><button class="btn primary" id="save-bottom" ' + (!canEditActive()?'disabled':'') + '>Simpan perubahan</button>' +
      '<small>Hanya item dan kelompok yang berubah yang dikirim ke server.</small></div>';
}
function profilePage() {
  const isPmo=role==='pmo';
  const heading=isPmo?'Informasi akun PMO.':'Identitas akses dan informasi koperasi.';
  const resetCard=isPmo?'<section class="card profile-card"><h2>Reset password koperasi</h2><p class="muted">Pulihkan akses satu akun Manager atau Pengurus ke sandi awal role.</p><button class="btn primary" id="open-password-reset" aria-haspopup="dialog" aria-controls="password-reset-modal">Reset password</button></section>':'';
  const passwordCard=isPmo?'':'<section class="card profile-card"><h2>Ganti kata sandi</h2><p class="muted">Kata sandi ini khusus akun yang sedang digunakan. Menggantinya tidak mengubah akun lain.</p>'+ 
    '<form id="password-form" class="password-form"><label class="control">Kata sandi saat ini<input class="input" type="password" name="current" autocomplete="current-password" required></label>'+ 
    '<label class="control">Kata sandi baru<input class="input" type="password" name="next" autocomplete="new-password" minlength="8" required></label>'+ 
    '<label class="control">Ulangi kata sandi baru<input class="input" type="password" name="confirm" autocomplete="new-password" minlength="8" required></label>'+ 
    '<button class="btn primary" type="submit">Perbarui kata sandi</button></form></section>';
  const resetModals=isPmo?'<div class="reset-modal" id="password-reset-modal" hidden aria-hidden="true"><section class="reset-dialog" role="dialog" aria-modal="true" aria-labelledby="password-reset-title" tabindex="-1">'+
    '<header class="reset-dialog-head"><div><span class="eyebrow">AKSES KOPERASI</span><h2 id="password-reset-title">Reset password</h2><p class="muted">Pilih satu akun. Reset tidak memengaruhi akun lain pada role atau koperasi berbeda.</p></div><button class="group-close" type="button" data-reset-close aria-label="Tutup dialog"><span>×</span></button></header>'+ 
    '<div class="reset-dialog-body"><div class="reset-fields"><label class="control">Role<select class="input" id="reset-account-role"><option value="manager">Manager</option><option value="pengurus">Pengurus</option></select></label>'+ 
    '<label class="control">Kecamatan<select class="input" id="reset-account-district"><option value="">Memuat kecamatan…</option></select></label>'+ 
    '<label class="control reset-village-field">Desa / kelurahan<select class="input" id="reset-account-village" disabled><option value="">Pilih kecamatan dulu</option></select></label></div>'+ 
    '<div class="reset-target muted" id="reset-account-target">Pilih satu koperasi untuk menentukan akun yang direset.</div>'+ 
    '<section class="reset-default-setup" id="reset-default-setup" hidden><strong>Siapkan sandi awal role</strong><p class="muted">Masukkan sandi awal yang sudah berlaku. Server akan mencocokkannya dengan hash dan menyimpannya terenkripsi agar dapat ditampilkan setelah reset.</p><div class="reset-password-row"><input class="input" type="password" id="reset-default-entry" autocomplete="off" placeholder="Masukkan sandi awal role"><button class="btn" type="button" id="store-default-password">Verifikasi &amp; simpan aman</button></div></section>'+ 
    '<section class="reset-default-output" id="reset-default-output" hidden><label class="control">Sandi default<input class="input" type="text" id="reset-default-display" readonly aria-label="Sandi default role"></label><button class="btn" type="button" id="copy-default-password">Salin sandi</button></section>'+ 
    '<div class="reset-dialog-actions"><button class="btn primary" type="button" id="start-account-reset" disabled>Reset password</button><small id="reset-account-status" aria-live="polite"></small></div></div></section></div>'+ 
    '<div class="reset-modal reset-confirm-layer" id="reset-confirm-modal" hidden aria-hidden="true"><section class="reset-dialog reset-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="reset-confirm-title" aria-describedby="reset-confirm-description" tabindex="-1">'+ 
    '<header class="reset-dialog-head"><div><span class="eyebrow">KONFIRMASI KEDUA</span><h2 id="reset-confirm-title">Yakin reset akun ini?</h2><p class="muted" id="reset-confirm-description">Sandi akun akan kembali ke sandi awal role dan sesi aktif akun tersebut akan berakhir.</p></div></header>'+ 
    '<div class="reset-confirm-details" id="reset-confirm-details"></div><div class="reset-dialog-actions"><button class="btn" type="button" id="cancel-account-reset">Kembali</button><button class="btn primary" type="button" id="confirm-account-reset">Ya, reset akun ini</button></div></section></div>':'';
  return '<div class="heading"><div><span class="eyebrow">AKUN</span><h1>Profil</h1><div class="muted">'+heading+'</div></div></div>'+ 
    '<div class="profile-grid"><section class="card profile-card"><h2>Informasi akun</h2><div id="profile-details" class="profile-details"><span class="muted">Memuat profil…</span></div></section>'+passwordCard+resetCard+'</div>'+resetModals;
}
function bindProfilePage() {
  loadProfile().then(p=>{
    if(state.page!=='profile')return;
    const rows=role==='pmo'?[['Nama PMO',p.operator_name||operatorName||'—']]:[['Role',roleLabel]];
    if(role!=='pmo'&&p.manager_name)rows.push(['Nama manager',p.manager_name]);
    if(role!=='pmo'&&Array.isArray(p.pengurus_names)&&p.pengurus_names.length)rows.push(['Nama pengurus',p.pengurus_names.join(', ')]);
    if(role!=='pmo'&&p.nik)rows.push(['NIK koperasi',p.nik]);
    if(role!=='pmo'&&(p.desa||p.kecamatan))rows.push(['Koperasi',(p.desa?'KDKMP '+p.desa:'')+(p.kecamatan?' · '+p.kecamatan:'')]);
    $('#profile-details').innerHTML=rows.map(([k,v])=>'<div><small>'+esc(k)+'</small><strong>'+esc(v||'—')+'</strong></div>').join('');
  }).catch(e=>{const node=$('#profile-details');if(node)node.innerHTML='<span class="offline">'+esc(e.message)+'</span>';});
  if(role==='pmo')bindPasswordReset();else bindOwnPasswordChange();
}
function bindOwnPasswordChange() {
  $('#password-form')?.addEventListener('submit',async e=>{
    e.preventDefault();const form=e.currentTarget,button=form.querySelector('button[type=submit]'),data=new FormData(form);
    const current=String(data.get('current')||''),next=String(data.get('next')||''),confirm=String(data.get('confirm')||'');
    if(next.length<8){toast('Kata sandi baru minimal 8 karakter.','error');return;}
    if(next!==confirm){toast('Ulangan kata sandi belum sama.','error');return;}
    button.disabled=true;button.textContent='Memperbarui…';
    try{await rpc('kdmp_change_password',{p_token:token(),p_current_password:current,p_new_password:next});toast('Kata sandi diperbarui. Silakan masuk kembali.','success');setTimeout(()=>{['kdmp-token','kdmp-role','kdmp-nik','kdmp-name','kdmp-coop-name','kdmp-active-nik'].forEach(k=>sessionStorage.removeItem(k));location.reload();},900);}
    catch(err){toast(err.message,'error');button.disabled=false;button.textContent='Perbarui kata sandi';}
  });
}
function bindPasswordReset() {
  const modal=$('#password-reset-modal'),confirmModal=$('#reset-confirm-modal');
  const launch=$('#open-password-reset'),district=$('#reset-account-district'),village=$('#reset-account-village');
  const roleSelect=$('#reset-account-role'),start=$('#start-account-reset'),confirm=$('#confirm-account-reset');
  const target=$('#reset-account-target'),status=$('#reset-account-status'),setup=$('#reset-default-setup');
  const output=$('#reset-default-output'),passwordDisplay=$('#reset-default-display'),storeButton=$('#store-default-password');
  const entry=$('#reset-default-entry'),copyButton=$('#copy-default-password');
  if(!modal||!launch||!district||!village||!start)return;
  let directory=[],directoryLoaded=false,defaultConfigured=false,secretReady=false,resetDone=false,secretRequest=0;
  const selectedRole=()=>roleSelect.value;
  const selectedCoop=()=>directory.find(c=>String(c.nik)===village.value);
  const selectedLabel=()=>{const c=selectedCoop();return c?'KDKMP '+(c.desa||'Desa belum tercatat')+(c.kecamatan?' · '+c.kecamatan:'')+' · NIK '+c.nik:'—';};
  const roleName=()=>selectedRole()==='manager'?'Manager':'Pengurus';
  const setStatus=(message)=>{status.textContent=message||'';};
  const updateTarget=()=>{
    const coop=selectedCoop();
    target.textContent=coop?'Target individu: '+roleName()+' · '+selectedLabel():'Pilih satu koperasi untuk menentukan akun yang direset.';
    start.disabled=!coop||!defaultConfigured||resetDone;
    output.hidden=!resetDone;
  };
  const loadDefaultStatus=async()=>{
    const request=++secretRequest;defaultConfigured=false;secretReady=false;resetDone=false;passwordDisplay.value='';output.hidden=true;
    setup.hidden=true;entry.value='';setStatus('Memeriksa konfigurasi sandi awal…');updateTarget();
    try{
      const data=await rpc('kdmp_role_default_password_status',{p_token:token(),p_target_role:selectedRole()});
      if(request!==secretRequest)return;
      defaultConfigured=!!data.configured;setup.hidden=defaultConfigured;
      setStatus(defaultConfigured?'Sandi awal terverifikasi dan siap ditampilkan setelah reset.':'Simpan sandi awal role sekali agar bisa ditampilkan setelah reset.');
    }catch(error){if(request===secretRequest)setStatus(error.message);}
    updateTarget();
  };
  const loadDirectory=async()=>{
    if(directoryLoaded)return;
    district.innerHTML='<option value="">Memuat kecamatan…</option>';
    try{
      const response=await fetch(cfg.url+'/rest/v1/rpc/kdmp_coop_picker',{method:'POST',headers:apiHeaders(),body:'{}'});
      const data=await response.json();if(!response.ok)throw new Error(data.message||'Daftar koperasi gagal dimuat.');
      directory=Array.isArray(data)?data:[];directoryLoaded=true;
      district.innerHTML='<option value="">Pilih kecamatan</option>';
      [...new Set(directory.map(c=>c.kecamatan).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'id')).forEach(name=>district.add(new Option(name,name)));
      if(!directory.length)setStatus('Daftar koperasi kosong.');
    }catch(error){district.innerHTML='<option value="">Gagal memuat kecamatan</option>';setStatus(error.message);}
  };
  const fillVillages=()=>{
    const rows=directory.filter(c=>c.kecamatan===district.value);
    village.innerHTML='<option value="">Pilih desa / kelurahan</option>'+rows.map(c=>'<option value="'+esc(c.nik)+'">KDKMP '+esc(c.desa||'Desa belum tercatat')+'</option>').join('');
    village.disabled=!district.value||!rows.length;resetDone=false;secretReady=false;passwordDisplay.value='';output.hidden=true;updateTarget();
  };
  const showModal=(node)=>{node.hidden=false;node.setAttribute('aria-hidden','false');document.body.classList.add('reset-modal-open');requestAnimationFrame(()=>{const focusTarget=node.querySelector('[data-reset-close]')||node.querySelector('.reset-dialog');focusTarget?.focus({preventScroll:true});});};
  const closeConfirm=()=>{confirmModal.hidden=true;confirmModal.setAttribute('aria-hidden','true');modal.setAttribute('aria-hidden','false');start.focus({preventScroll:true});};
  const closeMain=()=>{confirmModal.hidden=true;confirmModal.setAttribute('aria-hidden','true');modal.hidden=true;modal.setAttribute('aria-hidden','true');document.body.classList.remove('reset-modal-open');launch.focus({preventScroll:true});};
  launch.addEventListener('click',async()=>{showModal(modal);if(!cfg?.url){setStatus('Reset akun memerlukan koneksi server.');return;}await Promise.all([loadDirectory(),loadDefaultStatus()]);});
  modal.querySelector('[data-reset-close]')?.addEventListener('click',closeMain);
  modal.addEventListener('click',event=>{if(event.target===modal)closeMain();});
  confirmModal.addEventListener('click',event=>{if(event.target===confirmModal)closeConfirm();});
  $('#cancel-account-reset')?.addEventListener('click',closeConfirm);
  district.addEventListener('change',fillVillages);
  village.addEventListener('change',()=>{resetDone=false;secretReady=false;passwordDisplay.value='';output.hidden=true;updateTarget();});
  roleSelect.addEventListener('change',()=>{updateTarget();loadDefaultStatus();});
  storeButton?.addEventListener('click',async()=>{
    if(!entry.value){setStatus('Masukkan sandi awal role terlebih dahulu.');entry.focus();return;}
    storeButton.disabled=true;storeButton.textContent='Memverifikasi…';
    try{
      await rpc('kdmp_store_role_default_password',{p_token:token(),p_target_role:selectedRole(),p_password:entry.value});
      defaultConfigured=true;setup.hidden=true;entry.value='';setStatus('Sandi awal cocok dan tersimpan terenkripsi.');toast('Sandi awal role siap digunakan.','success');
    }catch(error){setStatus(error.message);toast(error.message,'error');}
    finally{storeButton.disabled=false;storeButton.textContent='Verifikasi & simpan aman';updateTarget();}
  });
  start.addEventListener('click',()=>{
    const coop=selectedCoop();if(!coop||!defaultConfigured)return;
    $('#reset-confirm-details').textContent=roleName()+' · '+selectedLabel();
    modal.setAttribute('aria-hidden','true');showModal(confirmModal);
  });
  confirm.addEventListener('click',async()=>{
    const coop=selectedCoop();if(!coop||!defaultConfigured)return;
    confirm.disabled=true;confirm.textContent='Mereset…';setStatus('');
    try{
      await rpc('kdmp_reset_user_password',{p_token:token(),p_target_role:selectedRole(),p_target_nik:String(coop.nik)});
      try{
        const data=await rpc('kdmp_get_role_default_password',{p_token:token(),p_target_role:selectedRole()});
        passwordDisplay.value=String(data.password||'');secretReady=!!passwordDisplay.value;resetDone=secretReady;output.hidden=!secretReady;
        setStatus(secretReady?'Reset berhasil. Sandi awal role siap ditampilkan dan disalin.':'Reset berhasil, tetapi sandi tidak dapat ditampilkan.');
        toast('Akun '+roleName()+' berhasil direset.','success');
      }catch(error){setStatus('Reset berhasil, tetapi sandi default gagal dimuat: '+error.message);toast('Reset berhasil, sandi tidak dapat dimuat.','error');}
      closeConfirm();updateTarget();if(secretReady)copyButton.focus({preventScroll:true});
    }catch(error){setStatus(error.message);toast(error.message,'error');closeConfirm();}
    finally{confirm.disabled=false;confirm.textContent='Ya, reset akun ini';}
  });
  copyButton?.addEventListener('click',async()=>{
    if(!secretReady||!passwordDisplay.value)return;
    try{await navigator.clipboard.writeText(passwordDisplay.value);toast('Sandi default disalin.','success');}
    catch{passwordDisplay.focus();passwordDisplay.select();const copied=document.execCommand('copy');toast(copied?'Sandi default disalin.':'Gagal menyalin sandi.',''+(copied?'success':'error'));}
  });
  if(state.resetKeyHandler)document.removeEventListener('keydown',state.resetKeyHandler);
  state.resetKeyHandler=event=>{
    const active=confirmModal.hidden?(modal.hidden?null:modal):confirmModal;if(!active)return;
    if(event.key==='Escape'){event.preventDefault();if(!confirmModal.hidden)closeConfirm();else closeMain();return;}
    if(event.key!=='Tab')return;
    const focusable=$$('button:not([disabled]),input:not([disabled]),select:not([disabled])',active).filter(node=>node.offsetParent!==null);
    if(!focusable.length)return;const first=focusable[0],last=focusable[focusable.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  };
  document.addEventListener('keydown',state.resetKeyHandler);
}
function errorPanel(message,link) {
  return '<div class="error-panel"><span>!</span><div><strong>Belum dapat menampilkan data</strong><p>' + esc(message) + '</p>' +
    (link?'<button class="btn" data-page="' + link + '">Buka daftar koperasi</button>':'') + '</div></div>';
}
function updateFormMetrics() {
  const stats=itemStats(state.allItems);
  const rated=$('#metric-rated'),ready=$('#metric-ready'),attention=$('#metric-attention'),unrated=$('#metric-unrated');
  if(rated) rated.textContent=stats.rated+' / '+state.allItems.length;
  if(ready) ready.textContent=stats.ready;
  if(attention) attention.textContent=stats.attention;
  if(unrated) unrated.textContent=stats.unrated;
  $$('.group').forEach(node => {
    const group=state.catalog.find(g=>g.id===node.dataset.group);
    if(!group)return;
    const s=itemStats(group.items),labels=$$('.group-title small',node),progress=node.querySelector('.group-progress');
    labels.forEach(label=>label.textContent=group.items.length+' item · '+s.rated+' sudah dinilai');
    if(progress)progress.textContent=s.rated+'/'+group.items.length+' dinilai';
    const badge=node.querySelector('.num');
    if(badge){badge.classList.toggle('complete',s.rated===group.items.length&&group.items.length>0);badge.classList.toggle('partial',s.rated>0&&s.rated<group.items.length);}
  });
  applyItemFilters();
}
function refreshNoteHint(row) {
  const key=row.dataset.itemId,v=state.form.items[key]||{},item=state.allItems.find(x=>x.id===key);
  const hints=[];
  if((Number(v.allocation?.rusak)||Number(v.damaged)||0)>0&&!String(v.note||'').trim())hints.push('Catatan wajib: jelaskan kerusakan yang ditemukan.');
  if(key==='OPS_SUMBER_AIR'&&v.presence==='tidak_ada'&&!String(v.note||'').trim())hints.push('Tambahkan alasan atau rencana tindak lanjut sumber air.');
  const allocation=conditionQuantityItem(item)?normalizedAllocation(item,v):(v.allocation||{});
  const distinctConditions=conditionKeys.filter(name=>Number(allocation[name])>0).length;
  if(distinctConditions>1&&!String(v.note||'').trim())hints.push('Kondisi unit beragam. Jelaskan rinciannya di catatan.');
  const target=row.querySelector('[data-note-hint]');
  if(target){target.textContent=hints.join(' ');target.classList.toggle('hidden',hints.length===0);}
}
function applyItemFilters() {
  const term=state.itemSearch.toLowerCase();
  $$('.item-card').forEach(node => {
    const item=state.allItems.find(i=>i.id===node.dataset.itemId),v=state.form.items[node.dataset.itemId]||{};
    const matchesName=node.dataset.name.includes(term);
    const allocation=conditionQuantityItem(item||{})?normalizedAllocation(item||{},v):(v.allocation||{});
    const hasAttention=v.presence==='tidak_ada'||Number(allocation.rusak||0)>0||Number(allocation.belum_dicek||0)>0||v.condition==='rusak'||v.condition==='belum_dicek'||(item?.target!=null&&v.actual!==''&&Number(v.actual)<item.target);
    const matchesState=state.itemFilter==='empty'?!v.presence:
      state.itemFilter==='none'?v.presence!=='tidak_ada':
      state.itemFilter==='attention'?hasAttention:true;
    node.classList.toggle('filtered-out',!matchesName || !matchesState);
  });
  $$('.group').forEach(group => {
    group.classList.toggle('filtered-out',!group.querySelector('.item-card:not(.filtered-out)'));
  });
}
function renderPage(page,push=true) {
  if (!['summary','coops','sarpras','export','profile'].includes(page)) page=role==='pmo'?'summary':'coops';
  if(role!=='pmo'&&['summary','export'].includes(page)) page='coops';
  $$('.group-modal:not([hidden])').forEach(modal=>closeGroupDialog(modal,false));
  if(page!=='profile'){$('#password-reset-modal')?.setAttribute('hidden','');$('#reset-confirm-modal')?.setAttribute('hidden','');document.body.classList.remove('reset-modal-open');}
  state.page=page;
  $$('.page').forEach(node=>node.classList.toggle('hidden',node.id!=='page-'+page));
  $$('.nav').forEach(node=>node.classList.toggle('active',node.dataset.page===page));
  const target=$('#page-'+page);
  if(page==='summary') target.innerHTML=summaryPage();
  if(page==='coops') target.innerHTML=coopsPage();
  if(page==='sarpras') target.innerHTML=sarprasPage();
  if(page==='export') target.innerHTML=exportPage();
  if(page==='profile') target.innerHTML=profilePage();
  $('#savebar').classList.toggle('hidden',page!=='sarpras'||!canEditActive());
  if(page==='sarpras') bindFormPage();
  if(page==='coops') bindCoopsPage();
  if(page==='summary') bindSummaryPage();
  if(page==='export') bindExportPage();
  if(page==='profile') bindProfilePage();
  if(push) {
    history.pushState({page:page},'', '#' + page);
    window.scrollTo({top:0,behavior:'smooth'});
  }
}
function bindSummaryPage() {
  const select=$('#summary-district');
  if(select)select.addEventListener('change',()=>{state.district=select.value;state.village='all';renderPage('summary',false);});
  const status=$('#summary-status');
  if(status)status.addEventListener('change',()=>{state.summaryStatus=status.value;renderPage('summary',false);});
  const village=$('#summary-village');
  if(village)village.addEventListener('change',()=>{state.village=village.value;renderPage('summary',false);});
  const search=$('#summary-search');
  if(search)search.addEventListener('input',()=>{
    const position=search.selectionStart;state.summarySearch=search.value;renderPage('summary',false);
    const next=$('#summary-search');next?.focus();next?.setSelectionRange(position,position);
  });
  $$('#page-summary [data-open-coop]').forEach(btn=>btn.addEventListener('click',()=>openCoop(btn.dataset.nik)));
}
function bindCoopsPage() {
  const search=$('#coop-search'),district=$('#coop-district'),village=$('#coop-village');
  const toggle=$('#coop-search-toggle');
  toggle?.addEventListener('click',()=>{
    const input=$('#coop-search');
    const opening=input.hidden;
    input.hidden=!opening;
    toggle.setAttribute('aria-expanded',String(opening));
    toggle.setAttribute('aria-label',opening?'Sembunyikan pencarian':'Tampilkan pencarian');
    if(opening)input.focus();
  });
  if(search)search.addEventListener('input',()=>{state.coopSearch=search.value;state.coopPage=1;refreshCoopTable();});
  if(district)district.addEventListener('change',()=>{
    state.coopDistrict=district.value;state.coopVillage='all';state.coopPage=1;
    updateVillageOptions();refreshCoopTable();
  });
  if(village)village.addEventListener('change',()=>{state.coopVillage=village.value;state.coopPage=1;refreshCoopTable();});
  $('#coop-page-size')?.addEventListener('change',e=>{state.coopPageSize=e.target.value==='all'?'all':Number(e.target.value);state.coopPage=1;refreshCoopTable();});
  $('#coop-prev')?.addEventListener('click',()=>{state.coopPage--;refreshCoopTable();});
  $('#coop-next')?.addEventListener('click',()=>{state.coopPage++;refreshCoopTable();});
  $$('#page-coops [data-open-coop]').forEach(btn=>btn.addEventListener('click',()=>openCoop(btn.dataset.nik)));
}
function updateVillageOptions() {
  const select=$('#coop-village');
  if(!select)return;
  const villages=[...new Set(state.coops.filter(c=>state.coopDistrict==='all'||c.kecamatan===state.coopDistrict).map(c=>c.desa).filter(Boolean))].sort();
  select.disabled=state.coopDistrict==='all';
  select.innerHTML='<option value="all">'+(state.coopDistrict==='all'?'Pilih kecamatan dulu':'Semua desa')+'</option>'+villages.map(name=>'<option value="'+esc(name)+'">'+esc(name)+'</option>').join('');
}
function refreshCoopTable() {
  const body=$('#coop-rows');
  if(!body)return;
  const filtered=filteredCoops();
  const pageSize=state.coopPageSize==='all'?filtered.length:Number(state.coopPageSize);
  const pages=Math.max(1,Math.ceil(filtered.length/Math.max(pageSize,1)));
  state.coopPage=Math.min(Math.max(state.coopPage,1),pages);
  const slice=state.coopPageSize==='all'?filtered:filtered.slice((state.coopPage-1)*pageSize,state.coopPage*pageSize);
  body.innerHTML=slice.map(coopTableRow).join('')||'<tr><td colspan="7" class="empty">Tidak ada koperasi yang cocok.</td></tr>';
  const count=$('#coop-count');
  if(count)count.textContent=fmt(filtered.length)+' dari '+fmt(state.coops.length)+' koperasi';
  const label=$('#coop-page-label');
  if(label)label.textContent='Halaman '+state.coopPage+' dari '+pages;
  const prev=$('#coop-prev'),next=$('#coop-next');
  if(prev)prev.disabled=state.coopPage<=1;
  if(next)next.disabled=state.coopPage>=pages;
  $$('[data-open-coop]',body).forEach(btn=>btn.addEventListener('click',()=>openCoop(btn.dataset.nik)));
}
function openCoop(nik) {
  const coop=state.coops.find(c=>String(c.nik)===String(nik));
  if(!coop)return;
  state.activeNik=String(nik);
  sessionStorage.setItem('kdmp-active-nik',state.activeNik);
  state.activeCoop=coop;
  state.itemSearch='';state.itemFilter='all';
  loadCoopForm().then(()=>renderPage('sarpras')).catch(error=>toast(error.message,'error'));
}
async function loadCatalog() {
  const h=apiHeaders();
  const [groupsRes,itemsRes,imagesRes,revisedRes]=await Promise.all([
    fetch(cfg.url+'/rest/v1/sarpras_kelompok?select=kelompok_id,nama_kelompok,urutan&aktif=eq.true&order=urutan',{headers:h}),
    fetch(cfg.url+'/rest/v1/sarpras_katalog?select=item_id,kelompok_id,nama_item,urutan,jumlah_rencana,daftar_tipe,spesifikasi&aktif=eq.true&order=urutan',{headers:h}),
    fetch('./assets/catalog-images.json'),fetch('./assets/catalog.json')
  ]);
  if(!groupsRes.ok||!itemsRes.ok||!imagesRes.ok||!revisedRes.ok)throw new Error('Katalog atau peta gambar sarpras tidak dapat dimuat.');
  const groups=await groupsRes.json(),items=await itemsRes.json(),imageMap=await imagesRes.json(),revised=await revisedRes.json();
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const localNameCounts=new Map();
  revised.flatMap(group=>group.items).forEach(item=>{const key=norm(item.name);localNameCounts.set(key,(localNameCounts.get(key)||0)+1);});
  const itemByName=new Map();
  items.forEach(it=>{const key=norm(it.nama_item);itemByName.set(key,[...(itemByName.get(key)||[]),it]);});
  const groupByName=new Map();
  groups.forEach(g=>{const key=norm(g.nama_kelompok);groupByName.set(key,[...(groupByName.get(key)||[]),g]);});
  const groupIds=new Set(groups.map(g=>g.kelompok_id));
  state.catalog=revised.map((g,gi)=>({
    id:groupIds.has(g.id)?g.id:((groupByName.get(norm(g.name))||[]).length===1?groupByName.get(norm(g.name))[0].kelompok_id:g.id),name:g.name,order:gi+1,
    items:g.items.map(it=>{
      const candidates=itemByName.get(norm(it.name))||[];
      const matchingGroups=groupByName.get(norm(g.name))||[];
      const resolvedGroupId=groupIds.has(g.id)?g.id:(matchingGroups.length===1?matchingGroups[0].kelompok_id:g.id);
      const server=candidates.find(row=>row.kelompok_id===resolvedGroupId) ||
        (candidates.length===1&&localNameCounts.get(norm(it.name))===1?candidates[0]:null);
      const targetText=String(it.target||'').trim(),targetMatch=targetText.match(/\d+/);
      const serverTypes=Array.isArray(server?.daftar_tipe)?server.daftar_tipe:[];
      return {id:it.item_id,name:it.name,target:targetMatch?Number(targetMatch[0]):null,targetLabel:targetText,assessment:it.assessment||'',
        types:serverTypes.length?serverTypes:(it.types||[]),spec:server?.spesifikasi||{},images:{files:[]},order:it.order,formNo:String(it.order)};
    })
  }));
  state.allItems=state.catalog.flatMap(g=>g.items);
  state.allItems.forEach(item=>{
    item.images={files:(imageMap[String(item.order)]?.files||[]).map(file=>'./assets/img/sarpras/'+file)};
  });
}
async function loadCoops() {
  const data=await rpc('kdmp_list_coops',{p_token:token()});
  state.coops=Array.isArray(data)?data:(data.coops||[]);
  if(!state.coops.length)throw new Error('Akun ini belum memiliki koperasi dalam cakupannya.');
  if(!state.coops.some(c=>String(c.nik)===String(state.activeNik))) {
    state.activeNik=String(sessionStorage.getItem('kdmp-nik')||state.coops[0].nik);
  }
  currentCoop();
}
async function loadDashboard() {
  state.dashboard=await rpc('kdmp_dashboard',{p_token:token()});
  state.coops=state.dashboard.coops||[];
  if(['manager','pengurus'].includes(role)) {
    const res=await fetch(cfg.url+'/rest/v1/rpc/kdmp_coop_picker',{method:'POST',headers:apiHeaders(),body:'{}'});
    if(res.ok) {
      const directory=await res.json(),known=new Map(state.coops.map(c=>[String(c.nik),c]));
      state.coops=directory.map(c=>known.get(String(c.nik))||{...c,items_total:state.allItems.length,items_rated:0,items_ready:0,items_missing:0,items_damaged:0,items_unchecked:0,items_below_plan:0,last_saved_at:null});
    }
  }
  if(!state.coops.length)throw new Error('Akun ini belum memiliki koperasi dalam cakupannya.');
  if(['manager','pengurus'].includes(role)) state.activeNik=String(sessionStorage.getItem('kdmp-nik')||'');
  if(!state.coops.some(c=>String(c.nik)===String(state.activeNik))) {
    state.activeNik=String(sessionStorage.getItem('kdmp-nik')||state.coops[0].nik);
  }
  currentCoop();
}
async function loadProfile() { const n=role==='pmo'?null:(['manager','pengurus'].includes(role)?sessionStorage.getItem('kdmp-nik'):state.activeNik); return rpc('kdmp_profile',{p_token:token(),p_nik:n||null}); }
async function loadCoopForm() {
  if(!state.activeNik || !state.live)return;
  const n=state.activeNik;
  const data=await rpc('kdmp_load_form',{p_token:token(),p_nik:n});
  const serverItems={},versions={},serverGroups={},groupVersions={};
  (data.items||[]).forEach(row=>{
    const v={
      presence:row.keberadaan||'',actual:row.jumlah_aktual ?? '',
      damaged:row.jumlah_rusak ?? '',note:row.catatan||'',type:row.tipe_dipilih||'',...(row.detail||{})
    };
    delete v.status_sumber;delete v.status_rencana;
    if(v.lokasi_instalasi==null&&v.lokasi_panel!=null)v.lokasi_instalasi=v.lokasi_panel;
    v.allocation=(row.jumlah_baik!=null||row.jumlah_rusak!=null||row.jumlah_belum_dicek!=null)
      ?{baik:Number(row.jumlah_baik||0),rusak:Number(row.jumlah_rusak||0),belum_dicek:Number(row.jumlah_belum_dicek||0)}
      :(v.kondisi_jumlah||{});
    v.condition=conditionKeys.find(key=>Number(v.allocation?.[key]||0)>0)||'';
    v.condition_choices=v.kondisi_pilihan||v.condition_choices||Object.fromEntries(conditionKeys.map(key=>[key,Number(v.allocation?.[key]||0)>0]));
    serverItems[row.item_id]=v;versions[row.item_id]=Number(row.versi||0);
  });
  (data.groups||[]).forEach(row=>{
    serverGroups[row.kelompok_id]=row.penilaian_awal||'';
    groupVersions[row.kelompok_id]=Number(row.versi||0);
  });
  const saved=getDraft();
  const draftItems={...(saved.items||{})};
  const legacyIds={OPS_LAMPU_GANTUNG_GUDANG:'OPS_LAMPU_GUDANG',OPS_LAMPU_TOILET_GUDANG:'OPS_LAMPU_TOILET'};
  Object.entries(legacyIds).forEach(([oldId,newId])=>{
    if(draftItems[oldId]&&!draftItems[newId])draftItems[newId]=draftItems[oldId];
    delete draftItems[oldId];
  });
  state.form={
    items:Object.assign({},serverItems,draftItems),
    groups:Object.assign({},serverGroups,saved.groups||{}),
    versions:Object.assign({},versions,saved.pending?saved.versions:{}),
    groupVersions:Object.assign({},groupVersions,saved.pending?saved.groupVersions:{}),
    serverItems,serverGroups
  };
  state.allItems.forEach(item=>{
    const value=state.form.items[item.id]||{};
    state.form.items[item.id]=value;
  });
  state.activeCoop=state.coops.find(c=>String(c.nik)===String(n))||state.activeCoop;
}
function bindFormPage() {
  const search=$('#item-search'),filter=$('#item-filter');
  if(search)search.addEventListener('input',()=>{state.itemSearch=search.value;applyItemFilters();});
  if(filter)filter.addEventListener('change',()=>{state.itemFilter=filter.value;applyItemFilters();});
  $$('#page-sarpras [data-key]').forEach(el => {
    const event=el.tagName==='TEXTAREA'||el.type==='number'?'input':'change';
    el.addEventListener(event,()=>handleField(el,false));
    if(event==='input')el.addEventListener('change',()=>handleField(el,true));
  });
  $$('#page-sarpras [data-group-key]').forEach(el=>el.addEventListener('change',()=>{
    if(!canEditActive())return;
    const group=state.catalog.find(g=>g.id===el.dataset.groupKey);
    if(group&&['ada','tidak_ada'].includes(el.value)){
      const changes=group.items.filter(item=>(state.form.items[item.id]?.presence||'')!==(el.value==='ada'?'ada':'tidak_ada'));
      const affected=el.value==='tidak_ada'?changes.filter(item=>{
        const v=state.form.items[item.id]||{};
        return v.type||v.note||Number(v.actual)>0||Object.values(v.allocation||{}).some(n=>Number(n)>0)||v.ketersediaan;
      }):[];
      const prompt=affected.length
        ?'Status Tidak Ada akan menghapus rincian pada '+affected.length+' item di kelompok '+group.name+'. Lanjutkan?'
        :'Status ini akan diterapkan pada '+changes.length+' item. Lanjutkan?';
      if(changes.length&&!window.confirm(prompt)){el.value=state.form.groups[group.id]||'';return;}
    }
    if(group&&['ada','tidak_ada'].includes(el.value)) group.items.forEach(item=>{
      const input=$('[data-key="'+CSS.escape(item.id)+'"][data-field="presence"]');
      const presence=el.value==='ada'?'ada':'tidak_ada';
      const v=state.form.items[item.id]=state.form.items[item.id]||{};v.presence=presence;
      if(input)input.value=presence;
      if(presence!=='ada'){
        v.condition='';v.damaged='';v.actual='';v.allocation={baik:0,rusak:0,belum_dicek:0};v.condition_choices={baik:false,rusak:false,belum_dicek:false};
      } else if(conditionQuantityItem(item)) {
        v.allocation=normalizedAllocation(item,v);v.condition_choices=v.condition_choices||{};v.actual=allocationTotal(v.allocation);
      } else if(inventoryItem(item)&&(item.assessment||'').includes('Jumlah')&&(v.actual==null||v.actual===''))v.actual=0;
      const row=input?.closest('.item-card');if(row)syncPresenceUI(row,item,v);
    });
    state.form.groups[el.dataset.groupKey]=el.value;
    setDraft();updateFormMetrics();
  }));
  $$('[data-group-open]').forEach(launcher=>launcher.addEventListener('click',()=>{
    const modal=launcher.closest('.group')?.querySelector('.group-modal');
    if(!modal)return;
    $$('.group-modal:not([hidden])').forEach(open=>closeGroupDialog(open,false));
    modal.hidden=false;
    launcher.setAttribute('aria-expanded','true');
    document.body.classList.add('group-modal-open');
    requestAnimationFrame(()=>modal.querySelector('.group-close')?.focus({preventScroll:true}));
  }));
  $$('.group-modal').forEach(modal=>{
    modal.addEventListener('click',event=>{if(event.target===modal)closeGroupDialog(modal);});
    modal.querySelector('[data-group-close]')?.addEventListener('click',()=>closeGroupDialog(modal));
  });
  $$('[data-group-save]').forEach(button=>button.addEventListener('click',saveForm));
  if(!document.documentElement.dataset.groupModalKeys){
    document.documentElement.dataset.groupModalKeys='bound';
    document.addEventListener('keydown',event=>{
      const modal=$('.group-modal:not([hidden])');if(!modal)return;
      if($('#media-modal:not(.hidden)'))return;
      if(event.key==='Escape'){event.preventDefault();closeGroupDialog(modal);return;}
      if(event.key!=='Tab')return;
      const focusable=$$('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',modal).filter(node=>node.offsetParent!==null);
      if(!focusable.length)return;
      const first=focusable[0],last=focusable[focusable.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    });
  }
  $$('.item-title-toggle').forEach(toggle=>toggle.addEventListener('click',()=>{
    const row=toggle.closest('.item-card'),isCollapsed=row.classList.toggle('item-collapsed');
    toggle.setAttribute('aria-expanded',String(!isCollapsed));
    toggle.setAttribute('aria-label',(isCollapsed?'Buka isian ':'Lipat isian ')+row.querySelector('.item-info strong').textContent);
  }));
  $('#save').onclick=saveForm;
  $('#save-bottom').onclick=saveForm;
  applyItemFilters();updateFormMetrics();
  $$('.item-card', $('#page-sarpras')).forEach(refreshNoteHint);
  $$('.item-card', $('#page-sarpras')).forEach(refreshAllocation);
}
function handleField(el,updateVisibility) {
  if(!canEditActive())return;
  const key=el.dataset.key,fieldName=el.dataset.field,item=state.allItems.find(x=>x.id===key);
  state.form.items[key]=state.form.items[key]||{};
  const v=state.form.items[key];
  if(!fieldName.startsWith('allocation-'))v[fieldName]=el.value;
  if(fieldName.startsWith('allocation-')) {
    const [,kind,...tail]=fieldName.split('-');
    v.allocation=normalizedAllocation(item,v);v.condition_choices=v.condition_choices||{baik:false,rusak:false,belum_dicek:false};
    if(tail[0]==='count') {
      v.condition_choices[kind]=true;v.allocation[kind]=el.value===''?0:Number(el.value);
    } else if(el.type==='radio') {
      v.allocation={baik:0,rusak:0,belum_dicek:0};v.condition_choices={baik:false,rusak:false,belum_dicek:false};
      v.condition_choices[kind]=true;v.allocation[kind]=conditionQuantityItem(item)?1:1;v.condition=kind;
    } else {
      v.condition_choices[kind]=!!el.checked;v.allocation[kind]=el.checked?0:0;
      v.condition=conditionKeys.find(name=>v.condition_choices[name]||Number(v.allocation[name])>0)||'';
    }
    if(conditionQuantityItem(item))updateConditionQuantity(item,v);
    const row=el.closest('.item-card');syncConditionQuantities(row,item,v);refreshAllocation(row);refreshNoteHint(row);setDraft();updateFormMetrics();return;
  }
  if(fieldName==='condition'&&el.value!=='rusak')state.form.items[key].damaged='';
  if(fieldName==='presence' && el.value!=='ada') {
    if((Object.values(v.allocation||{}).some(x=>Number(x)>0)||Number(v.actual)>0)&&!window.confirm('Mengubah keberadaan menjadi Tidak Ada akan membuang rincian kondisi dan jumlah. Lanjutkan?')){el.value='ada';v.presence='ada';return;}
    v.condition='';v.damaged='';v.actual='';v.allocation={baik:0,rusak:0,belum_dicek:0};v.condition_choices={baik:false,rusak:false,belum_dicek:false};
  }
  if(fieldName==='presence' && el.value==='ada') {
    if(conditionQuantityItem(item)){v.allocation=normalizedAllocation(item,v);v.condition_choices=v.condition_choices||{baik:false,rusak:false,belum_dicek:false};v.actual=allocationTotal(v.allocation);}
    else if(inventoryItem(item)&&(item.assessment||'').includes('Jumlah')&&(v.actual==null||v.actual===''))v.actual=0;
  }
  if(fieldName==='presence') syncGroupAssessment(el.closest('.group'));
  const row=el.closest('.item-card');
  if(row){if(fieldName==='presence')syncPresenceUI(row,item,v);refreshNoteHint(row);refreshAllocation(row);}
  setDraft();
  if(fieldName!=='note'||updateVisibility)updateFormMetrics();
}
function refreshAllocation(row){
  if(!row)return;const key=row.dataset.itemId,v=state.form.items[key]||{},item=state.allItems.find(x=>x.id===key),box=row.querySelector('.allocation-hint[data-allocation-hint]');if(!box)return;
  const inputs=$$('input[data-field^="allocation-"][data-field$="-count"]',row),selected=inputs.filter(x=>row.querySelector('[data-field="allocation-'+x.dataset.field.split('-')[1]+'"]')?.checked),total=selected.reduce((n,x)=>n+(x.value===''?0:Number(x.value)),0),actual=v.actual===''||v.actual==null?0:Number(v.actual);
  let msg='';if(v.presence==='ada'&&conditionQuantityItem(item)&&actual===0)msg='Jumlah aktual masih 0; isi jumlah pada kondisi yang dipilih.';else if(actual>total&&selected.length)msg=`${actual-total} unit belum dialokasikan.`;else if(total>actual)msg=`Alokasi melebihi jumlah aktual sebanyak ${total-actual} unit.`;
  box.textContent=msg;box.classList.toggle('hidden',!msg);
}
function syncGroupAssessment(node){
  if(!node)return;
  const id=node.dataset.group,group=state.catalog.find(g=>g.id===id);if(!group)return;
  const vals=group.items.map(item=>state.form.items[item.id]?.presence||'');
  let value='';
  if(vals.every(v=>v==='ada'))value='ada';
  else if(vals.every(v=>v==='tidak_ada'))value='tidak_ada';
  else if(vals.every(Boolean))value='custom';
  state.form.groups[id]=value;
  const select=node.querySelector('[data-group-key]');if(select)select.value=value;
}
function groupAssessment(group) {return state.form.groups[group.id] || '';}
function serializeItem(item,v,expectedVersion=0) {
    const tracksQuantity=(item.assessment||'').includes('Jumlah');
    const conditionQuantity=conditionQuantityItem(item);
    const conditionCounts=hasConditionCounts(item);
    const allocation=conditionCounts?normalizedAllocation(item,v):(v.allocation||{});
    const actual=!tracksQuantity||v.presence!=='ada'?null:conditionQuantity?allocationTotal(allocation):(v.actual===''||v.actual==null?0:Number(v.actual));
    const damaged=conditionCounts?(v.presence==='ada'?Number(allocation.rusak||0):null):(v.damaged===''||v.damaged==null?null:Number(v.damaged));
    if(actual!=null&&(!Number.isInteger(actual)||actual<0))throw new Error('Jumlah aktual pada “'+item.name+'” harus bilangan bulat nol atau lebih.');
    if(damaged!=null&&(!Number.isInteger(damaged)||damaged<0||(!conditionCounts&&(actual==null||damaged>actual))))throw new Error('Jumlah rusak pada “'+item.name+'” harus bilangan bulat dan tidak boleh melebihi jumlah aktual.');
    if(conditionCounts&&conditionKeys.some(key=>!Number.isInteger(Number(allocation[key]))||Number(allocation[key])<0))throw new Error('Jumlah kondisi pada “'+item.name+'” harus bilangan bulat nol atau lebih.');
    const detail={};
    Object.entries(v).forEach(([key,value])=>{if(!['presence','condition','actual','damaged','note','type','allocation','condition_choices','kondisi_jumlah','kondisi_pilihan','status_sumber','status_rencana'].includes(key)&&value!==''&&value!=null)detail[key]=value;});
    return {
      item_id:item.id,expected_versi:expectedVersion,
      tipe_dipilih:v.type||null,keberadaan:v.presence||null,
      jumlah_baik:conditionCounts&&v.presence==='ada'?Number(allocation.baik||0):null,
      jumlah_rusak:conditionCounts&&v.presence==='ada'?Number(allocation.rusak||0):null,
      jumlah_belum_dicek:conditionCounts&&v.presence==='ada'?Number(allocation.belum_dicek||0):null,
      jumlah_aktual:actual,catatan:String(v.note||'').slice(0,800)||null,detail:detail
    };
  };
function stableValue(value) {
  if(Array.isArray(value))return value.map(stableValue);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stableValue(value[key])]));
  return value;
}
function serializeRows() {
  return state.allItems.map(item=>serializeItem(item,state.form.items[item.id]||{},state.form.versions[item.id]??0)).filter(row=>{
    const {expected_versi,...data}=row;
    const saved=state.form.serverItems?.[row.item_id];
    if(saved){
      const baseline=serializeItem(state.allItems.find(item=>item.id===row.item_id),saved,0);
      const {expected_versi:ignored,...baselineData}=baseline;
      return JSON.stringify(stableValue(data))!==JSON.stringify(stableValue(baselineData));
    }
    const {item_id,...payload}=data;
    return Object.values(payload).some(value=>value!==null&&value!==''&&!(value&&typeof value==='object'&&!Array.isArray(value)&&!Object.keys(value).length));
  });
}
function serializeGroups() {
  return state.catalog.map(group=>{
    const value=groupAssessment(group)||null,baseline=state.form.serverGroups?.[group.id]||null;
    return {kelompok_id:group.id,penilaian_awal:value,expected_versi:state.form.groupVersions[group.id]??0,baseline};
  }).filter(group=>group.penilaian_awal!==group.baseline).map(({baseline,...group})=>group);
}
async function saveForm() {
  if(!canEditActive() || state.saving)return;
  if(!state.live || !token()){toast('Koneksi server dan sesi login diperlukan.','error');return;}
  let rows;
  try { rows=serializeRows(); }
  catch(error){toast(error.message,'error');return;}
  const groups=serializeGroups();
  if(!rows.length&&!groups.length){localStorage.removeItem(localKey(state.activeNik));$('#save-label').textContent='Tidak ada perubahan baru';const sync=$('#sync-state');if(sync)sync.innerHTML='<b>✓ Tidak ada perubahan baru</b><span>Data server sudah sama dengan isian saat ini.</span>';toast('Tidak ada perubahan baru untuk disimpan.','success');return;}
  state.saving=true;
  $$('#save,#save-bottom').forEach(btn=>{btn.disabled=true;btn.textContent='Menyimpan…';});
  try {
    const result=await rpc('kdmp_save_form',{
      p_token:token(),p_nik:state.activeNik,p_rows:rows,p_groups:groups
    });
    localStorage.removeItem(localKey(state.activeNik));
    toast('Form berhasil disimpan ke server.','success');
    const stamp=($('#sync-state'));
    if(stamp)stamp.innerHTML='<b>✓ Perubahan tersimpan di server</b><span>' + fmt(result.saved_rows) + ' item · ' + fmt(result.saved_groups) + ' kelompok · ' + esc(dateTime(result.saved_at)) + '</span>';
    await Promise.all([loadCoopForm(),...(role==='pmo'?[loadDashboard()]:[loadCoops()])]);
    renderPage('sarpras',false);
  } catch(error) {
    toast(error.message,'error');
    const stamp=$('#sync-state');
    if(stamp)stamp.innerHTML='<b>⚠ Penyimpanan gagal</b><span>Draft di perangkat tetap aman. ' + esc(error.message) + '</span>';
    const detail=/form berubah|versi|diperbarui|konflik/i.test(error.message);
    if(detail) {
      const confirmLoad=window.confirm('Data di server berubah sejak form dibuka. Muat ulang data terbaru? Draft lokal saat ini tetap tersimpan.');
      if(confirmLoad){localStorage.removeItem(localKey(state.activeNik));await loadCoopForm();renderPage('sarpras',false);}
    }
  } finally {
    state.saving=false;
    $$('#save,#save-bottom').forEach(btn=>{btn.disabled=!canEditActive();btn.textContent='Simpan perubahan';});
  }
}
function csvCell(value) {
  const s=String(value??'');
  return '"' + s.replace(/"/g,'""') + '"';
}
function downloadCSV(name,headers,rows) {
  const content='\ufeff'+[headers,...rows].map(row=>row.map(csvCell).join(';')).join('\r\n');
  const blob=new Blob([content],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);
}
function bindExportPage() {
  $('#export-summary').onclick=()=> {
    const rows=filteredSummaryCoops().map(c=>{
      const s=coopStats(c);
      return [c.nik,coopName(c),s.rated,s.total,percent(s.rated,s.total),s.ready,s.missing,s.damaged,s.unchecked,s.below,statusName(c),c.last_saved_at];
    });
    downloadCSV('ringkasan-kdkmp-lahat.csv',['NIK','Koperasi','Item dinilai','Total item','Kelengkapan (%)','Siap','Tidak ada','Rusak','Belum dicek','Di bawah rencana','Status','Simpan terakhir'],rows);
    toast(rows.length+' koperasi diekspor ke CSV.','success');
  };
  $('#export-detail').onclick=async()=>{
    const nik=$('#export-nik').value;
    const button=$('#export-detail');button.disabled=true;button.textContent='Memuat data…';
    try {
      const coop=state.coops.find(c=>String(c.nik)===String(nik));
      const data=await rpc('kdmp_load_form',{p_token:token(),p_nik:nik});
      const byId=new Map((data.items||[]).map(row=>[row.item_id,row]));
      const rows=state.allItems.map(item=>{
        const row=byId.get(item.id)||{},detail=row.detail||{};
        const actual=Number(row.jumlah_aktual||0),damaged=Number(row.jumlah_rusak||0);
        const unchecked=Number(row.jumlah_belum_dicek||0);
        const good=Number(row.jumlah_baik||0);
        return [coop?.nik,coopName(coop||{}),item.id,item.name,item.targetLabel||'—',
          row.keberadaan||'belum dinilai',row.tipe_dipilih,row.jumlah_aktual,good,damaged,unchecked,
          row.catatan,JSON.stringify(detail),row.diubah_pada];
      });
      downloadCSV('detail-sarpras-'+nik+'.csv',['NIK','Koperasi','ID item','Item','Jumlah rencana','Keberadaan','Tipe / varian','Jumlah aktual','Jumlah baik/berfungsi','Jumlah rusak','Jumlah belum dicek','Catatan','Detail terstruktur','Simpan terakhir'],rows);
      toast('Detail '+coopName(coop||{})+' berhasil diekspor.','success');
    } catch(error) {toast(error.message,'error');}
    finally {button.disabled=false;button.textContent='Unduh detail CSV';}
  };
}
function renderMedia(item) {
  const modal=$('#media-modal'),formValue=state.form.items[item.id]||{};
  state.focusReturn=document.activeElement;
  modal.classList.remove('hidden');modal.setAttribute('aria-hidden','false');
  $('#media-title',modal).textContent=item.name;
  $('#media-variant',modal).textContent=formValue.type?'Tipe dipilih: '+formValue.type:'Spesifikasi katalog';
  const files=item.images?.files||[],type=(formValue.type||'').toLowerCase();
  const tokens=type.split(/[^a-z0-9]+/).filter(x=>x.length>2);
  const filtered=tokens.length?files.filter(file=>tokens.some(t=>file.toLowerCase().includes(t))):files;
  const show=filtered.length?filtered:files;
  const gallery=$('#media-gallery',modal);gallery.replaceChildren();
  if(show.length) {
    show.forEach(src=>{
      const img=document.createElement('img');img.src=src;img.alt=item.name+(formValue.type?' · '+formValue.type:'');
      img.loading='lazy';img.onerror=()=>{img.classList.add('image-failed');img.alt='Gambar gagal dimuat: '+item.name;};
      img.addEventListener('click',()=>img.classList.toggle('zoomed'));gallery.append(img);
    });
  } else {
    const empty=document.createElement('div');empty.className='media-empty';empty.textContent='Gambar belum tersedia. Spesifikasi katalog tetap dapat dibaca di bawah.';
    gallery.append(empty);
  }
  const specs=$('#media-spec',modal);specs.replaceChildren();
  const spec=item.spec||{};let text=spec.default||'';
  if(formValue.type&&spec.variants?.[formValue.type])text=spec.variants[formValue.type];
  if(!text&&Object.keys(spec.variants||{}).length)text=Object.values(spec.variants)[0];
  if(!text) {specs.textContent='Spesifikasi belum tersedia pada katalog untuk item ini.';return;}
  text.split(/\r?\n/).filter(Boolean).forEach(line=>{
    if(/^\[.*\]$/.test(line)) {
      const h=document.createElement('h4');h.textContent=line.slice(1,-1);specs.append(h);
    } else if(line.includes(':')) {
      const row=document.createElement('div');row.className='spec-row';
      const parts=line.split(':'),strong=document.createElement('b'),span=document.createElement('span');
      strong.textContent=parts.shift();span.textContent=parts.join(':').trim();row.append(strong,span);specs.append(row);
    } else {
      const p=document.createElement('p');p.textContent=line;specs.append(p);
    }
  });
}
function installMediaModal() {
  document.body.insertAdjacentHTML('beforeend',
    '<div id="media-modal" class="media-modal hidden" aria-hidden="true"><div class="media-window" role="dialog" aria-modal="true" aria-labelledby="media-title">' +
    '<div class="media-head"><div><strong id="media-title"></strong><small id="media-variant"></small></div><button class="btn" data-close-media type="button">Tutup ×</button></div>' +
    '<div id="media-gallery" class="media-gallery"></div><h3>Spesifikasi katalog</h3><div id="media-spec" class="media-spec"></div>' +
    '<p class="media-hint">Gambar dimuat dari folder aset hosting. Klik gambar untuk memperbesar; spesifikasi mengikuti varian yang dipilih.</p></div></div>');
}
function setConnection() {
  const header=$('#connection-label'),side=$('#server-status');
  if(header)header.innerHTML=state.live?(localDemo?'● Simulasi lokal':'● Terhubung ke server'):'● Server tidak terhubung';
  if(side)side.innerHTML=state.live?
    '<span class="online">● ' + (localDemo?'Mode demo lokal':'Terhubung ke Supabase') + '</span><br>' + fmt(state.coops.length) + ' koperasi · ' + state.allItems.length + ' item katalog<br>' + (localDemo?'Data simulasi hanya tersimpan selama server berjalan':'Perubahan tetap melalui tombol Simpan'):
    '<span class="offline">● Sambungan gagal</span><br>' + esc(state.error || 'Coba muat ulang setelah memeriksa jaringan.');
}
async function bootstrap() {
  shell();installMediaModal();
  if(!token()) { $('#server-status').textContent='Silakan masuk untuk memuat data.';renderPage(state.page,false);return; }
  try {
    await loadCatalog();
    state.live=true;
    if(role==='pmo') await loadDashboard();
    else await loadCoops();
    setConnection();
    if(state.page==='sarpras')await loadCoopForm();
    renderPage(state.page,false);
  } catch(error) {
    state.live=false;
    state.error=location.protocol==='file:'
      ?'Halaman dibuka langsung sebagai file lokal, sehingga browser memblokir koneksi ke Supabase. Jalankan tools/start-live-local.ps1 lalu buka http://127.0.0.1:8014.'
      :error.message;
    setConnection();
    renderPage('summary',false);toast(state.error,'error');
  }
}
document.addEventListener('click',event=>{
  const page=event.target.closest('[data-page]');
  if(page){
    if(page.disabled)return;
    navigateToPage(page.dataset.page);
    return;
  }
  const open=event.target.closest('[data-open-coop]');
  if(open){openCoop(open.dataset.nik);return;}
  const media=event.target.closest('[data-media-key]');
  if(media){const item=state.allItems.find(x=>x.id===media.dataset.mediaKey);if(item)renderMedia(item);return;}
  const close=event.target.closest('[data-close-media]');
  if(close){const modal=$('#media-modal');modal.classList.add('hidden');modal.setAttribute('aria-hidden','true');state.focusReturn?.focus();return;}
  if(event.target.id==='media-modal'){event.target.classList.add('hidden');event.target.setAttribute('aria-hidden','true');state.focusReturn?.focus();}
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){
    const modal=$('#media-modal');
    if(modal&&!modal.classList.contains('hidden')){$('.media-head [data-close-media]',modal).click();}
  }
});
window.addEventListener('popstate',event=>renderPage(event.state?.page||location.hash.slice(1)||'summary',false));
window.addEventListener('beforeunload',event=>{
  const draft=state.activeNik?localStorage.getItem(localKey(state.activeNik)):null;
  if(draft && state.page==='sarpras' && !readOnly){event.preventDefault();event.returnValue='';}
});
bootstrap();

