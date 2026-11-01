// CONFIGURATION
const SUPABASE_URL = 'https://rhtaqusrkgqawtbqysgw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_JIjs3oxZszYHTaON8iH06g_-mnoCVfl'; 
const MASTER_PASSWORD = "admin2024"; 
let dataCache = { pays: [], villes: [], halakat: [], mosquees: [] };

// OUTILS
function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function generateRandomCode(name) { return name.toUpperCase().substring(0,6) + "-" + Math.random().toString(36).substring(2,6).toUpperCase(); }
function saveToLocalStorage() { localStorage.setItem('khourouj_cache', JSON.stringify(dataCache)); }

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
async function syncData() { await loadData(); refreshConsult(); if (!document.getElementById('view-stats').classList.contains('hidden')) refreshStats(); }

// NAVIGATION
window.switchTab = function(tab) {
    document.getElementById('view-consult').classList.add('hidden'); 
    document.getElementById('view-stats').classList.add('hidden'); 
    document.getElementById('view-admin').classList.add('hidden');
    document.getElementById('view-' + tab).classList.remove('hidden');
    if (tab === 'consult') refreshConsult();
    if (tab === 'stats') refreshStats();
    if (tab === 'admin') renderAdminSpace();
}
window.closeModal = function() { document.getElementById('modal').classList.add('hidden'); };

// CONNEXION
window.openAdminLoginModal = function() {
    document.getElementById('modal-content').innerHTML = `
        <h3 class="text-xl font-bold mb-4">🔒 Accès Gestionnaire</h3>
        <div class="mb-3"><input id="login-pass" type="password" placeholder="Code admin (admin2024)" class="w-full border rounded px-3 py-2 mb-2"></div>
        <div class="mb-3"><input id="login-code" type="text" placeholder="Ou Code Mosquée" class="w-full border rounded px-3 py-2"></div>
        <button onclick="checkLogin()" class="bg-emerald-600 text-white w-full py-2 rounded font-bold">Entrer</button>`;
    document.getElementById('modal').classList.remove('hidden');
}
window.checkLogin = async function() {
    const pass = document.getElementById('login-pass').value;
    const code = document.getElementById('login-code').value.trim().toUpperCase();
    if (pass === MASTER_PASSWORD) {
        sessionStorage.setItem('khourouj_role', 'admin');
        closeModal(); switchTab('admin');
    } else if (code) {
        const m = dataCache.mosquees.find(x => x.password && String(x.password).toUpperCase() === code);
        if (m) {
            sessionStorage.setItem('khourouj_role', 'mosquee');
            sessionStorage.setItem('khourouj_cible_id', m.id);
            closeModal(); switchTab('admin');
        } else { alert("Code Mosquée invalide !"); }
    } else { alert("Code incorrect !"); }
}
window.logoutAdmin = function() { sessionStorage.removeItem('khourouj_role'); sessionStorage.removeItem('khourouj_cible_id'); switchTab('consult'); }

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
    selVille.innerHTML = dataCache.villes.filter(v => String(v.pays_id) === String(paysId)).map(v => `<option value="${v.id}">${escapeHtml(v.nom)}</option>`).join('');
    if (selVille.options.length > 0) { selVille.value = selVille.options[0].value; onVilleChange(); }
}
window.onVilleChange = function() {
    const villeId = document.getElementById('sel-ville').value;
    const selHalaka = document.getElementById('sel-halaka');
    selHalaka.innerHTML = dataCache.halakat.filter(h => String(h.ville_id) === String(villeId)).map(h => `<option value="${h.id}">${escapeHtml(h.nom)}</option>`).join('');
    if (selHalaka.options.length > 0) { selHalaka.value = selHalaka.options[0].value; renderPlanning(); }
    renderJamaatsEnSortie();
}
window.renderPlanning = function() {
    const halakaId = document.getElementById('sel-halaka').value;
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
            <td class="p-3 text-center"><button onclick="openReadOnlyDetails(${m.id})" class="bg-slate-200 text-slate-800 px-2 py-1 rounded text-xs font-bold">Voir</button></td>
        </tr>
    `).join('');
}
window.renderJamaatsEnSortie = function() {
    const container = document.getElementById('jamaats-banner-container');
    const list = document.getElementById('jamaats-banner-list');
    const villeId = document.getElementById('sel-ville').value;
    const halakasVille = dataCache.halakat.filter(h => String(h.ville_id) === String(villeId)).map(h => String(h.id));
    const mosqueesEnSortie = dataCache.mosquees.filter(m => halakasVille.includes(String(m.halaka_id)) && m.jamaat_statut === 'Jamaat en sortie');
    if (mosqueesEnSortie.length === 0) { container.classList.add('hidden'); return; }
    container.classList.remove('hidden');
    list.innerHTML = mosqueesEnSortie.map(m => `<li><button onclick="openReadOnlyDetails(${m.id})" class="text-rose-900 font-semibold hover:underline">${escapeHtml(m.nom)} ›</button></li>`).join('');
}

// VUE LECTURE SEULE (Consultation)
window.openReadOnlyDetails = function(id) {
    const m = dataCache.mosquees.find(x => String(x.id) === String(id));
    if (!m) return;
    let html = `<h3 class="text-xl font-bold mb-3">🕌 ${escapeHtml(m.nom)}</h3>`;
    html += `<div class="bg-violet-50 p-3 rounded mb-3"><b>📢 Ahwal :</b><br>${m.ahwal ? escapeHtml(m.ahwal) : 'Aucun'}</div>`;
    html += `<div class="bg-emerald-50 p-3 rounded"><b>👁️ Jamaat :</b><br>Statut : ${escapeHtml(m.jamaat_statut || 'Aucune')}<br>Dest : ${escapeHtml(m.jamaat_destination || '-')}<br>Émir : ${escapeHtml(m.jamaat_emir_nom || '-')}</div>`;
    html += `<button onclick="closeModal()" class="bg-slate-200 w-full py-2 rounded mt-4 font-bold">Fermer</button>`;
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal').classList.remove('hidden');
}

// GESTIONNAIRE (Espace Admin ou Mosquée)
window.renderAdminSpace = function() {
    const role = sessionStorage.getItem('khourouj_role');
    const cibleId = sessionStorage.getItem('khourouj_cible_id');
    
    if (role === 'mosquee' && cibleId) {
        // VUE RESPONSABLE MOSQUÉE
        const m = dataCache.mosquees.find(x => String(x.id) === String(cibleId));
        if (!m) return;
        let html = `<h2 class="text-xl font-bold mb-4">🕌 Espace : ${escapeHtml(m.nom)}</h2>`;
        html += `<div class="bg-violet-50 p-4 rounded mb-4"><label class="font-bold block mb-1">Ahwal</label><textarea id="edit-ahwal" rows="3" class="w-full border rounded p-2 mb-2">${escapeHtml(m.ahwal || '')}</textarea><button onclick="saveMosqueeData(${m.id})" class="bg-violet-600 text-white px-4 py-2 rounded font-bold">Enregistrer Ahwal</button></div>`;
        html += `<div class="bg-emerald-50 p-4 rounded"><label class="font-bold block mb-1">Jamaat</label><select id="edit-jstatut" class="w-full border rounded p-2 mb-2"><option value="Aucune" ${m.jamaat_statut === 'Aucune' ? 'selected' : ''}>Aucune</option><option value="Frères à la mosquée" ${m.jamaat_statut === 'Frères à la mosquée' ? 'selected' : ''}>Frères à la mosquée</option><option value="Jamaat en sortie" ${m.jamaat_statut === 'Jamaat en sortie' ? 'selected' : ''}>Jamaat en sortie</option></select><input id="edit-jdest" type="text" placeholder="Destination" class="w-full border rounded p-2 mb-2" value="${escapeHtml(m.jamaat_destination || '')}"><input id="edit-jemir" type="text" placeholder="Émir" class="w-full border rounded p-2 mb-2" value="${escapeHtml(m.jamaat_emir_nom || '')}"><button onclick="saveMosqueeData(${m.id})" class="bg-emerald-600 text-white px-4 py-2 rounded font-bold">Enregistrer Jamaat</button></div>`;
        document.getElementById('view-admin').innerHTML = html;
    } else if (role === 'admin') {
        // VUE ADMIN GLOBAL
        let html = `<h2 class="text-xl font-bold mb-4">⚙️ Gestion Globale</h2>`;
        html += `<div class="grid grid-cols-2 gap-3">
            <button onclick="openManageModal('pays')" class="bg-white p-4 rounded shadow font-bold">🌍 Pays</button>
            <button onclick="openManageModal('villes')" class="bg-white p-4 rounded shadow font-bold">🏙️ Villes</button>
            <button onclick="openManageModal('halakat')" class="bg-white p-4 rounded shadow font-bold">⭕ Halakat</button>
            <button onclick="openManageModal('mosquees')" class="bg-white p-4 rounded shadow font-bold">🕌 Mosquées</button>
        </div>`;
        document.getElementById('view-admin').innerHTML = html;
    }
}

window.saveMosqueeData = async function(id) {
    const data = {};
    if (document.getElementById('edit-ahwal')) data.ahwal = document.getElementById('edit-ahwal').value;
    if (document.getElementById('edit-jstatut')) {
        data.jamaat_statut = document.getElementById('edit-jstatut').value;
        data.jamaat_destination = document.getElementById('edit-jdest').value;
        data.jamaat_emir_nom = document.getElementById('edit-jemir').value;
    }
    const { error } = await supabase.from('mosquees').update(data).eq('id', id);
    if (error) { alert("Erreur : " + error.message); return; }
    await syncData(); alert("Enregistré !"); renderAdminSpace();
}

// FORMULAIRES D'AJOUT (Admin)
window.openManageModal = function(type) {
    let html = '';
    if (type === 'mosquees') {
        html += '<h3 class="text-xl font-bold mb-4">🕌 Ajouter une Mosquée</h3>';
        html += '<input id="new-mosq-nom" type="text" placeholder="Nom" class="w-full border rounded p-2 mb-2">';
        html += '<input id="new-mosq-ousboue" type="number" value="1" placeholder="Ousboue" class="w-full border rounded p-2 mb-2">';
        html += '<select id="new-mosq-halaka" class="w-full border rounded p-2 mb-2">' + dataCache.halakat.map(h => `<option value="${h.id}">${escapeHtml(h.nom)}</option>`).join('') + '</select>';
        html += '<button onclick="doAddMosquee()" class="bg-blue-600 text-white w-full py-2 rounded font-bold">Créer</button>';
    } else if (type === 'villes') {
        html += '<h3 class="text-xl font-bold mb-4">🏙️ Ajouter une Ville</h3>';
        html += '<input id="new-ville-nom" type="text" placeholder="Nom" class="w-full border rounded p-2 mb-2">';
        html += '<select id="new-ville-pays" class="w-full border rounded p-2 mb-2">' + dataCache.pays.map(p => `<option value="${p.id}">${escapeHtml(p.nom)}</option>`).join('') + '</select>';
        html += '<button onclick="doAddVille()" class="bg-emerald-600 text-white w-full py-2 rounded font-bold">Créer</button>';
    } else if (type === 'pays') {
        html += '<h3 class="text-xl font-bold mb-4">🌍 Ajouter un Pays</h3>';
        html += '<input id="new-pays-nom" type="text" placeholder="Nom" class="w-full border rounded p-2 mb-2">';
        html += '<button onclick="doAddPays()" class="bg-emerald-600 text-white w-full py-2 rounded font-bold">Créer</button>';
    } else if (type === 'halakat') {
        html += '<h3 class="text-xl font-bold mb-4">⭕ Ajouter une Halaka</h3>';
        html += '<input id="new-halaka-nom" type="text" placeholder="Nom" class="w-full border rounded p-2 mb-2">';
        html += '<select id="new-halaka-ville" class="w-full border rounded p-2 mb-2">' + dataCache.villes.map(v => `<option value="${v.id}">${escapeHtml(v.nom)}</option>`).join('') + '</select>';
        html += '<button onclick="doAddHalaka()" class="bg-emerald-600 text-white w-full py-2 rounded font-bold">Créer</button>';
    }
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal').classList.remove('hidden');
}

window.doAddPays = async function() {
    const nom = document.getElementById('new-pays-nom').value.trim();
    await supabase.from('pays').insert({ nom }); closeModal(); await syncData(); renderAdminSpace();
}
window.doAddVille = async function() {
    const nom = document.getElementById('new-ville-nom').value.trim();
    const paysId = document.getElementById('new-ville-pays').value;
    const code = generateRandomCode(nom);
    await supabase.from('villes').insert({ nom, pays_id: parseInt(paysId), code_admin: code });
    alert("Code Ville : " + code); closeModal(); await syncData(); renderAdminSpace();
}
window.doAddHalaka = async function() {
    const nom = document.getElementById('new-halaka-nom').value.trim();
    const villeId = document.getElementById('new-halaka-ville').value;
    await supabase.from('halakat').insert({ nom, ville_id: parseInt(villeId) });
    closeModal(); await syncData(); renderAdminSpace();
}
window.doAddMosquee = async function() {
    const nom = document.getElementById('new-mosq-nom').value.trim();
    const ousboue = parseInt(document.getElementById('new-mosq-ousboue').value);
    const halakaId = parseInt(document.getElementById('new-mosq-halaka').value);
    const code = generateRandomCode(nom);
    await supabase.from('mosquees').insert({ nom, ousboue, halaka_id: halakaId, password: code });
    alert("Code Mosquée : " + code); closeModal(); await syncData(); renderAdminSpace();
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
    if (ville.ahwal) { document.getElementById('ahwal-banner-content').textContent = ville.ahwal; ahwalContainer.classList.remove('hidden'); } else { ahwalContainer.classList.add('hidden'); }
    const halakas = dataCache.halakat.filter(h => String(h.ville_id) === String(villeId)).map(h => String(h.id));
    const mosquees = dataCache.mosquees.filter(m => halakas.includes(String(m.halaka_id)));
    const sum = (f) => mosquees.reduce((t, m) => t + (m[f] || 0), 0);
    document.getElementById('stats-view-container').classList.remove('hidden');
    document.getElementById('stats-title').textContent = `Cumul : ${ville.nom}`;
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
    const ville = dataCache.villes.find(v => String(v.id) === String(villeId));
    if (!ville) return;
    const halakas = dataCache.halakat.filter(h => String(h.ville_id) === String(villeId)).map(h => String(h.id));
    const mosquees = dataCache.mosquees.filter(m => halakas.includes(String(m.halaka_id)));
    let html = `<h3 class="text-xl font-bold mb-3">⭕ ${escapeHtml(ville.nom)}</h3><p>Mosquées : ${mosquees.length}</p><button onclick="closeModal()" class="bg-slate-200 w-full py-2 rounded mt-4 font-bold">Fermer</button>`;
    document.getElementById('modal-content').innerHTML = html; document.getElementById('modal').classList.remove('hidden');
}
window.openStatsPays = function() {
    const villeId = document.getElementById('sel-stats-ville').value;
    const ville = dataCache.villes.find(v => String(v.id) === String(villeId));
    const pays = dataCache.pays.find(p => String(p.id) === String(ville.pays_id));
    let html = `<h3 class="text-xl font-bold mb-3">🌍 ${escapeHtml(pays.nom)}</h3><button onclick="closeModal()" class="bg-slate-200 w-full py-2 rounded mt-4 font-bold">Fermer</button>`;
    document.getElementById('modal-content').innerHTML = html; document.getElementById('modal').classList.remove('hidden');
}
