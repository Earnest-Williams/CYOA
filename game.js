// Game engine rewrite with random seed selection, state handling, and requirement checks.
// Data holders
let questions = [];
let storyTemplates = {};

// Load saved state if running in browser
let prefs = typeof localStorage !== 'undefined' ? (JSON.parse(localStorage.getItem('prefs')) || {}) : {};
let qIndex = typeof localStorage !== 'undefined' ? (Number(localStorage.getItem('qIndex')) || 0) : 0;
let currentNode = typeof localStorage !== 'undefined' ? (localStorage.getItem('currentNode') || null) : null;
let gameState = typeof localStorage !== 'undefined'
  ? (JSON.parse(localStorage.getItem('gameState')) || { stats: {}, inventory: [] })
  : { stats: {}, inventory: [] };

const app = typeof document !== 'undefined' ? document.getElementById('app') : null;
if (app) {
  app.setAttribute('aria-live', 'polite');
}

function saveState() {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem('prefs', JSON.stringify(prefs));
  localStorage.setItem('qIndex', qIndex);
  localStorage.setItem('gameState', JSON.stringify(gameState));
  if (currentNode) {
    localStorage.setItem('currentNode', currentNode);
  } else {
    localStorage.removeItem('currentNode');
  }
}

// Select a random story seed based on desired length
function selectRandomStorySeed(templates, length) {
  const seeds = templates[length];
  if (!seeds) return { nodes: {} };
  // If multiple seeds provided, pick one at random
  if (Array.isArray(seeds)) {
    const idx = Math.floor(Math.random() * seeds.length);
    return JSON.parse(JSON.stringify(seeds[idx]));
  }
  // Otherwise clone the single seed
  return { nodes: JSON.parse(JSON.stringify(seeds)) };
}

// Update the visible stats and inventory
function renderGameState(state = gameState) {
  const statsText = Object.entries(state.stats)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');
  const invText = state.inventory.join(', ');

  if (app && typeof document !== 'undefined') {
    let statsDiv = document.getElementById('stats');
    let invDiv = document.getElementById('inventory');
    if (!statsDiv) {
      statsDiv = document.createElement('div');
      statsDiv.id = 'stats';
      app.prepend(statsDiv);
    }
    if (!invDiv) {
      invDiv = document.createElement('div');
      invDiv.id = 'inventory';
      app.prepend(invDiv);
    }
    statsDiv.textContent = statsText ? `Stats - ${statsText}` : 'Stats';
    invDiv.textContent = invText ? `Inventory - ${invText}` : 'Inventory';
  }
  return { statsText, invText };
}

// Apply effects from a choice to the current game state
function applyChoiceEffects(choice, state = gameState) {
  if (!choice || !choice.effects) return;
  const { stats = {}, inventory = {} } = choice.effects;
  for (const [k, v] of Object.entries(stats)) {
    state.stats[k] = (state.stats[k] || 0) + v;
  }
  if (inventory.add) {
    inventory.add.forEach(item => {
      if (!state.inventory.includes(item)) state.inventory.push(item);
    });
  }
  if (inventory.remove) {
    inventory.remove.forEach(item => {
      const idx = state.inventory.indexOf(item);
      if (idx !== -1) state.inventory.splice(idx, 1);
    });
  }
}

// Apply effects defined on a node when the node is entered
function applyNodeEffects(node, state = gameState) {
  if (!node || !node.effects) return;
  applyChoiceEffects({ effects: node.effects }, state);
}

// Check whether the player meets specified requirements
function checkRequirements(reqs = {}, state = gameState) {
  if (reqs.stats) {
    for (const [k, v] of Object.entries(reqs.stats)) {
      if ((state.stats[k] || 0) < v) return false;
    }
  }
  if (reqs.inventory) {
    for (const item of reqs.inventory) {
      if (!state.inventory.includes(item)) return false;
    }
  }
  return true;
}

function renderQuestion() {
  currentNode = null;
  saveState();
  const q = questions[qIndex];
  const step = qIndex + 1;
  const total = questions.length;
  if (!app) return;
  app.textContent = '';
  const progress = document.createElement('p');
  progress.className = 'question-progress';
  progress.setAttribute('aria-live', 'polite');
  progress.textContent = `Question ${step} of ${total}`;
  app.append(progress);

  const heading = document.createElement('h2');
  heading.setAttribute('aria-live', 'polite');
  heading.textContent = q.text;
  app.append(heading);

  const buttons = q.answers.map(a => {
    const btn = document.createElement('button');
    btn.textContent = a;
    btn.addEventListener('click', () => {
      prefs[q.id] = btn.textContent;
      qIndex++;
      saveState();
      qIndex < questions.length ? renderQuestion() : startStory();
    });
    app.append(btn);
    return btn;
  });

  if (buttons.length) buttons[0].focus();
}

function startStory() {
  const story = buildStory(prefs);
  renderNode('start', story);
}

function buildStory(prefs) {
  const seed = selectRandomStorySeed(storyTemplates, prefs.length);
  Object.values(seed.nodes).forEach(node => {
    node.text = node.text
      .replace(/{{tone}}/g, prefs.tone.toLowerCase())
      .replace(/{{genre}}/g, prefs.genre.toLowerCase());
  });
  return seed;
}

function renderNode(nodeId, story) {
  currentNode = nodeId;
  saveState();
  const node = story.nodes[nodeId];
  if (!node) return;
  applyNodeEffects(node);
  renderGameState();
  if (!app) return;

  app.textContent = '';
  const para = document.createElement('p');
  para.setAttribute('aria-live', 'polite');
  para.textContent = node.text;
  app.append(para);

  const choices = node.choices && node.choices.length
    ? node.choices
    : [{ text: 'Restart', next: null }];
  const buttons = [];
  choices.forEach(c => {
    if (c.requirements && !checkRequirements(c.requirements)) return;
    const btn = document.createElement('button');
    btn.textContent = c.text;
    btn.addEventListener('click', () => {
      applyChoiceEffects(c);
      if (c.next) {
        renderNode(c.next, story);
      } else {
        resetGame();
      }
    });
    app.append(btn);
    buttons.push(btn);
  });
  if (buttons.length) buttons[0].focus();
}

function resetGame() {
  prefs = {};
  qIndex = 0;
  currentNode = null;
  gameState = { stats: {}, inventory: [] };
  saveState();
  renderQuestion();
}

function clearSave() {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('prefs');
    localStorage.removeItem('qIndex');
    localStorage.removeItem('currentNode');
    localStorage.removeItem('gameState');
    localStorage.removeItem('theme');
    localStorage.removeItem('questionsData');
    localStorage.removeItem('storyTemplatesData');
  }
  const select = typeof document !== 'undefined' ? document.getElementById('theme-select') : null;
  if (select) {
    const themeClasses = typeof getThemesFromStyleSheets === 'function' ? getThemesFromStyleSheets() : [];
    themeClasses.forEach(cls => document.body.classList.remove(cls));
    select.value = '';
  }
  resetGame();
}

if (typeof document !== 'undefined') {
  const clearBtn = document.getElementById('clear-save');
  if (clearBtn) clearBtn.addEventListener('click', clearSave);
}

async function loadData() {
  try {
    const [qRes, sRes] = await Promise.all([
      fetch('questions.json'),
      fetch('stories.json')
    ]);
    const qData = await qRes.json();
    const sData = await sRes.json();
    questions = qData.questions;
    storyTemplates = sData;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('questionsData', JSON.stringify(qData));
      localStorage.setItem('storyTemplatesData', JSON.stringify(sData));
    }
  } catch (error) {
    if (typeof localStorage !== 'undefined') {
      const qCache = localStorage.getItem('questionsData');
      const sCache = localStorage.getItem('storyTemplatesData');
      if (qCache && sCache) {
        try {
          const qData = JSON.parse(qCache);
          const sData = JSON.parse(sCache);
          questions = qData.questions;
          storyTemplates = sData;
          return;
        } catch (_) {}
      }
    }
    if (app) {
      app.textContent = 'Failed to load game data. Check your connection and try again.';
      const retry = document.createElement('button');
      retry.textContent = 'Retry';
      retry.addEventListener('click', init);
      app.append(retry);
    }
    throw error;
  }
}

async function init() {
  try {
    await loadData();
  } catch (e) {
    console.error(e);
    return;
  }
  if (qIndex >= questions.length) {
    const story = buildStory(prefs);
    const start = currentNode || 'start';
    renderNode(start, story);
  } else {
    renderQuestion();
  }
}

if (typeof document !== 'undefined') {
  init();
}

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    selectRandomStorySeed,
    renderGameState,
    applyChoiceEffects,
    applyNodeEffects,
    checkRequirements,
  };
}
