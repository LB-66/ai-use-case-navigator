// ══════════════════════════════════════════════════
// DONNÉES & INSTANCES GRAPHIQUES
// ══════════════════════════════════════════════════
let usages = JSON.parse(localStorage.getItem("ai_usages")) || [];
let chartDept    = null;
let chartValRisk = null;
let chartGauge   = null;
let chartGain    = null;
let chartScatter = null;

// ══════════════════════════════════════════════════
// BASE DE CONNAISSANCES MÉTIERS
// Chargée au démarrage depuis le fichier JSON
// ══════════════════════════════════════════════════
let baseMetiers = [];

fetch("data/use_cases.json")
  .then(response => response.json())
  .then(data => {
    baseMetiers = data.metiers;
    console.log("Base métiers chargée :", baseMetiers.length, "profil(s)");
  })
  .catch(() => {
    console.log("Base métiers non disponible — scoring standard utilisé");
  });

function trouverMetier(departement) {
  return baseMetiers.find(m => m.departement === departement) || null;
}

// ══════════════════════════════════════════════════
// ESTIMATION DU TEMPS IA
// ══════════════════════════════════════════════════
function estimerTempsIA(description, departement) {
  const texte = description.toLowerCase();

  const regles = [
    { mots: ["traduire","traduction","translate"],                         temps: 0.5, explication: "La traduction est quasi-instantanée pour une IA" },
    { mots: ["résumer","résumé","synthèse","synthétiser"],                 temps: 0.5, explication: "L'IA résume un document en quelques secondes" },
    { mots: ["corriger","correction","orthographe","relire","grammaire"],  temps: 0.5, explication: "La correction grammaticale est instantanée pour l'IA" },
    { mots: ["rédiger","écrire","formuler","email","mail","message"],      temps: 1,   explication: "La rédaction de contenu court prend ~1 min à l'IA" },
    { mots: ["fiche","template","modèle","formulaire","trame"],            temps: 1,   explication: "La génération de templates est rapide pour l'IA" },
    { mots: ["répondre","réponse"],                                        temps: 1,   explication: "L'IA génère des réponses en quelques secondes" },
    { mots: ["analyser","analyse","évaluer","évaluation","audit"],         temps: 2,   explication: "L'analyse de données ou documents prend ~2 min" },
    { mots: ["classifier","classer","trier","catégoriser"],                temps: 2,   explication: "La classification automatique prend ~2 min" },
    { mots: ["rapport","compte-rendu","compte rendu","reporting","bilan"], temps: 3,   explication: "La génération d'un rapport structuré prend ~3 min" },
    { mots: ["présentation","slides","powerpoint","pitch"],                temps: 3,   explication: "La création d'une présentation prend ~3 min à l'IA" },
    { mots: ["cv","candidature","recrutement","profil","matching"],        temps: 4,   explication: "L'analyse de CV/profils prend ~4 min pour un lot standard" },
    { mots: ["données","data","tableau","excel","chiffres","statistiques"],temps: 4,   explication: "Le traitement de données prend ~4 min selon le volume" },
    { mots: ["contrat","juridique","clause","accord","convention"],        temps: 5,   explication: "L'analyse juridique nécessite une vérification humaine — ~5 min" },
    { mots: ["prévision","forecast","projection","budget"],                temps: 6,   explication: "Les projections financières nécessitent ~6 min de traitement" },
  ];

  for (const regle of regles) {
    if (regle.mots.some(mot => texte.includes(mot))) {
      return { temps: regle.temps, explication: regle.explication };
    }
  }

  // Fallback : on regarde si la fiche métier a une tâche similaire
  const metier = trouverMetier(departement);
  if (metier) {
    const tacheMatch = metier.taches_ia.find(t =>
      t.tache.toLowerCase().split(" ").some(mot => texte.includes(mot))
    );
    if (tacheMatch) {
      return {
        temps: tacheMatch.temps_ia,
        explication: `Basé sur la fiche métier ${metier.intitule} — ${tacheMatch.conseil}`
      };
    }
    // Fallback département via fiche métier
    const tempsMoyenIA = Math.round(
      metier.taches_ia.reduce((s, t) => s + t.temps_ia, 0) / metier.taches_ia.length
    );
    return {
      temps: tempsMoyenIA,
      explication: `Estimation basée sur le profil ${metier.intitule}`
    };
  }

  const fallback = {
    "RH":        { temps: 3, explication: "Tâche RH standard — estimation ~3 min" },
    "Finance":   { temps: 4, explication: "Tâche financière standard — estimation ~4 min" },
    "Marketing": { temps: 2, explication: "Tâche marketing standard — estimation ~2 min" },
    "Juridique": { temps: 5, explication: "Tâche juridique standard — estimation ~5 min" },
    "IT":        { temps: 2, explication: "Tâche IT standard — estimation ~2 min" },
    "Direction": { temps: 3, explication: "Tâche direction standard — estimation ~3 min" },
  };

  return fallback[departement] || { temps: 3, explication: "Estimation par défaut — ~3 min" };
}

// ══════════════════════════════════════════════════
// SCORING
// ══════════════════════════════════════════════════
function calculerScore(data) {

  // Score Valeur
  let valeur = 5;
  if (data.frequence === "quotidien")    valeur += 3;
  if (data.frequence === "hebdomadaire") valeur += 2;
  if (data.frequence === "mensuel")      valeur += 1;
  if (["Marketing","RH","IT"].includes(data.departement)) valeur += 2;
  if (["Finance","Juridique"].includes(data.departement)) valeur += 1;
  valeur = Math.min(valeur, 10);

  // Score Risque
  let risque = 0;
  if (data.donnees.includes("personnelles"))    risque += 4;
  if (data.donnees.includes("financieres"))     risque += 3;
  if (data.donnees.includes("confidentielles")) risque += 3;
  if (data.frequence === "quotidien")           risque += 2;
  if (data.frequence === "hebdomadaire")        risque += 1;

  // Enrichissement via fiche métier
  // Le score_base de la fiche est un plancher minimum
  const metier = trouverMetier(data.departement);
  if (metier) {
    risque = Math.max(risque, metier.risque_ia.score_base);
  }

  risque = Math.min(risque, 10);

  // Gain de temps
  const tauxMensuel = { quotidien: 22, hebdomadaire: 4, mensuel: 1, ponctuel: 0.5 };
  const gainAbsolu  = Math.max(0, data.tempsHumain - data.tempsIA);
  const gainPct     = data.tempsHumain > 0
    ? Math.round((gainAbsolu / data.tempsHumain) * 100)
    : 0;
  const gainMensuel = Math.round(gainAbsolu * (tauxMensuel[data.frequence] || 1));

  // Verdict
  let verdict, couleur, emoji;
  if (risque >= 7) {
    verdict = "Encadrement urgent requis"; couleur = "rouge"; emoji = "🔴";
  } else if (risque >= 4) {
    verdict = "Usage à surveiller";        couleur = "orange"; emoji = "🟠";
  } else {
    verdict = "Usage sain — continuer";    couleur = "vert";   emoji = "🟢";
  }

  return { valeur, risque, verdict, couleur, emoji, gainAbsolu, gainPct, gainMensuel };
}

// ══════════════════════════════════════════════════
// SAUVEGARDE
// ══════════════════════════════════════════════════
function sauvegarder() {
  localStorage.setItem("ai_usages", JSON.stringify(usages));
}

// ══════════════════════════════════════════════════
// STATS HEADER
// ══════════════════════════════════════════════════
function mettreAJourStats() {
  const total   = usages.length;
  const aRisque = usages.filter(u => u.risque >= 7).length;
  const moyenne = total > 0
    ? (usages.reduce((s, u) => s + u.valeur, 0) / total).toFixed(1)
    : "—";
  document.getElementById("statTotal").textContent   = total;
  document.getElementById("statRisque").textContent  = aRisque;
  document.getElementById("statMoyenne").textContent = moyenne;
  document.getElementById("usageCount").textContent  = total;
  sauvegarder();
}

// ══════════════════════════════════════════════════
// RÉSULTAT
// ══════════════════════════════════════════════════
function afficherResultat(usage) {
  document.getElementById("emptyState").style.display    = "none";
  document.getElementById("resultContent").style.display = "block";

  // Conseil gain vs risque
  let conseilGainRisque;
  if (usage.gainPct >= 70 && usage.risque <= 4) {
    conseilGainRisque = `Gain élevé (${usage.gainPct}%) + risque faible — déployer en priorité`;
  } else if (usage.gainPct >= 70 && usage.risque >= 7) {
    conseilGainRisque = `Gain élevé (${usage.gainPct}%) mais risque fort — encadrer avant de déployer`;
  } else if (usage.gainPct < 30 && usage.risque >= 5) {
    conseilGainRisque = `Gain faible (${usage.gainPct}%) + risque élevé — maintenir le processus humain`;
  } else {
    conseilGainRisque = `Rapport gain/risque acceptable — surveiller et mesurer dans la durée`;
  }

  // Recommandations
  let recos;
  if (usage.risque >= 7) {
    recos = [
      "Vérifier la conformité RGPD immédiatement",
      "Évaluer si l'usage relève du haut risque EU AI Act",
      "Mettre en place une supervision humaine obligatoire",
      "Documenter dans le registre de traitements",
    ];
  } else if (usage.risque >= 4) {
    recos = [
      "Documenter l'usage dans le registre RGPD",
      "Former les utilisateurs aux bonnes pratiques IA",
      "Définir des règles d'usage claires par écrit",
    ];
  } else {
    recos = [
      "Usage à faible risque — poursuivre",
      "Partager les bonnes pratiques avec d'autres équipes",
      "Envisager d'étendre cet usage à d'autres contextes",
    ];
  }

  // Contexte métier si disponible
  const metier = trouverMetier(usage.departement);
  const contexteMetierHTML = metier ? `
    <div class="reco-list" style="margin-bottom:12px">
      <div class="reco-title">Contexte métier — ${metier.intitule}</div>
      <p>Confidentialité : <strong>${metier.donnees_traitees[0].niveau}</strong></p>
      <p>Risque IA inhérent : <strong>${metier.risque_ia.niveau}</strong></p>
      <p style="color:#94A3B8;font-size:0.82rem">${metier.risque_ia.raisons[0]}</p>
    </div>
  ` : "";

  document.getElementById("resultContent").innerHTML = `
    <div class="result-verdict ${usage.couleur}">
      <div class="verdict-text">
        <strong>${usage.verdict}</strong>
        <span>${usage.outil} — ${usage.departement}</span>
      </div>
    </div>

    <div class="gain-card">
      <div class="gain-stat">
        <span class="gain-number">${usage.gainAbsolu} min</span>
        <span class="gain-label">Gain / tâche</span>
      </div>
      <div class="gain-stat">
        <span class="gain-number">${usage.gainPct}%</span>
        <span class="gain-label">Réduction</span>
      </div>
      <div class="gain-stat">
        <span class="gain-number">${usage.gainMensuel} min</span>
        <span class="gain-label">Gain / mois</span>
      </div>
    </div>

    <div class="reco-list" style="margin-bottom:12px">
      <div class="reco-title">Estimation IA</div>
      <p>Temps estimé avec l'IA : <strong>${usage.tempsIA} min</strong></p>
      <p style="color:#94A3B8;font-size:0.82rem">${usage.explicationIA}</p>
    </div>

    ${contexteMetierHTML}

    <div class="reco-list" style="margin-bottom:12px">
      <div class="reco-title">Analyse gain vs risque</div>
      <p>${conseilGainRisque}</p>
    </div>

    <div class="scores-row">
      <div class="score-box valeur">
        <div class="score-label">Valeur créée</div>
        <div class="score-number">${usage.valeur}<small style="font-size:0.9rem;color:#94A3B8">/10</small></div>
        <div class="score-bar-bg">
          <div class="score-bar-fill" style="width:${usage.valeur * 10}%"></div>
        </div>
      </div>
      <div class="score-box risque">
        <div class="score-label">Niveau de risque</div>
        <div class="score-number">${usage.risque}<small style="font-size:0.9rem;color:#94A3B8">/10</small></div>
        <div class="score-bar-bg">
          <div class="score-bar-fill" style="width:${usage.risque * 10}%"></div>
        </div>
      </div>
    </div>

    <div class="reco-list">
      <div class="reco-title">Recommandations</div>
      ${recos.map(r => `<p>${r}</p>`).join("")}
    </div>
  `;
}

// ══════════════════════════════════════════════════
// TABLEAU
// ══════════════════════════════════════════════════
function mettreAJourTableau() {
  const tableEmpty    = document.getElementById("tableEmpty");
  const tableWrapper  = document.getElementById("tableWrapper");
  const exportButtons = document.getElementById("exportButtons");
  const tbody         = document.getElementById("usageTableBody");

  if (usages.length === 0) {
    tableEmpty.style.display    = "block";
    tableWrapper.style.display  = "none";
    exportButtons.style.display = "none";
    return;
  }

  tableEmpty.style.display    = "none";
  tableWrapper.style.display  = "block";
  exportButtons.style.display = "flex";
  tbody.innerHTML = "";

  usages.forEach(function(usage) {
    const tr   = document.createElement("tr");
    const desc = usage.description.length > 45
      ? usage.description.substring(0, 45) + "…"
      : usage.description;
    tr.innerHTML = `
      <td><strong>${usage.departement}</strong></td>
      <td>${usage.outil}</td>
      <td style="color:#64748B;font-size:0.82rem">${desc}</td>
      <td>${usage.frequence}</td>
      <td style="color:#059669;font-weight:700">${usage.gainPct}%</td>
      <td><strong style="color:#059669">${usage.valeur}/10</strong></td>
      <td><strong style="color:#DC2626">${usage.risque}/10</strong></td>
      <td><span class="badge ${usage.couleur}">${usage.verdict}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// ══════════════════════════════════════════════════
// GRAPHIQUES
// ══════════════════════════════════════════════════
const COLORS = ["#2563EB","#0D9488","#D97706","#DC2626","#7C3AED","#059669","#EA580C","#0891B2"];

function mettreAJourGraphiques() {
  const section = document.getElementById("chartsSection");
  section.style.display = usages.length > 0 ? "block" : "none";
  if (usages.length === 0) return;

  // Donut départements
  const compteDept = {};
  usages.forEach(u => { compteDept[u.departement] = (compteDept[u.departement] || 0) + 1; });
  if (chartDept) chartDept.destroy();
  chartDept = new Chart(document.getElementById("chartDept"), {
    type: "doughnut",
    data: {
      labels: Object.keys(compteDept),
      datasets: [{ data: Object.values(compteDept), backgroundColor: COLORS.slice(0, Object.keys(compteDept).length), borderWidth: 2, borderColor: "#fff" }]
    },
    options: { responsive: true, cutout: "60%", plugins: { legend: { position: "bottom", labels: { font: { size: 11 }, padding: 12 } } } }
  });

  // Barres valeur vs risque
  if (chartValRisk) chartValRisk.destroy();
  chartValRisk = new Chart(document.getElementById("chartValRisk"), {
    type: "bar",
    data: {
      labels: usages.map(u => u.outil),
      datasets: [
        { label: "Valeur", data: usages.map(u => u.valeur), backgroundColor: "#059669", borderRadius: 6 },
        { label: "Risque", data: usages.map(u => u.risque), backgroundColor: "#DC2626", borderRadius: 6 },
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, max: 10, ticks: { stepSize: 2 }, grid: { color: "#F1F5F9" } },
        x: { grid: { display: false }, ticks: { font: { size: 10 } } }
      },
      plugins: { legend: { position: "bottom", labels: { font: { size: 11 }, padding: 12 } } }
    }
  });

  // Jauge risque global
  const risqueMoyen   = usages.reduce((s, u) => s + u.risque, 0) / usages.length;
  const risqueArrondi = Math.round(risqueMoyen * 10) / 10;
  const couleurGauge  = risqueMoyen >= 7 ? "#DC2626" : risqueMoyen >= 4 ? "#D97706" : "#059669";
  const labelGauge    = risqueMoyen >= 7 ? "Risque élevé — action urgente"
    : risqueMoyen >= 4 ? "Risque modéré — surveillance recommandée"
    : "Risque faible — bonne maîtrise";

  if (chartGauge) chartGauge.destroy();
  chartGauge = new Chart(document.getElementById("chartGauge"), {
    type: "doughnut",
    data: { datasets: [{ data: [risqueMoyen, 10 - risqueMoyen], backgroundColor: [couleurGauge, "#E2E8F0"], borderWidth: 0 }] },
    options: {
      responsive: true, circumference: 180, rotation: -90, cutout: "70%",
      plugins: { legend: { display: false }, tooltip: { enabled: false } }
    },
    plugins: [{
      id: "centreTexte",
      beforeDraw(chart) {
        const { ctx, chartArea: { top, width, height } } = chart;
        ctx.save();
        ctx.font = "bold 2rem Segoe UI, sans-serif";
        ctx.fillStyle = couleurGauge;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(risqueArrondi + "/10", width / 2, top + height * 0.75);
        ctx.restore();
      }
    }]
  });
  document.getElementById("gaugeLabel").textContent = labelGauge;

  // Barres horizontales gain de temps
  if (chartGain) chartGain.destroy();
  chartGain = new Chart(document.getElementById("chartGain"), {
    type: "bar",
    data: {
      labels: usages.map(u => `${u.outil} (${u.departement})`),
      datasets: [
        { label: "Temps humain (min)", data: usages.map(u => u.tempsHumain), backgroundColor: "#94A3B8", borderRadius: 6 },
        { label: "Temps avec IA (min)", data: usages.map(u => u.tempsIA),    backgroundColor: "#2563EB", borderRadius: 6 },
      ]
    },
    options: {
      indexAxis: "y", responsive: true,
      scales: {
        x: { beginAtZero: true, grid: { color: "#F1F5F9" }, title: { display: true, text: "Minutes par tâche" } },
        y: { grid: { display: false }, ticks: { font: { size: 11 } } }
      },
      plugins: {
        legend: { position: "bottom", labels: { font: { size: 11 }, padding: 12 } },
        tooltip: { callbacks: { afterBody(items) { const i = items[0].dataIndex; return [`Gain : ${usages[i].gainPct}% (${usages[i].gainAbsolu} min/tâche)`]; } } }
      }
    }
  });

  // Scatter gain vs risque
  const scatterData = usages.map(u => ({ x: u.gainPct, y: u.risque, label: u.outil }));
  if (chartScatter) chartScatter.destroy();
  chartScatter = new Chart(document.getElementById("chartScatter"), {
    type: "scatter",
    data: {
      datasets: [{
        label: "Usages IA",
        data: scatterData,
        pointRadius: 10, pointHoverRadius: 13,
        pointBackgroundColor: function(context) {
          const p = scatterData[context.dataIndex];
          if (!p) return "#94A3B8";
          if (p.x >= 50 && p.y <= 4) return "#059669";
          if (p.x >= 50 && p.y >= 7) return "#D97706";
          if (p.x < 50  && p.y >= 7) return "#DC2626";
          return "#2563EB";
        },
        pointBorderColor: "#ffffff", pointBorderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: { min: 0, max: 100, title: { display: true, text: "Gain de temps (%)", font: { size: 12 } }, grid: { color: "#F1F5F9" }, ticks: { callback: v => v + "%" } },
        y: { min: 0, max: 10,  title: { display: true, text: "Niveau de risque (/10)", font: { size: 12 } }, grid: { color: "#F1F5F9" } }
      },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label(ctx) { const p = scatterData[ctx.dataIndex]; return [`${p.label}`, `Gain : ${p.x}%`, `Risque : ${p.y}/10`]; } } }
      }
    },
    plugins: [{
      id: "labelsPoints",
      afterDatasetsDraw(chart) {
        const { ctx } = chart;
        chart.data.datasets[0].data.forEach((point, i) => {
          const meta = chart.getDatasetMeta(0);
          if (!meta.data[i]) return;
          const { x, y } = meta.data[i].getProps(["x","y"], true);
          ctx.save();
          ctx.font = "11px Segoe UI, sans-serif";
          ctx.fillStyle = "#334155";
          ctx.textAlign = "center";
          ctx.fillText(scatterData[i].label, x, y - 14);
          ctx.restore();
        });
      }
    }]
  });
}

// ══════════════════════════════════════════════════
// TOUT EFFACER
// ══════════════════════════════════════════════════
function toutEffacer() {
  if (!confirm("Supprimer tous les usages ? Cette action est irréversible.")) return;
  usages = [];
  localStorage.removeItem("ai_usages");
  mettreAJourTableau();
  mettreAJourStats();
  mettreAJourGraphiques();
  document.getElementById("emptyState").style.display    = "block";
  document.getElementById("resultContent").style.display = "none";
}

// ══════════════════════════════════════════════════
// SOUMISSION DU FORMULAIRE
// ══════════════════════════════════════════════════
document.getElementById("usageForm").addEventListener("submit", function(e) {
  e.preventDefault();

  const departement = document.getElementById("departement").value;
  const outil       = document.getElementById("outil").value;
  const description = document.getElementById("description").value;
  const frequence   = document.getElementById("frequence").value;
  const tempsHumain = parseInt(document.getElementById("tempsHumain").value);
  const cases       = document.querySelectorAll('input[name="donnees"]:checked');
  const donnees     = Array.from(cases).map(c => c.value);

  const estimationIA = estimerTempsIA(description, departement);
  const tempsIA      = estimationIA.temps;
  const scores       = calculerScore({ departement, frequence, donnees, tempsHumain, tempsIA });

  const usage = {
    id: Date.now(),
    departement, outil, description, frequence, donnees,
    tempsHumain, tempsIA,
    explicationIA: estimationIA.explication,
    valeur:        scores.valeur,
    risque:        scores.risque,
    verdict:       scores.verdict,
    couleur:       scores.couleur,
    emoji:         scores.emoji,
    gainAbsolu:    scores.gainAbsolu,
    gainPct:       scores.gainPct,
    gainMensuel:   scores.gainMensuel,
  };

  usages.push(usage);
  afficherResultat(usage);
  mettreAJourTableau();
  mettreAJourStats();
  mettreAJourGraphiques();
  e.target.reset();

  document.getElementById("resultContent").scrollIntoView({ behavior: "smooth", block: "nearest" });
});

// ══════════════════════════════════════════════════
// CHARGEMENT INITIAL
// ══════════════════════════════════════════════════
if (usages.length > 0) {
  mettreAJourTableau();
  mettreAJourStats();
  mettreAJourGraphiques();
}