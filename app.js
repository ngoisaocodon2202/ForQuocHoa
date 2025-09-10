// ---------- Helpers ----------
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const money = n => (n||0).toLocaleString('vi-VN',{style:'currency',currency:'VND'});
const uid = () => Math.random().toString(36).slice(2,9);
const placeholderImg = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 250'><rect width='100%' height='100%' fill='#eef2f7'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#99a1ae' font-family='Arial' font-size='18'>Không có ảnh</text></svg>"
);
const LS = { get(k,def){ try{return JSON.parse(localStorage.getItem(k)) ?? def}catch{ return def } }, set(k,val){ localStorage.setItem(k, JSON.stringify(val)) } };

// ---------- Seed / Defaults ----------
const seedInventory = () => ([
  {id:uid(), cat:'nhot', name:'Motul 7100 10W40', price:220000, qty:8, img:''},
  {id:uid(), cat:'nhot', name:'Castrol Power1 10W40', price:180000, qty:12, img:''},
  {id:uid(), cat:'nhot', name:'Shell Advance AX7 10W40', price:165000, qty:10, img:''},
  {id:uid(), cat:'voxe', name:'Vỏ 80/90-17 (IRC)', price:350000, qty:6, img:''},
  {id:uid(), cat:'voxe', name:'Vỏ 90/90-14 (Michelin)', price:520000, qty:5, img:''},
  {id:uid(), cat:'voxe', name:'Vỏ 120/70-17 (Pirelli)', price:950000, qty:2, img:''}
]);
const defaultSettings = {
  gname:'HÓA ĐƠN SỬA CHỮA', gaddr:'Garage Mini POS', ghotline:'', glogo:'',
  brand:'#2563eb', brand2:'#10b981', accent:'#f59e0b',
  // VietQR default: MBBank
  qrBank:'MB', qrAcc:'', qrName:'', qrAmount:0, qrNote:''
};

// ---------- Auth ----------
const AUTH_USER='admin', AUTH_PASS='1234';
function showApp(){ $('#auth').style.display='none'; $('#app').style.display='block'; renderAll(); applySettingsColors(); applySettingsToPrint(); applyHeaderCollapsed(); }
function initAuth(){
  if(LS.get('session',{ok:false}).ok) showApp();
  $('#btn-fill').onclick = ()=>{ $('#login-user').value=AUTH_USER; $('#login-pass').value=AUTH_PASS; };
  $('#btn-login').onclick = ()=>{
    const u=$('#login-user').value.trim(), p=$('#login-pass').value.trim();
    if(u===AUTH_USER && p===AUTH_PASS){ LS.set('session',{ok:true,when:Date.now()}); showApp(); }
    else alert('Sai tài khoản hoặc mật khẩu!');
  };
  $('#btn-logout').onclick = ()=>{ localStorage.removeItem('session'); location.reload(); };
}

// ---------- Settings ----------
const getSettings = ()=> LS.get('settings', defaultSettings);
const setSettings = (s)=>{ LS.set('settings', s); applySettingsColors(); applySettingsToPrint(); };
function applySettingsToForm(){
  const s=getSettings();
  $('#set-name').value = s.gname||'';
  $('#set-addr').value = s.gaddr||'';
  $('#set-hotline').value = s.ghotline||'';
  $('#set-logo').value = s.glogo||'';
  $('#set-brand').value = s.brand||defaultSettings.brand;
  $('#set-brand2').value = s.brand2||defaultSettings.brand2;
  $('#set-accent').value = s.accent||defaultSettings.accent;
  // QR
  $('#qr-bank').value = s.qrBank||'MB';
  $('#qr-acc').value  = s.qrAcc||'';
  $('#qr-name').value = s.qrName||'';
  $('#qr-amount').value = s.qrAmount||0;
  $('#qr-note').value = s.qrNote||'';
}
function applySettingsToPrint(){
  const s=getSettings();
  $('#p-gname').textContent=s.gname||'HÓA ĐƠN SỬA CHỮA';
  $('#p-gaddr').textContent=s.gaddr||'';
  $('#p-ghotline').textContent=s.ghotline||'';
  const logo=$('#p-logo'); if(s.glogo){ logo.src=s.glogo; logo.style.display='block'; } else logo.style.display='none';
}
function applySettingsColors(){
  const s=getSettings();
  const root=document.documentElement;
  root.style.setProperty('--brand', s.brand||defaultSettings.brand);
  root.style.setProperty('--brand-2', s.brand2||defaultSettings.brand2);
  root.style.setProperty('--accent', s.accent||defaultSettings.accent);
}

// ---------- Inventory ----------
function ensureInventory(){ let inv=LS.get('inventory'); if(!inv){ inv=seedInventory(); LS.set('inventory',inv) } return inv; }
function setInventory(inv){ LS.set('inventory', inv); }
function inventoryStats(){ const inv=ensureInventory(); return {count:inv.length, pieces:inv.reduce((a,b)=>a+(b.qty||0),0)} }

function productCardHTML(p){
  const img = p.img || placeholderImg;
  return `
    <img class="thumb" src="${img}" alt="${p.name}" onerror="this.src='${placeholderImg}'" />
    <div class="tag">${p.cat==='nhot'?'Nhớt':'Vỏ xe'}</div>
    <div style="font-weight:700">${p.name}</div>
    <div class="meta"><span>Giá</span><span class="price">${money(p.price)}</span></div>
    <div class="meta"><span>Tồn kho</span><span class="qty">${p.qty}</span></div>
    <div class="actions">
      <button class="btn btn-primary" data-act="sell" data-id="${p.id}">+ Bán 1</button>
      <button class="btn btn-ghost"   data-act="edit" data-id="${p.id}">Sửa</button>
      <button class="btn btn-danger"  data-act="del"  data-id="${p.id}">Xóa</button>
    </div>`;
}

function renderProducts(){
  const inv = ensureInventory();
  const cat = $('#filter-category').value;
  const q = ($('#search').value||'').toLowerCase();
  const grid = $('#products-grid'); grid.innerHTML='';
  const filtered = inv.filter(p => (cat==='all'||p.cat===cat) && (!q || (p.name||'').toLowerCase().includes(q)));
  if(!filtered.length){ grid.innerHTML = '<div class="muted" style="padding:24px;text-align:center">Không có sản phẩm phù hợp.</div>'; return; }
  for(const p of filtered){ const el=document.createElement('div'); el.className='product'; el.innerHTML=productCardHTML(p); grid.appendChild(el); }
  grid.onclick = (e)=>{
    const btn = e.target.closest('button'); if(!btn) return;
    const id = btn.getAttribute('data-id'); const act = btn.getAttribute('data-act');
    if(act==='sell') openSell(id);
    if(act==='del'){ if(confirm('Xóa sản phẩm này?')){ setInventory(ensureInventory().filter(x=>x.id!==id)); renderAll(); } }
    if(act==='edit') editProduct(id);
  };
}

function editProduct(id){
  const inv=ensureInventory(); const p=inv.find(x=>x.id===id); if(!p) return;
  $('#ap-category').value=p.cat; $('#ap-name').value=p.name; $('#ap-price').value=p.price; $('#ap-qty').value=p.qty; $('#ap-img').value=p.img||'';
  $('#sheet-add').classList.add('open');
  $('#ap-save').onclick = ()=>{
    p.cat=$('#ap-category').value; p.name=$('#ap-name').value.trim(); p.price=+$('#ap-price').value||0; p.qty=+$('#ap-qty').value||0; p.img=$('#ap-img').value.trim();
    setInventory(inv); $('#sheet-add').classList.remove('open'); clearAP(); renderAll();
  };
}
function clearAP(){ $('#ap-category').value='nhot'; $('#ap-name').value=''; $('#ap-price').value=''; $('#ap-qty').value='1'; $('#ap-img').value=''; }
function bindAddProduct(){
  $('#btn-add-product').onclick=()=>{
    clearAP(); $('#sheet-add').classList.add('open');
    $('#ap-save').onclick=()=>{
      const item={id:uid(), cat:$('#ap-category').value, name:$('#ap-name').value.trim(), price:+$('#ap-price').value||0, qty:+$('#ap-qty').value||0, img:$('#ap-img').value.trim()};
      if(!item.name){ alert('Nhập tên sản phẩm'); return }
      const inv=ensureInventory(); inv.unshift(item); setInventory(inv);
      $('#sheet-add').classList.remove('open'); clearAP(); renderAll();
    };
  };
  $('#close-add').onclick=()=> $('#sheet-add').classList.remove('open');
}

// ---------- Quick Sell ----------
function renderQuick(){
  const sel = $('#quick-product'); sel.innerHTML='';
  ensureInventory().forEach(p=>{
    const o=document.createElement('option'); o.value=p.id; o.textContent=`${p.name} — ${money(p.price)} — Tồn ${p.qty}`; sel.appendChild(o);
  });
  $('#stock-count').textContent = inventoryStats().count;
}
function bindQuick(){
  $('#btn-quick-sell').onclick = ()=>{
    const id = $('#quick-product').value; if(!id) return; openSell(id);
  };
}
function openSell(id){
  const p = ensureInventory().find(x=>x.id===id); if(!p) return;
  $('#sell-info').innerHTML = `Sản phẩm: <b>${p.name}</b> — Giá: <b>${money(p.price)}</b> — Tồn: <b>${p.qty}</b>`;
  $('#sheet-sell').classList.add('open');
  $('#sell-confirm').onclick = ()=>{
    const inv = ensureInventory(); const it = inv.find(x=>x.id===id);
    if(!it || it.qty<=0){ alert('Hết hàng!'); return; }
    it.qty -= 1; setInventory(inv); $('#sheet-sell').classList.remove('open'); renderAll();
  };
  $('#close-sell').onclick = ()=> $('#sheet-sell').classList.remove('open');
}

// ---------- Invoice ----------
let currentInvoice = { id:uid(), name:'', phone:'', plate:'', note:'', lines:[] };

function renderInvoiceSelectors(){
  const invSel = $('#inv-product'); invSel.innerHTML='';
  const inv = ensureInventory();
  inv.forEach(p=>{ const o=document.createElement('option'); o.value=p.id; o.textContent=`${p.name} — ${money(p.price)} — Tồn ${p.qty}`; invSel.appendChild(o); });
  const first = inv[0]; $('#inv-price').value = first ? first.price : 0;
}

function refreshInvoiceUI(){
  const tb = $('#invoice-body'); tb.innerHTML='';
  for(const line of currentInvoice.lines){
    const tr=document.createElement('tr');
    tr.innerHTML = `<td>${line.name}</td><td>${line.qty}</td><td>${money(line.price)}</td><td>${money(line.qty*line.price)}</td><td><button class="btn btn-ghost" data-remove="${line.id}">Xóa</button></td>`;
    tb.appendChild(tr);
  }
  tb.onclick=(e)=>{ const btn=e.target.closest('button'); if(!btn) return; const id=btn.getAttribute('data-remove'); currentInvoice.lines=currentInvoice.lines.filter(x=>x.id!==id); refreshInvoiceUI(); syncPrintable(); };

  const subtotal = currentInvoice.lines.reduce((a,b)=>a+b.qty*b.price,0);
  const discount = Math.max(0, +($('#discount').value||0));
  const labor    = Math.max(0, +($('#labor').value||0));
  const vatRate  = Math.max(0, +($('#vat').value||0));
  let base = Math.max(0, subtotal - discount) + labor;
  const vat = base * (vatRate/100);
  const grand = base + vat;

  $('#invoice-subtotal').textContent = money(subtotal);
  $('#invoice-total').textContent    = money(grand);

  syncPrintable(subtotal, discount, labor, vat, grand);
}

function syncPrintable(subtotal=0, discount=0, labor=0, vat=0, grand=0){
  $('#p-name').textContent  = currentInvoice.name||'—';
  $('#p-phone').textContent = currentInvoice.phone||'—';
  $('#p-plate').textContent = currentInvoice.plate||'—';
  const pb = $('#p-body'); pb.innerHTML='';
  for(const line of currentInvoice.lines){
    const tr=document.createElement('tr');
    tr.innerHTML = `<td>${line.name}</td><td>${line.qty}</td><td>${money(line.price)}</td><td>${money(line.qty*line.price)}</td>`;
    pb.appendChild(tr);
  }
  $('#p-subtotal').textContent = money(subtotal);
  $('#p-discount').textContent = money(discount);
  $('#p-labor').textContent    = money(labor);
  $('#p-vat').textContent      = money(vat);
  $('#p-total').textContent    = money(grand);
  $('#p-note').innerHTML = currentInvoice.note ? `<b>Ghi chú:</b> ${currentInvoice.note}` : '';
}

function bindInvoice(){
  $('#seg-stock').onclick=()=>{ $('#seg-stock').classList.add('active'); $('#seg-manual').classList.remove('active'); $('#from-stock').style.display='block'; $('#from-manual').style.display='none'; };
  $('#seg-manual').onclick=()=>{ $('#seg-manual').classList.add('active'); $('#seg-stock').classList.remove('active'); $('#from-manual').style.display='block'; $('#from-stock').style.display='none'; };

  $('#btn-add-line').onclick=()=>{
    const id=$('#inv-product').value, qty=Math.max(1,+$('#inv-qty').value||1), price=Math.max(0,+$('#inv-price').value||0);
    const inv=ensureInventory(); const p=inv.find(x=>x.id===id);
    if(!p){ alert('Chưa chọn sản phẩm'); return }
    if(p.qty < qty){ alert('Tồn kho không đủ!'); return }
    currentInvoice.lines.push({ id:uid(), pid:p.id, name:p.name, price, qty });
    refreshInvoiceUI();
  };

  $('#btn-add-manual').onclick=()=>{
    const name=$('#man-name').value.trim(), qty=Math.max(1,+$('#man-qty').value||1), price=Math.max(0,+$('#man-price').value||0);
    if(!name){ alert('Nhập tên dòng (Loại sản phẩm thay)'); return }
    currentInvoice.lines.push({ id:uid(), pid:null, name, price, qty });
    $('#man-name').value=''; $('#man-qty').value='1'; $('#man-price').value='0';
    refreshInvoiceUI();
  };

  $('#cust-name').oninput =(e)=>{ currentInvoice.name  = e.target.value; syncPrintable(); };
  $('#cust-phone').oninput=(e)=>{ currentInvoice.phone = e.target.value; syncPrintable(); };
  $('#cust-plate').oninput=(e)=>{ currentInvoice.plate = e.target.value; syncPrintable(); };
  $('#cust-note').oninput =(e)=>{ currentInvoice.note  = e.target.value; syncPrintable(); };
  $('#inv-product').onchange=()=>{ const id=$('#inv-product').value; const p=ensureInventory().find(x=>x.id===id); $('#inv-price').value=p?p.price:0; };
  $('#discount').oninput = $('#labor').oninput = $('#vat').oninput = refreshInvoiceUI;

  $('#btn-clear-invoice').onclick=()=>{ if(confirm('Xóa hết dòng trên hóa đơn?')){ currentInvoice.lines=[]; refreshInvoiceUI(); } };
  $('#btn-print').onclick = ()=> window.print();
  $('#btn-export-csv').onclick = exportCurrentInvoiceCSV;
  $('#btn-export-xlsx').onclick = exportCurrentInvoiceXLSX;
  $('#btn-save-invoice').onclick = saveInvoice;
}

function saveInvoice(){
  if(!currentInvoice.lines.length){ alert('Hóa đơn trống'); return }
  if(!($('#cust-plate').value||'').trim()){ alert('Vui lòng nhập BIỂN SỐ XE trước khi lưu hóa đơn.'); $('#cust-plate').focus(); return }

  const subtotal = currentInvoice.lines.reduce((a,b)=>a+b.qty*b.price,0);
  const discount = Math.max(0, +($('#discount').value||0));
  const labor    = Math.max(0, +($('#labor').value||0));
  const vatRate  = Math.max(0, +($('#vat').value||0));
  let base = Math.max(0, subtotal - discount) + labor;
  const vat = base * (vatRate/100);
  const grand = base + vat;

  const inv = ensureInventory();
  for(const line of currentInvoice.lines){
    if(line.pid){
      const it = inv.find(x=>x.id===line.pid); if(!it){ alert('Sản phẩm không còn trong kho'); return }
      if(it.qty < line.qty){ alert('Kho không đủ cho: '+it.name); return }
      it.qty -= line.qty;
    }
  }
  setInventory(inv);

  const doc = { ...currentInvoice, subtotal, discount, labor, vat, total: grand, createdAt: Date.now() };
  const all = LS.get('invoices',[]);
  all.unshift(doc); LS.set('invoices', all);
  alert('Đã lưu hóa đơn!');

  currentInvoice = { id:uid(), name:'', phone:'', plate:'', note:'', lines:[] };
  $('#cust-name').value=''; $('#cust-phone').value=''; $('#cust-plate').value=''; $('#cust-note').value='';
  renderAll();
}

// ---------- Export CSV ----------
function exportCurrentInvoiceCSV(){
  if(!currentInvoice.lines.length){ alert('Chưa có dòng nào trong hóa đơn'); return }
  const s = getSettings();
  const subtotal = currentInvoice.lines.reduce((a,b)=>a+b.qty*b.price,0);
  const discount = Math.max(0, +($('#discount').value||0));
  const labor    = Math.max(0, +($('#labor').value||0));
  const vatRate  = Math.max(0, +($('#vat').value||0));
  let base = Math.max(0, subtotal - discount) + labor;
  const vat = base * (vatRate/100);
  const grand = base + vat;

  const rows = [];
  rows.push(['Garage', s.gname||'', 'Hotline', s.ghotline||'']);
  rows.push(['Địa chỉ', s.gaddr||'']);
  rows.push(['Khách', currentInvoice.name||'', 'SĐT', currentInvoice.phone||'']);
  rows.push(['Biển số', currentInvoice.plate||'', 'Ghi chú', (currentInvoice.note||'').replace(/\n/g,' ') ]);
  rows.push([]);
  rows.push(['Tên hạng mục','SL','Đơn giá','Thành tiền']);
  for(const l of currentInvoice.lines) rows.push([l.name, l.qty, l.price, l.qty*l.price]);
  rows.push([]);
  rows.push(['Tổng (hạng mục)','', '', subtotal]);
  rows.push(['Chiết khấu','', '', -discount]);
  rows.push(['Công thợ','', '', labor]);
  rows.push([`VAT (${vatRate}%)`,'','', vat]);
  rows.push(['Tổng cuối','', '', grand]);

  const csv = rows.map(r=> r.map(x=>`"${(x??'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(["\ufeff"+csv], {type:'text/csv;charset=utf-8;'});
  const fileName = `hoa_don_${(currentInvoice.name||'khach').replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.csv`;
  const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=fileName; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

// ---------- Export XLSX (SheetJS) ----------
function exportCurrentInvoiceXLSX(){
  if(!currentInvoice.lines.length){ alert('Chưa có dòng nào trong hóa đơn'); return }
  const s = getSettings();
  const subtotal = currentInvoice.lines.reduce((a,b)=>a+b.qty*b.price,0);
  const discount = Math.max(0, +($('#discount').value||0));
  const labor    = Math.max(0, +($('#labor').value||0));
  const vatRate  = Math.max(0, +($('#vat').value||0));
  let base = Math.max(0, subtotal - discount) + labor;
  const vat = base * (vatRate/100);
  const grand = base + vat;

  const rows = [];
  rows.push(['Garage', s.gname||'', 'Hotline', s.ghotline||'']);
  rows.push(['Địa chỉ', s.gaddr||'']);
  rows.push(['Khách', currentInvoice.name||'', 'SĐT', currentInvoice.phone||'']);
  rows.push(['Biển số', currentInvoice.plate||'', 'Ghi chú', (currentInvoice.note||'').replace(/\n/g,' ') ]);
  rows.push([]);
  rows.push(['Tên hạng mục','SL','Đơn giá','Thành tiền']);
  for(const l of currentInvoice.lines) rows.push([l.name, l.qty, l.price, l.qty*l.price]);
  rows.push([]);
  rows.push(['Tổng (hạng mục)','', '', subtotal]);
  rows.push(['Chiết khấu','', '', -discount]);
  rows.push(['Công thợ','', '', labor]);
  rows.push([`VAT (${vatRate}%)`,'','', vat]);
  rows.push(['Tổng cuối','', '', grand]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'HoaDon');
  const fileName = `hoa_don_${(currentInvoice.name||'khach').replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// ---------- History ----------
function renderHistory(){
  const wrap = $('#history-list'); const list = LS.get('invoices',[]);
  if(!list.length){ wrap.innerHTML = '<div class="muted" style="padding:24px;text-align:center">Chưa có hóa đơn nào.</div>'; return }
  wrap.innerHTML=''; 
  for(const h of list){
    const d = new Date(h.createdAt);
    const el = document.createElement('div'); el.className='card';
    el.innerHTML = `
      <div class="row" style="gap:8px;align-items:center">
        <div class="grow">
          <b>${h.name||'Khách lẻ'}</b> • ${h.phone||'—'} • ${h.plate||'—'}
          <div class="muted">${d.toLocaleString('vi-VN')}</div>
        </div>
        <div style="font-weight:800">${money(h.total)}</div>
        <button class="btn btn-primary" data-id="${h.id}" style="width:auto">Xem/In</button>
      </div>`;
    wrap.appendChild(el);
  }
  wrap.onclick=(e)=>{
    const btn=e.target.closest('button'); if(!btn) return;
    const id=btn.getAttribute('data-id');
    const h = LS.get('invoices',[]).find(x=>x.id===id); if(!h) return;
    currentInvoice = JSON.parse(JSON.stringify(h));
    const pb=$('#p-body'); pb.innerHTML='';
    for(const line of currentInvoice.lines){
      const tr=document.createElement('tr');
      tr.innerHTML = `<td>${line.name}</td><td>${line.qty}</td><td>${money(line.price)}</td><td>${money(line.qty*line.price)}</td>`;
      pb.appendChild(tr);
    }
    $('#p-name').textContent=currentInvoice.name||'—';
    $('#p-phone').textContent=currentInvoice.phone||'—';
    $('#p-plate').textContent=currentInvoice.plate||'—';
    $('#p-subtotal').textContent=money(h.subtotal||0);
    $('#p-discount').textContent=money(h.discount||0);
    $('#p-labor').textContent=money(h.labor||0);
    $('#p-vat').textContent=money(h.vat||0);
    $('#p-total').textContent=money(h.total||0);
    $('#p-note').innerHTML = currentInvoice.note ? `<b>Ghi chú:</b> ${currentInvoice.note}` : '';
    window.scrollTo({top:0,behavior:'smooth'});
    alert('Hóa đơn đã nạp lên khung in. Bấm In / Lưu PDF để lưu về máy.');
  };
}

// ---------- VietQR ----------
function buildVietQRUrl(){
  const s = getSettings();
  const bank = ( $('#qr-bank').value || s.qrBank || 'MB' ).trim().toUpperCase();
  const acc  = ( $('#qr-acc').value  || s.qrAcc  || '' ).trim();
  const name = ( $('#qr-name').value || s.qrName || '' ).trim().toUpperCase();
  const amount = Math.max(0, +($('#qr-amount').value || s.qrAmount || 0));
  const note = ( $('#qr-note').value || s.qrNote || '' ).trim();

  if(!bank || !acc){ return '' }
  const p = new URLSearchParams();
  if(amount>0) p.set('amount', amount);
  if(note)     p.set('addInfo', note);
  if(name)     p.set('accountName', name);
  return `https://img.vietqr.io/image/${encodeURIComponent(bank)}-${encodeURIComponent(acc)}-compact2.png?${p.toString()}`;
}
function showQR(){
  const url = buildVietQRUrl();
  if(!url){ alert('Vui lòng nhập ít nhất Mã ngân hàng (VD: MB) và Số tài khoản.'); return }
  $('#qr-preview').src = url;
  $('#qr-caption').textContent = 'QR VietQR (chuẩn EMVCo) — quét bằng app ngân hàng để chuyển khoản nhanh.';
  $('#qr-preview-wrap').style.display='grid';

  const s = getSettings();
  setSettings({
    ...s,
    qrBank: ($('#qr-bank').value||'MB').trim().toUpperCase(),
    qrAcc:  ($('#qr-acc').value||'').trim(),
    qrName: ($('#qr-name').value||'').trim().toUpperCase(),
    qrAmount: Math.max(0, +($('#qr-amount').value||0)),
    qrNote: ($('#qr-note').value||'').trim()
  });
}

// ---------- Tabs ----------
function switchTab(tab){
  $$('.tab-btn').forEach(b=>b.classList.toggle('active', b.dataset.tab===tab));
  $('#tab-products').style.display = tab==='products' ? 'block':'none';
  $('#tab-sell').style.display     = tab==='sell'     ? 'block':'none';
  $('#tab-invoice').style.display  = tab==='invoice'  ? 'block':'none';
  $('#tab-history').style.display  = tab==='history'  ? 'block':'none';
  $('#tab-settings').style.display = tab==='settings' ? 'block':'none';

  const sel = $('#tab-select');
  if(sel && sel.value !== tab) sel.value = tab;

  window.scrollTo({top:0,behavior:'smooth'});
  if(tab==='settings') applySettingsToForm();
}
function bindTabs(){
  $$('.tab-btn').forEach(b=> b.onclick=()=>{ switchTab(b.dataset.tab); renderAll(); });
  const sel = $('#tab-select');
  if(sel){ sel.onchange = e => { switchTab(e.target.value); renderAll(); }; }
}

// ---------- Header collapse ----------
const HDR_KEY = 'headerCollapsed';
function applyHeaderCollapsed(){
  const collapsed = LS.get(HDR_KEY,false);
  const topbar = $('#topbar');
  topbar.classList.toggle('collapsed', !!collapsed);
  $('#btn-toggle-header').textContent = collapsed ? '⌄ Mở rộng' : '⌃ Thu gọn';
}
function bindHeaderToggle(){
  $('#btn-toggle-header').onclick = ()=>{
    const cur = !!LS.get(HDR_KEY,false);
    LS.set(HDR_KEY, !cur);
    applyHeaderCollapsed();
  };
}

// ---------- Global render ----------
function renderAll(){
  renderProducts();
  renderQuick();
  renderInvoiceSelectors();
  refreshInvoiceUI();
  renderHistory();
}

// ---------- Boot ----------
window.addEventListener('load', ()=>{
  initAuth();
  bindAddProduct();
  bindQuick();
  bindInvoice();
  bindTabs();
  bindHeaderToggle();

  // Filter & search events
  $('#filter-category').onchange=renderProducts;
  $('#search').oninput=renderProducts;

  // Reset sample data
  $('#btn-reset').onclick=()=>{ if(confirm('Khôi phục dữ liệu mẫu?')){ LS.set('inventory', seedInventory()); renderAll(); } };

  // Save settings & QR
  $('#btn-save-settings').onclick=()=>{
    const s = getSettings();
    const ns = {
      gname: $('#set-name').value.trim(),
      gaddr: $('#set-addr').value.trim(),
      ghotline: $('#set-hotline').value.trim(),
      glogo: $('#set-logo').value.trim(),
      brand: $('#set-brand').value,
      brand2: $('#set-brand2').value,
      accent: $('#set-accent').value,
      qrBank: ($('#qr-bank').value||s.qrBank||'MB').trim().toUpperCase(),
      qrAcc:  ($('#qr-acc').value ||s.qrAcc ||'').trim(),
      qrName: ($('#qr-name').value||s.qrName||'').trim().toUpperCase(),
      qrAmount: Math.max(0, +($('#qr-amount').value||s.qrAmount||0)),
      qrNote: ($('#qr-note').value||s.qrNote||'').trim()
    };
    setSettings(ns);
    alert('Đã lưu cài đặt & màu sắc.');
  };

  $('#btn-show-qr').onclick = showQR;
});
