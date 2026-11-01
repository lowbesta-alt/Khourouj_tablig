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

async function syncData() { await loadData(); refreshConsult(); }

// NAVIGATION
window.switchTab = function(tab) {
    document.getElementById('view-consult').classList.add('hidden'); 
    document.getElementById('view-stats').classList.add('hidden'); 
    document.getElementById('view-admin').classList.add('hidden');
    document.getElementById('view-' + tab).classList.remove('hidden');
    if (tab === 'consult') refreshConsult();
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
}

window.renderPlanning = function() {
    const halakaId = document.getElementById('sel-halaka').value;
    if (!halakaId) return;
    const mosquees = dataCache.mosquees.filter(m => String(m.halaka_id) === String(halakaId));
    document.getElementById('planning-content').classList.remove('hidden');
    document.getElementById('planning-title').textContent = "Mosquées";
    document.getElementById('planning-tbody').innerHTML = mosquees.map(m => `
        <tr class="border-t"><td class="p-3 font-bold">${escapeHtml(m.nom)}</td><td class="p-3 text-center">${m.ousboue}</td><td class="p-3 text-center">-</td><td class="p-3 text-center">${escapeHtml(m.jamaat_statut || 'Aucune')}</td></tr>
    `).join('');
}

// GESTIONNAIRE
window.openManageModal = function(type) {
  if (type === 'mosquees') {
    document.getElementById('modal-content').innerHTML = `
        <h3 class="text-xl font-bold mb-4">🕌 Ajouter une Mosquée</h3>
        <div class="mb-3"><label class="text-xs font-bold">Nom</label><input id="new-mosq-nom" type="text" class="w-full border rounded px-3 py-2"></div>
        <div class="mb-3"><label class="text-xs font-bold">Ousboue (1-4)</label><input id="new-mosq-ousboue" type="number" value="1" min="1" max="4" class="w-full border rounded px-3 py-2"></div>
        <div class="mb-3"><label class="text-xs font-bold">Halaka</label><select id="new-mosq-halaka" class="w-full border rounded px-3 py-2">${dataCache.halakat.map(h => `<option value="${h.id}">${escapeHtml(h.nom)}</option>`).join('')}</select></div>
        
        <details class="mb-3 bg-slate-100 p-3 rounded"><summary class="font-bold text-sm cursor-pointer">📊 Statistiques</summary>
            <div class="mb-2 flex items-center gap-2"><input type="checkbox" id="new-mosq-5amal"><label class="text-sm font-bold">Mosquée 5 Amal ?</label></div>
            <div class="grid grid-cols-2 gap-2 text-sm mt-2">
                <div><label class="text-xs">Maisons autour</label><input id="new-mosq-maisons" type="number" value="0" class="w-full border rounded px-2 py-1"></div>
                <div><label class="text-xs">Maisons 5 Amal</label><input id="new-mosq-maisons5a" type="number" value="0" class="w-full border rounded px-2 py-1"></div>
                <div><label class="text-xs">Frères 4 mois</label><input id="new-mosq-fr4m" type="number" value="0" class="w-full border rounded px-2 py-1"></div>
                <div><label class="text-xs">Frères 4 mois/an</label><input id="new-mosq-fr4ma" type="number" value="0" class="w-full border rounded px-2 py-1"></div>
                <div><label class="text-xs">Frères 40 jours</label><input id="new-mosq-fr40j" type="number" value="0" class="w-full border rounded px-2 py-1"></div>
                <div><label class="text-xs">Jamaats 3 jours</label><input id="new-mosq-jamaats" type="number" value="0" class="w-full border rounded px-2 py-1"></div>
                <div><label class="text-xs">2h30/jour</label><input id="new-mosq-z2h30" type="number" value="0" class="w-full border rounded px-2 py-1"></div>
                <div><label class="text-xs">< 2h30/jour</label><input id="new-mosq-zmoins" type="number" value="0" class="w-full border rounded px-2 py-1"></div>
                <div><label class="text-xs">Sœurs 2 mois</label><input id="new-mosq-so2m" type="number" value="0" class="w-full border rounded px-2 py-1"></div>
                <div><label class="text-xs">Sœurs 40 jours</label><input id="new-mosq-so40j" type="number" value="0" class="w-full border rounded px-2 py-1"></div>
                <div><label class="text-xs">Sœurs 15 jours</label><input id="new-mosq-so15j" type="number" value="0" class="w-full border rounded px-2 py-1"></div>
                <div><label class="text-xs">Sœurs 3 jours</label><input id="new-mosq-so3j" type="number" value="0" class="w-full border rounded px-2 py-1"></div>
            </div>
        </details>

        <details class="mb-3 bg-emerald-50 p-3 rounded"><summary class="font-bold text-sm cursor-pointer">👁️ Détails Jamaat</summary>
            <div class="grid grid-cols-1 gap-2 text-sm mt-2">
                <div><label class="text-xs">Statut</label><select id="new-mosq-jstatut" class="w-full border rounded px-2 py-1"><option value="Aucune">Aucune</option><option value="Frères à la mosquée">Frères à la mosquée</option><option value="Jamaat en sortie">Jamaat en sortie</option></select></div>
                <div><label class="text-xs">Destination</label><input id="new-mosq-dest" type="text" class="w-full border rounded px-2 py-1"></div>
                <div><label class="text-xs">Heure</label><input id="new-mosq-heure" type="text" class="w-full border rounded px-2 py-1"></div>
                <div><label class="text-xs">Émir</label><input id="new-mosq-emir" type="text" class="w-full border rounded px-2 py-1"></div>
                <div><label class="text-xs">Tél Émir</label><input id="new-mosq-emirtel" type="tel" class="w-full border rounded px-2 py-1"></div>
            </div>
        </details>

        <button onclick="doAddMosquee()" class="bg-blue-600 text-white w-full py-3 rounded font-bold mt-3">Enregistrer</button>`;
    document.getElementById('modal').classList.remove('hidden');
}
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
    const ousboue = document.getElementById('new-mosq-ousboue').value;
    const halakaId = document.getElementById('new-mosq-halaka').value;
    
    if(!nom) { alert("Le nom est vide."); return; }
    if(!halakaId) { alert("Aucune halaka sélectionnée."); return; }
    
    const code = generateRandomCode(nom);
    
    try {
        const { error } = await supabase.from('mosquees').insert({ 
            nom: nom, 
            ousboue: parseInt(ousboue), 
            halaka_id: parseInt(halakaId), 
            password: code 
        });
        if (error) { alert("Erreur Supabase : " + error.message); return; }
        alert("Mosquée créée ! Code : " + code);
        closeModal(); await syncData();
    } catch (err) { alert("Erreur : " + err.message); }
}
