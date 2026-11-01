// CONFIGURATION
const SUPABASE_URL = 'https://rhtaqusrkgqawtbqysgw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_JIjs3oxZszYHTaON8iH06g_-mnoCVfl'; 
const MASTER_PASSWORD = "admin2024"; 
let dataCache = { pays: [], villes: [], halakat: [], mosquees: [] };

// OUTILS
function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function generateRandomCode(name) { return name.toUpperCase().substring(0,6) + "-" + Math.random().toString(36).substring(2,6).toUpperCase(); }
function saveToLocalStorage() { localStorage.setItem('khourouj_cache', JSON.stringify(dataCache)); }
function loadFromLocalStorage() { const c = localStorage.getItem('khourouj_cache'); if (c) { try { dataCache = JSON.parse(c); return true; } catch(e) {} } return false; }

// INITIALISATION
const script = document.createElement('script'); 
script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
script.onload = async () => {
    window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await loadData(); 
    document.getElementById('loading-screen').style.display = 'none';
    switchTab('consult');
};
document.body.appendChild(script);

async function loadData() {
    try { const { data } = await supabase.from('pays').select('*'); dataCache.pays = data || []; } catch(e) {}
    try { const { data } = await supabase.from('villes').select('*'); dataCache.villes = data || []; } catch(e) {}
    try { const { data } = await supabase.from('halakat').select('*'); dataCache.halakat = data || []; } catch(e) {}
    try { const { data } = await supabase.from('mosquees').select('*'); dataCache.mosquees = data || []; } catch(e) {}
    saveToLocalStorage();
}

async function syncData() { await loadData(); refreshConsult(); if (document.getElementById('view-stats').classList.contains('hidden') === false) refreshStats(); }

// NAVIGATION
window.switchTab = function(tab) {
    document.getElementById('view-consult').classList.add('hidden'); 
    document.getElementById('view-stats').classList.add('hidden'); 
    document.getElementById('view-admin').classList.add('hidden');
    document.getElementById('view-' + tab).classList.remove('hidden');
    if (tab === 'consult') refreshConsult();
    if (tab === 'stats') refreshStats();
}

window.closeModal = function() { document.getElementById('modal').classList.add('hidden'); };

// CONNEXION
window.openAdminLoginModal = function() {
    document.getElementById('modal-content').innerHTML = `
        <h3 class="text-xl font-bold mb-4">🔒 Accès Gestionnaire</h3>
        <div class="mb-3"><input id="login-pass" type="password" placeholder="Code admin (admin2024)" class="w-full border rounded px-3 py-2"></div>
        <button onclick="checkLogin()" class="bg-emerald-600 text-white w-full py-2 rounded font-bold">Entrer</button>`;
    document.getElementById('modal').classList.remove('hidden');
}

window.checkLogin = function() {
    const pass = document.getElementById('login-pass').value;
    if (pass === MASTER_PASSWORD) {
        sessionStorage.setItem('khourouj_role', 'admin');
        closeModal();
        switchTab('admin');
    } else { alert("Code incorrect !"); }
}

window.logoutAdmin = function() {
    sessionStorage.removeItem('khourouj_role');
    switchTab('consult');
}

// CONSULTATION
window.refreshConsult = function() {
    const selPays = document.getElementById('sel-pays');
    if (!selPays) return;
    selPays.innerHTML = dataCache.pays.map(p => `<option value="${p.id}">${escapeHtml(p.nom)}</option>`).join('');
    if (dataCache.pays.length > 0) { selPays.value = dataCache.pays[0].id; onPaysChange(); }
}

window.onPaysChange = function() {
    const paysId = document.getElementById('sel-pays').value;
    const selVille = document.getElementById('sel-ville');
    const villes = dataCache.villes.filter(v => String(v.pays_id) === String(paysId));
    selVille.innerHTML = villes.map(v => `<option value="${v.id}">${escapeHtml(v.nom)}</option>`).join('');
    if (villes.length > 0) { selVille.value = villes[0].id; onVilleChange(); }
}

window.onVilleChange = function() {
    const villeId = document.getElementById('sel-ville').value;
    const selHalaka = document.getElementById('sel-halaka');
    const halakas = dataCache.halakat.filter(h => String(h.ville_id) === String(villeId));
    selHalaka.innerHTML = halakas.map(h => `<option value="${h.id}">${escapeHtml(h.nom)}</option>`).join('');
    if (halakas.length > 0) { selHalaka.value = halakas[0].id; renderPlanning(); }
    renderJamaatsEnSortie();
}

window.renderPlanning = function() {
    const halakaId = document.getElementById('sel-halaka').value;
    if (!halakaId) return;
    const mosquees = dataCache.mosquees.filter(m => String(m.halaka_id) === String(halakaId));
    document.getElementById('planning-content').classList.remove('hidden');
    document.getElementById('planning-empty').classList.add('hidden');
    document.getElementById('planning-title').textContent = "Mosquées";
    
    document.getElementById('planning-tbody').innerHTML = mosquees.map(m => `
        <tr class="border-t">
            <td class="p-3 font-bold">${escapeHtml(m.nom)}</td>
            <td class="p-3 text-center">${m.ousboue}</td>
            <td class="p-3 text-center">-</td>
            <td class="p-3 text-center">${escapeHtml(m.jamaat_statut || 'Aucune')}</td>
            <td class="p-3 text-center"><button onclick="openJamaatModal(${m.id})" class="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-xs font-bold">Détails</button></td>
        </tr>
    `).join('');
}

// BANDEAU ROSE
window.renderJamaatsEnSortie = function() {
    const container = document.getElementById('jamaats-banner-container');
    const list = document.getElementById('jamaats-banner-list');
    if (!container || !list) return;

    const villeId = document.getElementById('sel-ville').value;
    if (!villeId) { container.classList.add('hidden'); return; }

    const halakasVille = dataCache.halakat.filter(h => String(h.ville_id) === String(villeId)).map(h => String(h.id));
    const mosqueesEnSortie = dataCache.mosquees.filter(m => halakasVille.includes(String(m.halaka_id)) && m.jamaat_statut === 'Jamaat en sortie');

    if (mosqueesEnSortie.length === 0) { container.classList.add('hidden'); list.innerHTML = ''; return; }

    container.classList.remove('hidden');
    list.innerHTML = mosqueesEnSortie.map(m => `
        <li>
            <button onclick="openJamaatModal(${m.id})" class="w-full text-left text-rose-900 font-semibold hover:underline flex items-center gap-1">
                <span>${escapeHtml(m.nom)}</span>
                <span class="text-rose-500 text-lg leading-none">›</span>
            </button>
        </li>
    `).join('');
}

// DÉTAILS (2 PARTIES : AHWAL + JAMAAT)
window.openJamaatModal = function(id) {
    const m = dataCache.mosquees.find(x => String(x.id) === String(id));
    if (!m) return;

    let html = `<h3 class="text-xl font-bold mb-3">🕌 ${escapeHtml(m.nom)}</h3>`;
    
    // PARTIE 1 : AHWAL
    html += `<div class="bg-violet-50 border-l-4 border-violet-500 p-3 rounded mb-4">`;
    html += `<div class="flex justify-between items-center mb-2"><b class="text-violet-800">📢 Ahwal de la mosquée</b>`;
    html += `<div class="flex gap-2"><button onclick="editMosqueeAhwal(${m.id})" class="bg-violet-600 text-white px-2 py-1 rounded text-xs">Modifier</button>`;
    html += `<button onclick="deleteMosqueeAhwal(${m.id})" class="bg-red-600 text-white px-2 py-1 rounded text-xs">Supprimer</button></div></div>`;
    html += `<div class="text-sm">${m.ahwal ? escapeHtml(m.ahwal) : '<i>Aucun ahwal.</i>'}</div></div>`;

    // PARTIE 2 : JAMAAT
    html += `<div class="bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded">`;
    html += `<div class="flex justify-between items-center mb-2"><b class="text-emerald-800">👁️ Détails de la Jamaat</b>`;
    html += `<button onclick="editMosqueeJamaat(${m.id})" class="bg-emerald-600 text-white px-2 py-1 rounded text-xs">Modifier</button></div>`;
    html += `<div class="text-sm">`;
    html += `<p><b>Statut :</b> ${escapeHtml(m.jamaat_statut || 'Aucune')}</p>`;
    if (m.jamaat_destination) html += `<p><b>Destination :</b> ${escapeHtml(m.jamaat_destination)}</p>`;
    if (m.jamaat_heure) html += `<p><b>Heure :</b> ${escapeHtml(m.jamaat_heure)}</p>`;
    if (m.jamaat_emir_nom) html += `<p><b>Émir :</b> ${escapeHtml(m.jamaat_emir_nom)} (${escapeHtml(m.jamaat_emir_tel || '')})</p>`;
    if (m.hidayat_aller_nom) html += `<p><b>Hidayat Aller :</b> ${escapeHtml(m.hidayat_aller_nom)}</p>`;
    if (m.hidayat_retour_nom) html += `<p><b>Hidayat Retour :</b> ${escapeHtml(m.hidayat_retour_nom)}</p>`;
    html += `</div></div>`;

    html += `<button onclick="closeModal()" class="bg-slate-200 w-full py-2 rounded mt-4 font-bold">Fermer</button>`;

    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal').classList.remove('hidden');
}

// MODIFIER AHWAL
window.editMosqueeAhwal = function(id) {
    const m = dataCache.mosquees.find(x => String(x.id) === String(id));
    if (!m) return;
    let html = `<h3 class="text-xl font-bold mb-3">📢 Modifier l'Ahwal</h3>`;
    html += `<textarea id="edit-ahwal-text" rows="5" class="w-full border rounded px-3 py-2 mb-3">${m.ahwal || ''}</textarea>`;
    html += `<button onclick="saveMosqueeAhwal(${id})" class="bg-violet-600 text-white w-full py-2 rounded font-bold mb-2">Enregistrer</button>`;
    html += `<button onclick="openJamaatModal(${id})" class="bg-slate-200 w-full py-2 rounded font-bold">Annuler</button>`;
    document.getElementById('modal-content').innerHTML = html;
}

window.saveMosqueeAhwal = async function(id) {
    const text = document.getElementById('edit-ahwal-text').value;
    const { error } = await supabase.from('mosquees').update({ ahwal: text }).eq('id', id);
    if (error) { alert("Erreur : " + error.message); return; }
    await syncData(); openJamaatModal(id);
}

window.deleteMosqueeAhwal = async function(id) {
    if (!confirm("Supprimer l'Ahwal ?")) return;
    const { error } = await supabase.from('mosquees').update({ ahwal: null }).eq('id', id);
    if (error) { alert("Erreur : " + error.message); return; }
    await syncData(); openJamaatModal(id);
}

// MODIFIER JAMAAT
window.editMosqueeJamaat = function(id) {
    const m = dataCache.mosquees.find(x => String(x.id) === String(id));
    if (!m) return;
    let html = `<h3 class="text-xl font-bold mb-3">👁️ Modifier la Jamaat</h3>`;
    html += `<label class="text-xs font-bold">Statut</label><select id="edit-jstatut" class="w-full border rounded px-3 py-1 mb-2"><option value="Aucune">Aucune</option><option value="Frères à la mosquée">Frères à la mosquée</option><option value="Jamaat en sortie">Jamaat en sortie</option></select>`;
    html += `<label class="text-xs font-bold">Destination</label><input id="edit-jdest" type="text" class="w-full border rounded px-3 py-1 mb-2" value="${escapeHtml(m.jamaat_destination || '')}">`;
    html += `<label class="text-xs font-bold">Heure</label><input id="edit-jheure" type="text" class="w-full border rounded px-3 py-1 mb-2" value="${escapeHtml(m.jamaat_heure || '')}">`;
    html += `<label class="text-xs font-bold">Émir</label><input id="edit-jemir" type="text" class="w-full border rounded px-3 py-1 mb-2" value="${escapeHtml(m.jamaat_emir_nom || '')}">`;
    html += `<label class="text-xs font-bold">Tél Émir</label><input id="edit-jemirtel" type="tel" class="w-full border rounded px-3 py-1 mb-2" value="${escapeHtml(m.jamaat_emir_tel || '')}">`;
    
    html += `<h4 class="font-bold mt-3 mb-1">Hidayat Aller</h4>`;
    html += `<input id="edit-hanom" type="text" placeholder="Nom" class="w-full border rounded px-3 py-1 mb-1" value="${escapeHtml(m.hidayat_aller_nom || '')}">`;
    html += `<input id="edit-hainfo" type="text" placeholder="Lieu / heure" class="w-full border rounded px-3 py-1 mb-2" value="${escapeHtml(m.hidayat_aller_info || '')}">`;
    
    html += `<h4 class="font-bold mt-3 mb-1">Hidayat Retour</h4>`;
    html += `<input id="edit-hrnom" type="text" placeholder="Nom" class="w-full border rounded px-3 py-1 mb-1" value="${escapeHtml(m.hidayat_retour_nom || '')}">`;
    html += `<input id="edit-hrinfo" type="text" placeholder="Lieu / heure" class="w-full border rounded px-3 py-1 mb-2" value="${escapeHtml(m.hidayat_retour_info || '')}">`;

    html += `<button onclick="saveMosqueeJamaat(${id})" class="bg-emerald-600 text-white w-full py-2 rounded font-bold mb-2">Enregistrer</button>`;
    html += `<button onclick="openJamaatModal(${id})" class="bg-slate-200 w-full py-2 rounded font-bold">Annuler</button>`;
    
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal-content').querySelector('#edit-jstatut').value = m.jamaat_statut || 'Aucune';
}

window.saveMosqueeJamaat = async function(id) {
    const data = {
        jamaat_statut: document.getElementById('edit-jstatut').value,
        jamaat_destination: document.getElementById('edit-jdest').value,
        jamaat_heure: document.getElementById('edit-jheure').value,
        jamaat_emir_nom: document.getElementById('edit-jemir').value,
        jamaat_emir_tel: document.getElementById('edit-jemirtel').value,
        hidayat_aller_nom: document.getElementById('edit-hanom').value,
        hidayat_aller_info: document.getElementById('edit-hainfo').value,
        hidayat_retour_nom: document.getElementById('edit-hrnom').value,
        hidayat_retour_info: document.getElementById('edit-hrinfo').value
    };
    const { error } = await supabase.from('mosquees').update(data).eq('id', id);
    if (error) { alert("Erreur : " + error.message); return; }
    await syncData(); openJamaatModal(id);
}

// STATISTIQUES
window.refreshStats = function() {
    const sel = document.getElementById('sel-stats-ville');
    if (!sel) return;
    sel.innerHTML = dataCache.villes.map(v => `<option value="${v.id}">${escapeHtml(v.nom)}</option>`).join('');
    if (dataCache.villes.length > 0) { sel.value = dataCache.villes[0].id; renderStats(sel.value); }
}

window.renderStats = function(villeId) {
    if (!villeId) return;
    const ville = dataCache.villes.find(v => String(v.id) === String(villeId));
    if (!ville) return;

    const ahwalContainer = document.getElementById('ahwal-banner-container');
    const ahwalContent = document.getElementById('ahwal-banner-content');
    if (ville.ahwal && ville.ahwal.trim() !== '') {
        ahwalContent.textContent = ville.ahwal;
        ahwalContainer.classList.remove('hidden');
    } else {
        ahwalContainer.classList.add('hidden');
    }

    const halakas = dataCache.halakat.filter(h => String(h.ville_id) === String(villeId)).map(h => String(h.id));
    const mosquees = dataCache.mosquees.filter(m => halakas.includes(String(m.halaka_id)));
    const sum = (f) => mosquees.reduce((t, m) => t + (m[f] || 0), 0);

    document.getElementById('stats-view-container').classList.remove('hidden');
    document.getElementById('stats-title').textContent = `Cumul de la ville : ${ville.nom}`;
    document.getElementById('st-mosquees-total').textContent = mosquees.length;
    document.getElementById('st-mosquees-5amal').textContent = mosquees.filter(m => m.est_5amal).length;
    document.getElementById('st-maisons-autour').textContent = sum('nb_maisons_autour');
    document.getElementById('st-maisons-5amal').textContent = sum('nb_maisons_5amal');
    document.getElementById('st-fr-4m').textContent = sum('nb_freres_4mois');
    document.getElementById('st-fr-4ma').textContent = sum('nb_freres_4mois_an');
    document.getElementById('st-fr-40j').textContent = sum('nb_freres_40jours');
    document.getElementById('st-jamaats-3j').textContent = sum('nb_jamaats_3jours');
    document.getElementById('st-ziara-2h30').textContent = sum('nb_freres_ziara_2h30');
    document.getElementById('st-ziara-moins').textContent = sum('nb_freres_ziara_moins');
    document.getElementById('st-so-2m').textContent = sum('nb_soeurs_2mois');
    document.getElementById('st-so-40j').textContent = sum('nb_soeurs_40jours');
    document.getElementById('st-so-15j').textContent = sum('nb_soeurs_15jours');
    document.getElementById('st-so-3j').textContent = sum('nb_soeurs_3jours');
}

window.openStatsVille = function() {
    const villeId = document.getElementById('sel-stats-ville').value;
    if (!villeId) return;
    const ville = dataCache.villes.find(v => String(v.id) === String(villeId));
    if (!ville) return;
    const halakas = dataCache.halakat.filter(h => String(h.ville_id) === String(villeId)).map(h => String(h.id));
    const mosquees = dataCache.mosquees.filter(m => halakas.includes(String(m.halaka_id)));
    const sum = (f) => mosquees.reduce((t, m) => t + (m[f] || 0), 0);
    let html = `<h3 class="text-xl font-bold mb-3">⭕ Infos de la ville</h3><p class="font-bold text-lg mb-2">${escapeHtml(ville.nom)}</p><p>Total Mosquées : <b>${mosquees.length}</b></p><p>Mosquées 5 Amal : <b>${mosquees.filter(m => m.est_5amal).length}</b></p><p>Maisons autour : <b>${sum('nb_maisons_autour')}</b></p><button onclick="closeModal()" class="bg-slate-200 w-full py-2 rounded mt-4 font-bold">Fermer</button>`;
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal').classList.remove('hidden');
}

window.openStatsPays = function() {
    const villeId = document.getElementById('sel-stats-ville').value;
    if (!villeId) return;
    const ville = dataCache.villes.find(v => String(v.id) === String(villeId));
    if (!ville) return;
    const pays = dataCache.pays.find(p => String(p.id) === String(ville.pays_id));
    if (!pays) return;
    const villesPays = dataCache.villes.filter(v => String(v.pays_id) === String(ville.pays_id)).map(v => String(v.id));
    const halakas = dataCache.halakat.filter(h => villesPays.includes(String(h.ville_id))).map(h => String(h.id));
    const mosquees = dataCache.mosquees.filter(m => halakas.includes(String(m.halaka_id)));
    const sum = (f) => mosquees.reduce((t, m) => t + (m[f] || 0), 0);
    let html = `<h3 class="text-xl font-bold mb-3">🌍 Infos du Pays</h3><p class="font-bold text-lg mb-2">${escapeHtml(pays.nom)}</p><p>Total Mosquées : <b>${mosquees.length}</b></p><p>Mosquées 5 Amal : <b>${mosquees.filter(m => m.est_5amal).length}</b></p><p>Maisons autour : <b>${sum('nb_maisons_autour')}</b></p><button onclick="closeModal()" class="bg-slate-200 w-full py-2 rounded mt-4 font-bold">Fermer</button>`;
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal').classList.remove('hidden');
}

// GESTIONNAIRE
window.openManageModal = function(type) {
    let html = '';
    if (type === 'mosquees') {
        html += '<h3 class="text-xl font-bold mb-4">🕌 Ajouter une Mosquée</h3>';
        html += '<div class="mb-3"><label class="text-xs font-bold">Nom</label><input id="new-mosq-nom" type="text" class="w-full border rounded px-3 py-2"></div>';
        html += '<div class="mb-3"><label class="text-xs font-bold">Ousboue (1-4)</label><input id="new-mosq-ousboue" type="number" value="1" min="1" max="4" class="w-full border rounded px-3 py-2"></div>';
        html += '<div class="mb-3"><label class="text-xs font-bold">Halaka</label><select id="new-mosq-halaka" class="w-full border rounded px-3 py-2">';
        dataCache.halakat.forEach(h => { html += '<option value="' + h.id + '">' + escapeHtml(h.nom) + '</option>'; });
        html += '</select></div>';
        html += '<button onclick="doAddMosquee()" class="bg-blue-600 text-white w-full py-3 rounded font-bold mt-3">Enregistrer la mosquée</button>';
    } 
    else if (type === 'villes') {
        html += '<h3 class="text-xl font-bold mb-4">🏙️ Ajouter une Ville</h3>';
        html += '<div class="mb-3"><input id="new-ville-nom" type="text" placeholder="Nom de la ville" class="w-full border rounded px-3 py-2"></div>';
        html += '<div class="mb-3"><select id="new-ville-pays" class="w-full border rounded px-3 py-2">';
        dataCache.pays.forEach(p => { html += '<option value="' + p.id + '">' + escapeHtml(p.nom) + '</option>'; });
        html += '</select></div>';
        html += '<button onclick="doAddVille()" class="bg-emerald-600 text-white w-full py-3 rounded font-bold">Enregistrer la ville</button>';
    } 
    else if (type === 'pays') {
        html += '<h3 class="text-xl font-bold mb-4">🌍 Ajouter un Pays</h3>';
        html += '<div class="mb-3"><input id="new-pays-nom" type="text" placeholder="Nom du pays" class="w-full border rounded px-3 py-2"></div>';
        html += '<button onclick="doAddPays()" class="bg-emerald-600 text-white w-full py-3 rounded font-bold">Enregistrer le pays</button>';
    } 
    else if (type === 'halakat') {
        html += '<h3 class="text-xl font-bold mb-4">⭕ Ajouter une Halaka</h3>';
        html += '<div class="mb-3"><input id="new-halaka-nom" type="text" placeholder="Nom de la halaka" class="w-full border rounded px-3 py-2"></div>';
        html += '<div class="mb-3"><select id="new-halaka-ville" class="w-full border rounded px-3 py-2">';
        dataCache.villes.forEach(v => { html += '<option value="' + v.id + '">' + escapeHtml(v.nom) + '</option>'; });
        html += '</select></div>';
        html += '<button onclick="doAddHalaka()" class="bg-emerald-600 text-white w-full py-3 rounded font-bold">Enregistrer la halaka</button>';
    }
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal').classList.remove('hidden');
}

// ACTIONS D'AJOUT
window.doAddPays = async function() {
    const nom = document.getElementById('new-pays-nom').value.trim();
    if(!nom) { alert("Le nom est vide."); return; }
    try {
        const { error } = await supabase.from('pays').insert({ nom });
        if (error) { alert("Erreur Supabase : " + error.message); return; }
        closeModal(); await syncData();
    } catch (err) { alert("Erreur : " + err.message); }
}

window.doAddVille = async function() {
    const nom = document.getElementById('new-ville-nom').value.trim();
    const paysId = document.getElementById('new-ville-pays').value;
    if(!nom || !paysId) { alert("Remplissez tous les champs."); return; }
    const code = generateRandomCode(nom);
    try {
        const { error } = await supabase.from('villes').insert({ nom, pays_id: parseInt(paysId), code_admin: code });
        if (error) { alert("Erreur Supabase : " + error.message); return; }
        alert("Ville créée ! Code : " + code);
        closeModal(); await syncData();
    } catch (err) { alert("Erreur : " + err.message); }
}

window.doAddHalaka = async function() {
    const nom = document.getElementById('new-halaka-nom').value.trim();
    const villeId = document.getElementById('new-halaka-ville').value;
    if(!nom || !villeId) { alert("Remplissez tous les champs."); return; }
    try {
        const { error } = await supabase.from('halakat').insert({ nom, ville_id: parseInt(villeId) });
        if (error) { alert("Erreur Supabase : " + error.message); return; }
        closeModal(); await syncData();
    } catch (err) { alert("Erreur : " + err.message); }
}

window.doAddMosquee = async function() {
    const nom = document.getElementById('new-mosq-nom').value.trim();
    if(!nom) { alert("Le nom est vide."); return; }
    const code = generateRandomCode(nom);
    const data = {
        nom: nom,
        ousboue: parseInt(document.getElementById('new-mosq-ousboue').value),
        halaka_id: parseInt(document.getElementById('new-mosq-halaka').value),
        password: code
    };
    try {
        const { error } = await supabase.from('mosquees').insert(data);
        if (error) { alert("Erreur Supabase : " + error.message); return; }
        alert("Mosquée créée ! Code : " + code);
        closeModal(); await syncData();
    } catch (err) { alert("Erreur : " + err.message); }
}
