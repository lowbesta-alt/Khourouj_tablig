/* =====================================================================
   KHOUROUJ TABLIGH — app.js (Version Supabase)
   ===================================================================== */

/* ----------------------- CONFIGURATION SUPABASE ----------------------- */
// ⚠️ REMPLACEZ CES DEUX VALEURS PAR CELLES DE VOTRE PROJET SUPABASE ⚠️
const SUPABASE_URL = 'VOTRE_PROJECT_URL_ICI';
const SUPABASE_ANON_KEY = 'VOTRE_CLE_ANON_ICI';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ----------------------- HELPERS ----------------------- */
function uid() { return Math.random().toString(36).slice(2, 9); }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ----------------------- CALCUL DES DATES ----------------------- */
function getNthFriday(year, month, n) {
  const first = new Date(year, month - 1, 1);
  const firstDow = first.getDay();
  const daysUntilFri = (5 - firstDow + 7) % 7;
  const day = 1 + daysUntilFri + (n - 1) * 7;
  return new Date(year, month - 1, day);
}

function getOusboueDates(year, month, ousboue) {
  const friday = getNthFriday(year, month, ousboue);
  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);
  return { friday, sunday };
}

function getStatus(friday, sunday) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const f = new Date(friday); f.setHours(0, 0, 0, 0);
  const s = new Date(sunday); s.setHours(23, 59, 59, 999);
  if (today > s) return { label: 'Terminée', cls: 'bg-gray-200 text-gray-700' };
  if (today >= f) return { label: 'En cours', cls: 'bg-orange-100 text-orange-800' };
  return { label: 'À venir', cls: 'bg-emerald-100 text-emerald-800' };
}

function formatLongDate(d) {
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' });
}

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

/* ----------------------- DONNÉES (CACHE) ----------------------- */
// Pour éviter de recharger les données à chaque clic, on les garde en mémoire
let dataCache = { pays: [], villes: [], halakat: [], mosquees: [] };

async function loadData() {
  const { data: pays, error: e1 } = await supabase.from('pays').select('*');
  const { data: villes, error: e2 } = await supabase.from('villes').select('*');
  const { data: halakat, error: e3 } = await supabase.from('halakat').select('*');
  const { data: mosquees, error: e4 } = await supabase.from('mosquees').select('*');

  if (e1 || e2 || e3 || e4) {
    console.error('Erreur de chargement:', e1, e2, e3, e4);
    return;
  }
  dataCache = { pays: pays || [], villes: villes || [], halakat: halakat || [], mosquees: mosquees || [] };
}

async function reloadDataAndRefresh() {
  await loadData();
  refreshConsultationSelects();
  renderAdminLists();
  renderPlanning();
}

/* ----------------------- CONSULTATION ----------------------- */
async function initConsultation() {
  const yearSel = document.getElementById('sel-annee');
  const curYear = new Date().getFullYear();
  yearSel.innerHTML = '';
  for (let y = curYear - 1; y <= curYear + 1; y++) {
    const o = document.createElement('option');
    o.value = y; o.textContent = y;
    if (y === curYear) o.selected = true;
    yearSel.appendChild(o);
  }

  const monthSel = document.getElementById('sel-mois');
  monthSel.innerHTML = '';
  MONTHS.forEach((m, i) => {
    const o = document.createElement('option');
    o.value = i + 1; o.textContent = m;
    if (i === new Date().getMonth()) o.selected = true;
    monthSel.appendChild(o);
  });

  await loadData();
  refreshConsultationSelects();

  document.getElementById('sel-pays').addEventListener('change', onPaysChange);
  document.getElementById('sel-ville').addEventListener('change', onVilleChange);
  document.getElementById('sel-halaka').addEventListener('change', renderPlanning);
  yearSel.addEventListener('change', renderPlanning);
  monthSel.addEventListener('change', renderPlanning);
  document.getElementById('btn-whatsapp').addEventListener('click', exportWhatsApp);
  document.getElementById('btn-print').addEventListener('click', () => window.print());
}

function refreshConsultationSelects() {
  const data = dataCache;
  const paysSel = document.getElementById('sel-pays');
  const prev = paysSel.value;
  paysSel.innerHTML = '<option value="">-- Choisir un pays --</option>' +
    data.pays.map(p => `<option value="${p.id}">${escapeHtml(p.nom)}</option>`).join('');
  if (prev && data.pays.some(p => String(p.id) === prev)) {
    paysSel.value = prev;
    onPaysChange();
  } else {
    document.getElementById('sel-ville').innerHTML = '<option value="">-- Choisir une ville --</option>';
    document.getElementById('sel-halaka').innerHTML = '<option value="">-- Choisir une halaka --</option>';
    hidePlanning();
  }
}

function onPaysChange() {
  const data = dataCache;
  const paysId = document.getElementById('sel-pays').value;
  const villeSel = document.getElementById('sel-ville');
  const halakaSel = document.getElementById('sel-halaka');
  villeSel.innerHTML = '<option value="">-- Choisir une ville --</option>';
  halakaSel.innerHTML = '<option value="">-- Choisir une halaka --</option>';
  hidePlanning();
  if (!paysId) return;
  data.villes.filter(v => String(v.pays_id) === paysId).forEach(v => {
    villeSel.insertAdjacentHTML('beforeend', `<option value="${v.id}">${escapeHtml(v.nom)}</option>`);
  });
}

function onVilleChange() {
  const data = dataCache;
  const villeId = document.getElementById('sel-ville').value;
  const halakaSel = document.getElementById('sel-halaka');
  halakaSel.innerHTML = '<option value="">-- Choisir une halaka --</option>';
  hidePlanning();
  if (!villeId) return;
  data.halakat.filter(h => String(h.ville_id) === villeId).forEach(h => {
    halakaSel.insertAdjacentHTML('beforeend', `<option value="${h.id}">${escapeHtml(h.nom)}</option>`);
  });
}

function hidePlanning() {
  document.getElementById('planning-empty').classList.remove('hidden');
  document.getElementById('planning-content').classList.add('hidden');
}

function renderPlanning() {
  const data = dataCache;
  const halakaId = document.getElementById('sel-halaka').value;
  if (!halakaId) return hidePlanning();

  const year  = +document.getElementById('sel-annee').value;
  const month = +document.getElementById('sel-mois').value;

  const halaka = data.halakat.find(h => String(h.id) === halakaId);
  const ville  = data.villes.find(v => String(v.id) === String(halaka.ville_id));
  const pays   = data.pays.find(p => String(p.id) === String(ville.pays_id));

  const mosquees = data.mosquees
    .filter(m => String(m.halaka_id) === halakaId)
    .sort((a, b) => a.ousboue - b.ousboue || a.nom.localeCompare(b.nom));

  document.getElementById('planning-empty').classList.add('hidden');
  document.getElementById('planning-content').classList.remove('hidden');
  document.getElementById('planning-title').textContent = `${halaka.nom} — ${ville.nom}, ${pays.nom}`;
  document.getElementById('planning-subtitle').textContent = `Programme de ${MONTHS[month - 1]} ${year}`;

  const tbody = document.getElementById('planning-tbody');
  tbody.innerHTML = '';

  if (mosquees.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-gray-500">Aucune mosquée enregistrée dans cette halaka.</td></tr>';
    return;
  }

  mosquees.forEach(m => {
    const { friday, sunday } = getOusboueDates(year, month, m.ousboue);
    const st = getStatus(friday, sunday);
    const tr = document.createElement('tr');
    tr.className = 'border-t';
    tr.innerHTML = `
      <td class="p-3">
        <div class="font-medium">${escapeHtml(m.nom)}</div>
        ${m.responsable ? `<div class="text-xs text-gray-500">${escapeHtml(m.responsable)}${m.contact ? ' · ' + escapeHtml(m.contact) : ''}</div>` : ''}
      </td>
      <td class="p-3 text-center">Ousboue ${m.ousboue}</td>
      <td class="p-3 text-center">${formatLongDate(friday)} → ${formatLongDate(sunday)}</td>
      <td class="p-3 text-center"><span class="inline-block px-2 py-1 rounded text-xs font-medium ${st.cls}">${st.label}</span></td>`;
    tbody.appendChild(tr);
  });
}

/* ----------------------- EXPORT WHATSAPP ----------------------- */
function exportWhatsApp() {
  const data = dataCache;
  const halakaId = document.getElementById('sel-halaka').value;
  if (!halakaId) return;
  const year  = +document.getElementById('sel-annee').value;
  const month = +document.getElementById('sel-mois').value;
  const halaka = data.halakat.find(h => String(h.id) === halakaId);
  const ville  = data.villes.find(v => String(v.id) === String(halaka.ville_id));
  const pays   = data.pays.find(p => String(p.id) === String(ville.pays_id));
  const mosquees = data.mosquees.filter(m => String(m.halaka_id) === halakaId).sort((a, b) => a.ousboue - b.ousboue || a.nom.localeCompare(b.nom));

  let txt = `🕌 *Programme des sorties 3 jours*\n📍 ${pays.nom} — ${ville.nom}\n⭕ ${halaka.nom}\n🗓️ ${MONTHS[month - 1]} ${year}\n\n`;
  mosquees.forEach((m, i) => {
    const { friday, sunday } = getOusboueDates(year, month, m.ousboue);
    txt += `${i + 1}. *${m.nom}* — Ousboue ${m.ousboue}\n   📅 ${formatLongDate(friday)} → ${formatLongDate(sunday)}\n`;
  });
  txt += `\nبارك الله فيكم`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(txt).then(() => alert('✅ Texte copié ! Collez-le dans WhatsApp.')).catch(() => prompt('Copiez ce texte :', txt));
  } else { prompt('Copiez ce texte :', txt); }
}

/* ----------------------- ADMIN ----------------------- */
async function initAdmin() {
  document.getElementById('view-admin').innerHTML = `
    <div class="space-y-6">
      <div class="bg-white rounded-lg shadow p-4 md:p-6">
        <h2 class="text-lg font-bold mb-3">🌍 Pays</h2>
        <div class="flex flex-col sm:flex-row gap-2 mb-3">
          <input id="inp-pays" class="flex-1 border rounded px-3 py-2" placeholder="Nom du pays">
          <button onclick="addPays()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded">Ajouter</button>
        </div>
        <div id="list-pays" class="space-y-2"></div>
      </div>
      <div class="bg-white rounded-lg shadow p-4 md:p-6">
        <h2 class="text-lg font-bold mb-3">🏙️ Villes</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
          <select id="inp-ville-pays" class="border rounded px-3 py-2"></select>
          <input id="inp-ville" class="border rounded px-3 py-2" placeholder="Nom de la ville">
          <button onclick="addVille()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded">Ajouter</button>
        </div>
        <div id="list-villes" class="space-y-2"></div>
      </div>
      <div class="bg-white rounded-lg shadow p-4 md:p-6">
        <h2 class="text-lg font-bold mb-3">⭕ Halakat</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
          <select id="inp-halaka-ville" class="border rounded px-3 py-2"></select>
          <input id="inp-halaka" class="border rounded px-3 py-2" placeholder="Nom de la halaka">
          <button onclick="addHalaka()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded">Ajouter</button>
        </div>
        <div id="list-halakat" class="space-y-2"></div>
      </div>
      <div class="bg-white rounded-lg shadow p-4 md:p-6">
        <h2 class="text-lg font-bold mb-3">🕌 Mosquées</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-2 mb-3">
          <select id="inp-mos-halaka" class="border rounded px-3 py-2"></select>
          <input id="inp-mos-nom" class="border rounded px-3 py-2" placeholder="Nom de la mosquée">
          <select id="inp-mos-ousboue" class="border rounded px-3 py-2">
            <option value="1">Ousboue 1</option><option value="2">Ousboue 2</option><option value="3">Ousboue 3</option><option value="4">Ousboue 4</option>
          </select>
          <input id="inp-mos-resp" class="border rounded px-3 py-2" placeholder="Responsable">
          <input id="inp-mos-tel" class="border rounded px-3 py-2" placeholder="Téléphone">
          <button onclick="addMosquee()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded">Ajouter</button>
        </div>
        <div id="list-mosquees" class="space-y-2"></div>
      </div>
    </div>`;
  renderAdminLists();
}

function renderAdminLists() {
  const data = dataCache;

  document.getElementById('list-pays').innerHTML = data.pays.map(p =>
    `<div class="flex justify-between items-center border rounded px-3 py-2"><span>${escapeHtml(p.nom)}</span><button onclick="deletePays(${p.id})" class="text-red-600 text-sm hover:underline">Supprimer</button></div>`
  ).join('') || '<p class="text-gray-500 text-sm">Aucun pays.</p>';

  const vp = document.getElementById('inp-ville-pays');
  const prevVp = vp.value;
  vp.innerHTML = data.pays.map(p => `<option value="${p.id}">${escapeHtml(p.nom)}</option>`).join('');
  if (prevVp && data.pays.some(p => String(p.id) === prevVp)) vp.value = prevVp;

  document.getElementById('list-villes').innerHTML = data.villes.map(v => {
    const p = data.pays.find(x => String(x.id) === String(v.pays_id));
    return `<div class="flex justify-between items-center border rounded px-3 py-2"><span>${escapeHtml(v.nom)} <span class="text-xs text-gray-500">(${escapeHtml(p?.nom || '?')})</span></span><button onclick="deleteVille(${v.id})" class="text-red-600 text-sm hover:underline">Supprimer</button></div>`;
  }).join('') || '<p class="text-gray-500 text-sm">Aucune ville.</p>';

  const hv = document.getElementById('inp-halaka-ville');
  const prevHv = hv.value;
  hv.innerHTML = data.villes.map(v => {
    const p = data.pays.find(x => String(x.id) === String(v.pays_id));
    return `<option value="${v.id}">${escapeHtml(v.nom)} (${escapeHtml(p?.nom || '?')})</option>`;
  }).join('');
  if (prevHv && data.villes.some(v => String(v.id) === prevHv)) hv.value = prevHv;

  document.getElementById('list-halakat').innerHTML = data.halakat.map(h => {
    const v = data.villes.find(x => String(x.id) === String(h.ville_id));
    return `<div class="flex justify-between items-center border rounded px-3 py-2"><span>${escapeHtml(h.nom)} <span class="text-xs text-gray-500">(${escapeHtml(v?.nom || '?')})</span></span><button onclick="deleteHalaka(${h.id})" class="text-red-600 text-sm hover:underline">Supprimer</button></div>`;
  }).join('') || '<p class="text-gray-500 text-sm">Aucune halaka.</p>';

  const mh = document.getElementById('inp-mos-halaka');
  const prevMh = mh.value;
  mh.innerHTML = data.halakat.map(h => {
    const v = data.villes.find(x => String(x.id) === String(h.ville_id));
    return `<option value="${h.id}">${escapeHtml(h.nom)} — ${escapeHtml(v?.nom || '?')}</option>`;
  }).join('');
  if (prevMh && data.halakat.some(h => String(h.id) === prevMh)) mh.value = prevMh;

  document.getElementById('list-mosquees').innerHTML = data.mosquees.map(m => {
    const h = data.halakat.find(x => String(x.id) === String(m.halaka_id));
    return `<div class="flex flex-col md:flex-row md:justify-between md:items-center gap-2 border rounded px-3 py-2">
      <div><span class="font-medium">${escapeHtml(m.nom)}</span><span class="text-xs text-gray-500">— ${escapeHtml(h?.nom || '?')}</span>${m.responsable ? `<span class="text-xs text-gray-500">· ${escapeHtml(m.responsable)}</span>` : ''}</div>
      <div class="flex items-center gap-2">
        <select onchange="updateOusboue(${m.id}, this.value)" class="border rounded px-2 py-1 text-sm">${[1,2,3,4].map(n => `<option value="${n}" ${m.ousboue === n ? 'selected' : ''}>Ousboue ${n}</option>`).join('')}</select>
        <button onclick="deleteMosquee(${m.id})" class="text-red-600 text-sm hover:underline">Supprimer</button>
      </div>
    </div>`;
  }).join('') || '<p class="text-gray-500 text-sm">Aucune mosquée.</p>';
}

/* --------- CRUD SUPABASE --------- */
async function addPays() {
  const nom = document.getElementById('inp-pays').value.trim(); if (!nom) return;
  await supabase.from('pays').insert({ nom });
  document.getElementById('inp-pays').value = '';
  await reloadDataAndRefresh();
}

async function deletePays(id) {
  if (!confirm('Supprimer ce pays et tout son contenu ?')) return;
  await supabase.from('pays').delete().eq('id', id);
  await reloadDataAndRefresh();
}

async function addVille() {
  const pays_id = document.getElementById('inp-ville-pays').value;
  const nom = document.getElementById('inp-ville').value.trim(); if (!pays_id || !nom) return;
  await supabase.from('villes').insert({ nom, pays_id });
  document.getElementById('inp-ville').value = '';
  await reloadDataAndRefresh();
}

async function deleteVille(id) {
  if (!confirm('Supprimer cette ville et tout son contenu ?')) return;
  await supabase.from('villes').delete().eq('id', id);
  await reloadDataAndRefresh();
}

async function addHalaka() {
  const ville_id = document.getElementById('inp-halaka-ville').value;
  const nom = document.getElementById('inp-halaka').value.trim(); if (!ville_id || !nom) return;
  await supabase.from('halakat').insert({ nom, ville_id });
  document.getElementById('inp-halaka').value = '';
  await reloadDataAndRefresh();
}

async function deleteHalaka(id) {
  if (!confirm('Supprimer cette halaka et ses mosquées ?')) return;
  await supabase.from('halakat').delete().eq('id', id);
  await reloadDataAndRefresh();
}

async function addMosquee() {
  const halaka_id = document.getElementById('inp-mos-halaka').value;
  const nom = document.getElementById('inp-mos-nom').value.trim();
  const ousboue = +document.getElementById('inp-mos-ousboue').value;
  const responsable = document.getElementById('inp-mos-resp').value.trim();
  const contact = document.getElementById('inp-mos-tel').value.trim();
  if (!halaka_id || !nom) return;
  await supabase.from('mosquees').insert({ nom, halaka_id, ousboue, responsable, contact });
  document.getElementById('inp-mos-nom').value = '';
  document.getElementById('inp-mos-resp').value = '';
  document.getElementById('inp-mos-tel').value = '';
  await reloadDataAndRefresh();
}

async function deleteMosquee(id) {
  if (!confirm('Supprimer cette mosquée ?')) return;
  await supabase.from('mosquees').delete().eq('id', id);
  await reloadDataAndRefresh();
}

async function updateOusboue(id, value) {
  await supabase.from('mosquees').update({ ousboue: +value }).eq('id', id);
  await reloadDataAndRefresh();
}

/* ----------------------- ONGLETS ----------------------- */
function switchTab(tab) {
  const isConsult = tab === 'consult';
  document.getElementById('view-consult').classList.toggle('hidden', !isConsult);
  document.getElementById('view-admin').classList.toggle('hidden', isConsult);
  const active = 'px-4 py-3 font-medium border-b-2 border-emerald-600 text-emerald-700';
  const idle = 'px-4 py-3 font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-800';
  document.getElementById('tab-consult').className = 'tab-btn ' + (isConsult ? active : idle);
  document.getElementById('tab-admin').className = 'tab-btn ' + (!isConsult ? active : idle);
}

/* ----------------------- INIT ----------------------- */
document.addEventListener('DOMContentLoaded', async () => {
  await initConsultation();
  await initAdmin();
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
});
