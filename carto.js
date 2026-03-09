/* ═══════════════════════════════════════════════
   CARTOGRAPHIE IA × MÉTIERS — carto.js
   ═══════════════════════════════════════════════ */

// ── Couleur selon score IA ─────────────────────
function scoreColor(s) {
  if (s >= 75) return '#059669';
  if (s >= 55) return '#D97706';
  return '#DC2626';
}

// ── Couleur selon niveau de risque ────────────
function risqueColor(r) {
  const map = { 'Faible': '#059669', 'Moyen': '#D97706', 'Élevé': '#DC2626', 'Très élevé': '#991b1b' };
  return map[r] || '#6B7280';
}
function risqueClass(r) {
  const map = { 'Faible': 'risk-low', 'Moyen': 'risk-mid', 'Élevé': 'risk-high', 'Très élevé': 'risk-xhigh' };
  return map[r] || '';
}

// ── Familles et couleurs ───────────────────────
const FAM_COLORS = {
  'RH':         '#00C896',
  'Finance':    '#2979FF',
  'Juridique':  '#9B5DE5',
  'Marketing':  '#F5A623',
  'Commercial': '#E8415A',
  'IT':         '#00B4C6',
  'Opérations': '#34D399',
  'Direction':  '#FB923C',
};

// ════════════════════════════════════════════════
// ÉTAT GLOBAL
// ════════════════════════════════════════════════
let METIERS = [];
let activeFam = 'all';
let currentMetier = null;

// ════════════════════════════════════════════════
// CHARGEMENT DES DONNÉES
// ════════════════════════════════════════════════
fetch('data/metiers.json')
  .then(r => r.json())
  .then(data => {
    METIERS = data.metiers;
    initFilters();
    initMap();
    document.getElementById('nb-metiers').textContent = METIERS.length;
  })
  .catch(err => {
    console.error('Erreur chargement metiers.json :', err);
    // Fallback si fetch ne fonctionne pas en local (file://)
    alert('Utilise Live Server dans VS Code pour lancer ce fichier (clic droit → Open with Live Server)');
  });

// ════════════════════════════════════════════════
// FILTRES FAMILLE
// ════════════════════════════════════════════════
function initFilters() {
  const familles = [...new Set(METIERS.map(m => m.famille))];
  const container = document.getElementById('map-filters');
  familles.forEach(fam => {
    const col = FAM_COLORS[fam] || '#fff';
    const btn = document.createElement('button');
    btn.className = 'fam-btn';
    btn.dataset.fam = fam;
    btn.textContent = fam;
    btn.style.setProperty('--fam-col', col);
    container.appendChild(btn);
  });

  container.addEventListener('click', e => {
    const btn = e.target.closest('.fam-btn');
    if (!btn) return;
    document.querySelectorAll('.fam-btn').forEach(b => {
      b.classList.remove('active');
      b.style.background = '';
      b.style.borderColor = '';
      b.style.color = '';
    });
    activeFam = btn.dataset.fam;
    btn.classList.add('active');
    if (activeFam !== 'all') {
      const col = FAM_COLORS[activeFam] || '#00C896';
      btn.style.background = col + '20';
      btn.style.borderColor = col + '55';
      btn.style.color = col;
    }
    updateMapFilter();
  });
}

function updateMapFilter() {
  d3.selectAll('.bubble-g').each(function(d) {
    const match = activeFam === 'all' || d.famille === activeFam;
    d3.select(this).classed('dimmed', !match);
  });
}

// ════════════════════════════════════════════════
// VUE 1 — BUBBLE MAP
// ════════════════════════════════════════════════
function initMap() {
  const svg = d3.select('#map-svg');
  const wrap = document.getElementById('map-wrap');

  function draw() {
    svg.selectAll('*').remove();

    const W = wrap.offsetWidth;
    const H = wrap.offsetHeight;
    const pad = 80;
    const cx = W / 2, cy = H / 2;

    const scX = d3.scaleLinear().domain([-1, 1]).range([pad, W - pad]);
    const scY = d3.scaleLinear().domain([-1, 1]).range([H - pad, pad]);
    const scR = d3.scaleSqrt()
      .domain([40, 100])
      .range([Math.min(W, H) * 0.028, Math.min(W, H) * 0.075]);

    svg.attr('width', W).attr('height', H);

    // ── Quadrant backgrounds ──
    const quadrants = [
      { x1: 0, y1: 0,  x2: cx, y2: cy,  fill: 'rgba(124,58,237,0.05)', label: 'SPÉCIALISTE\nCRÉATIF' },
      { x1: cx, y1: 0, x2: W,  y2: cy,  fill: 'rgba(29,78,216,0.05)',  label: 'GÉNÉRALISTE\nCRÉATIF' },
      { x1: 0, y1: cy, x2: cx, y2: H,   fill: 'rgba(220,38,38,0.04)',  label: 'SPÉCIALISTE\nRÉPÉTITIF' },
      { x1: cx, y1: cy,x2: W,  y2: H,   fill: 'rgba(5,150,105,0.07)',  label: 'GÉNÉRALISTE\nRÉPÉTITIF' },
    ];

    quadrants.forEach(q => {
      svg.append('rect')
        .attr('x', q.x1).attr('y', q.y1)
        .attr('width', q.x2 - q.x1).attr('height', q.y2 - q.y1)
        .attr('fill', q.fill);
      const lx = (q.x1 + q.x2) / 2;
      const ly = (q.y1 + q.y2) / 2;
      q.label.split('\n').forEach((line, i) => {
        svg.append('text').attr('class', 'quad-label')
          .attr('x', lx).attr('y', ly + (i - 0.5) * 18)
          .text(line);
      });
    });

    // ── Axes ──
    svg.append('line').attr('x1', pad / 2).attr('y1', cy).attr('x2', W - pad / 2).attr('y2', cy)
      .attr('stroke', 'rgba(0,0,0,0.12)').attr('stroke-width', 1.5).attr('stroke-dasharray', '5,5');
    svg.append('line').attr('x1', cx).attr('y1', pad / 2).attr('x2', cx).attr('y2', H - pad / 2)
      .attr('stroke', 'rgba(0,0,0,0.12)').attr('stroke-width', 1.5).attr('stroke-dasharray', '5,5');

    // ── Cercle central ──
    svg.append('circle').attr('cx', cx).attr('cy', cy)
      .attr('r', Math.min(W, H) * 0.28)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(0,0,0,0.05)')
      .attr('stroke-dasharray', '3,8');

    // ── Bulles ──
    const tooltip = document.getElementById('carto-tooltip');

    const groups = svg.selectAll('.bubble-g')
      .data(METIERS, d => d.id)
      .join('g')
      .attr('class', 'bubble-g')
      .attr('transform', d => `translate(${scX(d.x)},${scY(d.y)})`);

    // Halo
    groups.append('circle')
      .attr('r', d => scR(d.scoreIA) + 8)
      .attr('fill', d => scoreColor(d.scoreIA))
      .attr('fill-opacity', 0.07);

    // Bulle principale
    groups.append('circle')
      .attr('class', 'bbl')
      .attr('r', d => scR(d.scoreIA))
      .attr('fill', d => scoreColor(d.scoreIA))
      .attr('fill-opacity', 0.9)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.7)
      .style('color', d => scoreColor(d.scoreIA))
      .style('filter', 'drop-shadow(0 2px 8px rgba(0,0,0,0.18))');

    // Score texte
    groups.append('text')
      .attr('class', 'bbl-score')
      .attr('y', -5)
      .text(d => d.scoreIA + '%');

    // Nom (tronqué)
    groups.append('text')
      .attr('class', 'bbl-label')
      .attr('y', 9)
      .text(d => {
        const r = scR(d.scoreIA);
        if (r < 20) return '';
        const words = d.nom.split(' ');
        return d.nom.length > 16 ? d.nom.substring(0, 13) + '…' : d.nom;
      });

    // ── Interactions ──
    groups
      .on('mousemove', (event, d) => {
        const col = scoreColor(d.scoreIA);
        const famCol = FAM_COLORS[d.famille] || '#fff';
        tooltip.innerHTML = `
          <div class="tt-name">${d.nom}</div>
          <div class="tt-score" style="color:${col}">${d.scoreIA}%</div>
          <div class="tt-fam" style="background:${famCol}20;color:${famCol};border:1px solid ${famCol}40">${d.famille}</div>
          <div class="tt-desc">${d.description}</div>
          <div class="tt-hint">👆 Cliquer pour voir les tâches</div>
        `;
        tooltip.classList.add('visible');
        moveTooltip(event);
      })
      .on('mouseleave', () => tooltip.classList.remove('visible'))
      .on('click', (event, d) => {
        tooltip.classList.remove('visible');
        openTasksView(d);
      });

    updateMapFilter();
  }

  draw();
  window.addEventListener('resize', draw);
}

function moveTooltip(event) {
  const tt = document.getElementById('carto-tooltip');
  let x = event.clientX + 16;
  let y = event.clientY - 20;
  if (x + 270 > window.innerWidth)  x = event.clientX - 276;
  if (y + 240 > window.innerHeight) y = event.clientY - 240;
  tt.style.left = x + 'px';
  tt.style.top  = y + 'px';
}

// ════════════════════════════════════════════════
// VUE 2 — TÂCHES DU MÉTIER
// ════════════════════════════════════════════════
function openTasksView(metier) {
  currentMetier = metier;

  // Transition
  document.getElementById('view-map').classList.add('hidden');
  document.getElementById('view-tasks').classList.remove('hidden');

  // Breadcrumb
  document.getElementById('bc-sep').classList.remove('hidden');
  document.getElementById('bc-metier').textContent = metier.nom;
  document.getElementById('bc-metier').classList.remove('hidden');
  document.getElementById('nav-hint').textContent = '';

  // Header métier
  const famCol = FAM_COLORS[metier.famille] || '#fff';
  const iaCol = scoreColor(metier.scoreIA);

  const tag = document.getElementById('tasks-tag');
  tag.textContent = metier.famille;
  tag.style.background = famCol + '20';
  tag.style.color = famCol;
  tag.style.border = `1px solid ${famCol}40`;

  document.getElementById('tasks-title').textContent = metier.nom;
  document.getElementById('tasks-desc').textContent = metier.description;

  const scIA = document.getElementById('sc-ia');
  scIA.textContent = metier.scoreIA + '%';
  scIA.style.color = iaCol;

  const scMat = document.getElementById('sc-mat');
  scMat.textContent = metier.maturite + '/5';
  scMat.style.color = metier.maturite >= 3 ? '#00C896' : metier.maturite >= 2 ? '#F5A623' : '#E8415A';

  const scRisk = document.getElementById('sc-risk');
  scRisk.textContent = metier.risque;
  scRisk.style.color = risqueColor(metier.risque);

  // Trier les tâches par statut
  const auto = metier.taches.filter(t => t.statut === 'automatisable');
  const enc  = metier.taches.filter(t => t.statut === 'en-cours');
  const hum  = metier.taches.filter(t => t.statut === 'non-automatise');

  document.getElementById('cnt-auto').textContent = auto.length;
  document.getElementById('cnt-enc').textContent  = enc.length;
  document.getElementById('cnt-hum').textContent  = hum.length;

  renderTaskCards('cards-auto', auto, 'auto');
  renderTaskCards('cards-enc',  enc,  'enc');
  renderTaskCards('cards-hum',  hum,  'hum');
}

function renderTaskCards(containerId, taches, type) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  if (taches.length === 0) {
    container.innerHTML = `<div style="color:var(--gray2);font-size:11px;text-align:center;padding:20px">Aucune tâche dans cette catégorie</div>`;
    return;
  }

  // Trier par gain décroissant
  taches.sort((a, b) => b.gainTemps - a.gainTemps);

  taches.forEach(tache => {
    const dotClass = type === 'auto' ? 'dot-auto' : type === 'enc' ? 'dot-enc' : 'dot-hum';
    const barColor = type === 'auto' ? '#00C896' : type === 'enc' ? '#F5A623' : '#4A5E72';
    const gainColor = type === 'hum' ? 'var(--gray)' : tache.gainTemps >= 70 ? '#00C896' : tache.gainTemps >= 50 ? '#F5A623' : 'var(--text)';

    const card = document.createElement('div');
    card.className = 'task-card';
    card.dataset.expanded = 'false';

    const toolsHtml = tache.outils && tache.outils.length > 0
      ? `<div class="tc-outils">
           <div class="tc-outils-lbl">Outils recommandés</div>
           <div class="tc-tags">
             ${tache.outils.map(o => `<span class="tc-tag">${o}</span>`).join('')}
           </div>
         </div>`
      : '';

    const reglHtml = tache.reglementation
      ? `<div class="tc-regl">⚖️ ${tache.reglementation}</div>`
      : '';

    card.innerHTML = `
      <div class="tc-top">
        <span class="tc-dot ${dotClass}"></span>
        <div class="tc-main">
          <div class="tc-nom">${tache.nom}</div>
          <div class="tc-bar-wrap">
            <div class="tc-bar-track">
              <div class="tc-bar-fill" style="width:${tache.gainTemps}%;background:${barColor}"></div>
            </div>
          </div>
          <div class="tc-tags">
            <span class="tc-tag ${risqueClass(tache.risque)}">Risque ${tache.risque}</span>
          </div>
        </div>
        <div class="tc-gain" style="color:${gainColor}">-${tache.gainTemps}%</div>
      </div>
      <div class="tc-detail" style="display:none">
        <div style="margin-bottom:5px">${tache.detail}</div>
        ${reglHtml}
        ${toolsHtml}
      </div>
    `;

    // Toggle expand
    card.addEventListener('click', () => {
      const detail = card.querySelector('.tc-detail');
      const expanded = card.dataset.expanded === 'true';
      detail.style.display = expanded ? 'none' : 'block';
      card.dataset.expanded = expanded ? 'false' : 'true';
      card.classList.toggle('expanded', !expanded);
    });

    container.appendChild(card);
  });
}

// ════════════════════════════════════════════════
// NAVIGATION — Retour vue carte
// ════════════════════════════════════════════════
document.getElementById('btn-back').addEventListener('click', () => {
  document.getElementById('view-tasks').classList.add('hidden');
  document.getElementById('view-map').classList.remove('hidden');
  document.getElementById('bc-sep').classList.add('hidden');
  document.getElementById('bc-metier').classList.add('hidden');
  document.getElementById('bc-metier').textContent = '';
  document.getElementById('nav-hint').textContent = 'Cliquer sur un métier pour explorer ses tâches →';
  currentMetier = null;
});