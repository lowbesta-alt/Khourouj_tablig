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

// CONSULTATION (Pays / Villes / Halakas)
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

// BANDEAU ROSE (Mosquées en sortie)
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

// DÉTAILS D'UNE MOSQUÉE (avec Ahwal)
window.openJamaatModal = function(id) {
    const m = dataCache.mosquees.find(x => String(x.id) === String(id));
    if (!m) return;

    let html = `<h3 class="text-xl font-bold mb-3">🕌 ${escapeHtml(m.nom)}</h3>`;
    
    if (m.ahwal && m.ahwal.trim() !== '') {
        html += `<div class="mb-4 bg-violet-100 border-l-4 border-violet-500 p-3 rounded"><b>📢 Ahwal de la mosquée :</b><br>${escapeHtml(m.ahwal)}</div>`;
    }
    
    html += `<div class="mb-4"><span class="inline-block px-3 py-1 rounded-full text-sm font-bold bg-orange-100 text-orange-800">${escapeHtml(m.jamaat_statut || 'Aucune')}</span></div>`;
    if (m.jamaat_destination) html += `<div class="mb-2"><b>Destination :</b> ${escapeHtml(m.jamaat_destination)}</div>`;
    if (m.jamaat_heure) html += `<div class="mb-2"><b>Heure :</b> ${escapeHtml(m.jamaat_heure)}</div>`;
    if (m.jamaat_emir_nom) html += `<div class="mb-2 bg-green-50 p-2 rounded"><b>Émir :</b> ${escapeHtml(m.jamaat_emir_nom)}<br>`;
    if (m.jamaat_emir_tel) html += `<a href="https://wa.me/${m.jamaat_emir_tel.replace(/\D/g, '')}" class="text-green-600 underline">📞 Contacter l'Émir</a></div>`;
    
    html += `<button onclick="closeModal()" class="bg-slate-200 w-full py-2 rounded mt-4">Fermer</button>`;

    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal').classList.remove('hidden');
}

// STATISTIQUES (Cumul de la ville)
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

    // Ahwal de la ville
    const ahwalContainer = document.getElementById('ahwal-banner-container');
    const ahwalContent = document.getElementById('ahwal-banner-content');
    if (ville.ahwal && ville.ahwal.trim() !== '') {
        ahwalContent.textContent = ville.ahwal;
        ahwalContainer.classList.remove('hidden');
    } else {
        ahwalContainer.classList.add('hidden');
    }

    // Cumul
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

// INFOS VILLE / PAYS
window.openStatsVille = function() {
    const villeId = document.getElementById('sel-stats-ville').value;
    if (!villeId) return;
    const ville = dataCache.villes.find(v => String(v.id) === String(villeId));
    if (!ville) return;
    const halakas = dataCache.halakat.filter(h => String(h.ville_id) === String(villeId)).map(h => String(h.id));
    const mosquees = dataCache.mosquees.filter(m => halakas.includes(String(m.halaka_id)));
    const sum = (f) => mosquees.reduce((t, m) => t + (m[f] || 0), 0);
    
    let html = `<h3 class="text-xl font-bold mb-3">⭕ Infos de la ville</h3>`;
    html += `<p class="font-bold text-lg mb-2">${escapeHtml(ville.nom)}</p>`;
    html += `<p>Total Mosquées : <b>${mosquees.length}</b></p>`;
    html += `<p>Mosquées 5 Amal : <b>${mosquees.filter(m => m.est_5amal).length}</b></p>`;
    html += `<p>Maisons autour : <b>${sum('nb_maisons_autour')}</b></p>`;
    html += `<button onclick="closeModal()" class="bg-slate-200 w-full py-2 rounded mt-4 font-bold">Fermer</button>`;

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

    let html = `<h3 class="text-xl font-bold mb-3">🌍 Infos du Pays</h3>`;
    html += `<p class="font-bold text-lg mb-2">${escapeHtml(pays.nom)}</p>`;
    html += `<p>Total Mosquées : <b>${mosquees.length}</b></p>`;
    html += `<p>Mosquées 5 Amal : <b>${mosquees.filter(m => m.est_5amal).length}</b></p>`;
    html += `<p>Maisons autour : <b>${sum('nb_maisons_autour')}</b></p>`;
    html += `<button onclick="closeModal()" class="bg-slate-200 w-full py-2 rounded mt-4 font-bold">Fermer</button>`;

    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal').classList.remove('hidden');
}

// GESTIONNAIRE (Création)
window.openManageModal = function(type) {
    let html = '';
    if (type === 'mosquees') {
        html += '<h3 class="text-xl font-bold mb-4">🕌 Ajouter une Mosquée</h3>';
        html += '<div class="mb-3"><label class="text-xs font-bold">Nom</label><input id="new-mosq-nom" type="text" class="w-full border rounded px-3 py-2"></div>';
        html += '<div class="mb-3"><label class="text-xs font-bold">Ousboue (1-4)</label><input id="new-mosq-ousboue" type="number" value="1" min="1" max="4" class="w-full border rounded px-3 py-2"></div>';
        html += '<div class="mb-3"><label class="text-xs font-bold">Halaka</label><select id="new-mosq-halaka" class="w-full border rounded px-3 py-2">';
        dataCache.halakat.forEach(h => { html += '<option value="' + h.id + '">' + escapeHtml(h.nom) + '</option>'; });
        html += '</select></div>';
        html += '<div class="mb-3"><label class="text-xs font-bold">Ahwal de la mosquée</label><textarea id="new-mosq-ahwal" rows="2" class="w-full border rounded px-3 py-2"></textarea></div>';
        
        html += '<details class="mb-3 bg-slate-100 p-3 rounded border border-slate-300">';
        html += '<summary class="font-bold text-sm cursor-pointer text-slate-800">📊 Statistiques (Cliquez ici)</summary>';
        html += '<div class="mb-2 flex items-center gap-2 mt-3"><input type="checkbox" id="new-mosq-5amal"><label class="text-sm font-bold">Mosquée avec 5 Amal ?</label></div>';
        html += '<div class="grid grid-cols-2 gap-2 text-sm">';
        html += '<div><label class="text-xs">Maisons autour</label><input id="new-mosq-maisons" type="number" value="0" class="w-full border rounded px-2 py-1"></div>';
        html += '<div><label class="text-xs">Maisons 5 Amal</label><input id="new-mosq-maisons5a" type="number" value="0" class="w-full border rounded px-2 py-1"></div>';
        html += '<div><label class="text-xs">Frères 4 mois</label><input id="new-mosq-fr4m" type="number" value="0" class="w-full border rounded px-2 py-1"></div>';
        html += '<div><label class="text-xs">4 mois/an</label><input id="new-mosq-fr4ma" type="number" value="0" class="w-full border rounded px-2 py-1"></div>';
        html += '<div><label class="text-xs">Frères 40 jours</label><input id="new-mosq-fr40j" type="number" value="0" class="w-full border rounded px-2 py-1"></div>';
        html += '<div><label class="text-xs">Jamaats 3 jours</label><input id="new-mosq-jamaats" type="number" value="0" class="w-full border rounded px-2 py-1"></div>';
        html += '<div><label class="text-xs">Donnant 2h30/j</label><input id="new-mosq-z2h30" type="number" value="0" class="w-full border rounded px-2 py-1"></div>';
        html += '<div><label class="text-xs">< 2h30/j</label><input id="new-mosq-zmoins" type="number" value="0" class="w-full border rounded px-2 py-1"></div>';
        html += '<div><label class="text-xs">Sœurs 2 mois</label><input id="new-mosq-so2m" type="number" value="0" class="w-full border rounded px-2 py-1"></div>';
        html += '<div><label class="text-xs">Sœurs 40j</label><input id="new-mosq-so40j" type="number" value="0" class="w-full border rounded px-2 py-1"></div>';
        html += '<div><label class="text-xs">Sœurs 15j</label><input id="new-mosq-so15j" type="number" value="0" class="w-full border rounded px-2 py-1"></div>';
        html += '<div><label class="text-xs">Sœurs 3j</label><input id="new-mosq-so3j" type="number" value="0" class="w-full border rounded px-2 py-1"></div>';
        html += '</div></details>';

        html += '<details class="mb-3 bg-emerald-50 p-3 rounded border border-emerald-300">';
        html += '<summary class="font-bold text-sm cursor-pointer text-emerald-800">👁️ Détails Jamaat (Cliquez ici)</summary>';
        html += '<div class="grid grid-cols-1 gap-2 text-sm mt-3">';
        html += '<div><label class="text-xs">Statut de la Jamaat</label><select id="new-mosq-jstatut" class="w-full border rounded px-2 py-1"><option value="Aucune">Aucune</option><option value="Frères à la mosquée">Frères à la mosquée</option><option value="Jamaat en sortie">Jamaat en sortie</option></select></div>';
        html += '<div><label class="text-xs">Destination</label><input id="new-mosq-dest" type="text" class="w-full border rounded px-2 py-1"></div>';
        html += '<div><label class="text-xs">Émir de la Jamaat</label><input id="new-mosq-emir" type="text" class="w-full border rounded px-2 py-1"></div>';
        html += '<div><label class="text-xs">Téléphone de l Émir</label><input id="new-mosq-emirtel" type="tel" class="w-full border rounded px-2 py-1"></div>';
        html += '</div></details>';

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
        password: code,
        ahwal: document.getElementById('new-mosq-ahwal').value,
        est_5amal: document.getElementById('new-mosq-5amal').checked,
        nb_maisons_autour: parseInt(document.getElementById('new-mosq-maisons').value) || 0,
        nb_maisons_5amal: parseInt(document.getElementById('new-mosq-maisons5a').value) || 0,
        nb_freres_4mois: parseInt(document.getElementById('new-mosq-fr4m').value) || 0,
        nb_freres_4mois_an: parseInt(document.getElementById('new-mosq-fr4ma').value) || 0,
        nb_freres_40jours: parseInt(document.getElementById('new-mosq-fr40j').value) || 0,
        nb_jamaats_3jours: parseInt(document.getElementById('new-mosq-jamaats').value) || 0,
        nb_freres_ziara_2h30: parseInt(document.getElementById('new-mosq-z2h30').value) || 0,
        nb_freres_ziara_moins: parseInt(document.getElementById('new-mosq-zmoins').value) || 0,
        nb_soeurs_2mois: parseInt(document.getElementById('new-mosq-so2m').value) || 0,
        nb_soeurs_40jours: parseInt(document.getElementById('new-mosq-so40j').value) || 0,
        nb_soeurs_15jours: parseInt(document.getElementById('new-mosq-so15j').value) || 0,
        nb_soeurs_3jours: parseInt(document.getElementById('new-mosq-so3j').value) || 0,
        jamaat_statut: document.getElementById('new-mosq-jstatut').value,
        jamaat_destination: document.getElementById('new-mosq-dest').value,
        jamaat_emir_nom: document.getElementById('new-mosq-emir').value,
        jamaat_emir_tel: document.getElementById('new-mosq-emirtel').value
    };

    try {
        const { error } = await supabase.from('mosquees').insert(data);
        if (error) { alert("Erreur Supabase : " + error.message); return; }
        alert("Mosquée créée ! Code : " + code);
        closeModal(); await syncData();
    } catch (err) { alert("Erreur : " + err.message); }
}
