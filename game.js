// Game engine rewrite with random seed selection, state handling, and requirement checks.
// Data holders
let questions = [];
let storyTemplates = {};

function loadStoredJson(key, fallback) {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed !== null ? parsed : fallback;
  } catch (error) {
    console.warn(`Failed to parse stored ${key}:`, error);
    return fallback;
  }
}

function createDefaultGameState() {
  return {
    stats: {},
    inventory: [],
    log: [],
    appliedNodeEffects: {},
    identity: {},
  };
}

function normalizeGameState(state) {
  const base = createDefaultGameState();
  if (!state || typeof state !== 'object') {
    return base;
  }

  if (state.stats && typeof state.stats === 'object') {
    base.stats = { ...state.stats };
  }

  if (Array.isArray(state.inventory)) {
    base.inventory = [...state.inventory];
  }

  if (Array.isArray(state.log)) {
    base.log = [...state.log];
  }

  if (state.appliedNodeEffects && typeof state.appliedNodeEffects === 'object') {
    base.appliedNodeEffects = { ...state.appliedNodeEffects };
  }

  if (state.identity && typeof state.identity === 'object') {
    base.identity = { ...state.identity };
  }

  return base;
}

// Load saved state if running in browser
let prefs = loadStoredJson('prefs', {});
let qIndex = typeof localStorage !== 'undefined' ? (Number(localStorage.getItem('qIndex')) || 0) : 0;
let currentNode = typeof localStorage !== 'undefined' ? (localStorage.getItem('currentNode') || null) : null;
if (currentNode === 'undefined' || currentNode === 'null') {
  currentNode = null;
}
let gameState = normalizeGameState(loadStoredJson('gameState', null));

if (!prefs || typeof prefs !== 'object') {
  prefs = {};
}

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

function logEvent(message) {
  if (!message) return;
  if (!Array.isArray(gameState.log)) gameState.log = [];
  gameState.log.push(message);
  if (gameState.log.length > 12) {
    gameState.log.shift();
  }
}

function formatLabel(key) {
  if (!key) return '';
  const label = key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  return label;
}

function canonicalKey(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function resolveKey(value, aliases = {}) {
  const key = canonicalKey(value);
  return aliases[key] || key;
}

function deriveIdentity(state = gameState, preferences = prefs) {
  const statsEntries = Object.entries(state?.stats || {})
    .filter(([, v]) => typeof v === 'number')
    .sort((a, b) => b[1] - a[1]);

  const [primaryEntry, secondaryEntry] = statsEntries;
  const primaryStat = primaryEntry ? primaryEntry[0] : '';
  const secondaryStat = secondaryEntry ? secondaryEntry[0] : '';
  const primaryValue = primaryEntry ? primaryEntry[1] : 0;

  const originKey = resolveKey(preferences?.origin, {
    'noble lineage': 'noble',
    'frontier wilds': 'frontier',
    'arcane academy': 'scholar',
    'hidden enclave': 'outcast',
  });

  const temperamentKey = resolveKey(preferences?.temperament);
  const motivationKey = resolveKey(preferences?.motivation);

  const temperamentTitles = {
    bold: 'Firebrand',
    calm: 'Serene',
    cunning: 'Shadowed',
    compassionate: 'Heartbound',
  };

  const originTitles = {
    noble: 'Scion',
    frontier: 'Pathfinder',
    scholar: 'Archivist',
    outcast: 'Wanderer',
  };

  const temperamentInsights = {
    bold: 'Your decisive nature craves swift momentum.',
    calm: 'You weigh each move with tranquil assurance.',
    cunning: 'You instinctively search for hidden leverage.',
    compassionate: 'You look for ways to uplift those around you.',
  };

  const motivationInsights = {
    redemption: 'Every choice is measured against the promise of redemption.',
    wealth: 'Prosperity glitters at the edge of every opportunity.',
    knowledge: 'Curiosity urges you to uncover every secret.',
    legacy: 'You assess how each step shapes the legend you leave behind.',
  };

  const epithetParts = [];
  if (temperamentTitles[temperamentKey]) epithetParts.push(temperamentTitles[temperamentKey]);
  if (originTitles[originKey]) epithetParts.push(originTitles[originKey]);

  const epithet = epithetParts.length ? `the ${epithetParts.join(' ')}` : 'the Adventurer';
  const primaryStatLabel = primaryStat ? formatLabel(primaryStat) : 'Potential';
  const secondaryStatLabel = secondaryStat ? formatLabel(secondaryStat) : '';

  const summaryPieces = [];
  if (primaryStat) {
    summaryPieces.push(`Renowned for ${primaryStatLabel.toLowerCase()} (${primaryValue}).`);
  }
  if (secondaryStat) {
    summaryPieces.push(`Backed by ${secondaryStatLabel.toLowerCase()}.`);
  }
  if (temperamentInsights[temperamentKey]) {
    summaryPieces.push(temperamentInsights[temperamentKey]);
  }
  if (motivationInsights[motivationKey]) {
    summaryPieces.push(motivationInsights[motivationKey]);
  }

  const summary = summaryPieces.join(' ');

  return {
    epithet,
    primaryStat,
    primaryStatLabel,
    primaryStatValue: primaryValue,
    secondaryStat,
    secondaryStatLabel,
    origin: preferences?.origin || '',
    temperament: preferences?.temperament || '',
    motivation: preferences?.motivation || '',
    summary,
  };
}

function updateIdentity(state = gameState, preferences = prefs) {
  const previous = state?.identity || {};
  const identity = deriveIdentity(state, preferences);
  state.identity = identity;
  if (previous.epithet && identity.epithet && previous.epithet !== identity.epithet) {
    logEvent(`You now bear the mantle of ${identity.epithet}.`);
  }
  return identity;
}

function generateIdentityReaction(identity, node) {
  if (!identity) return '';
  const insights = [];

  if (identity.primaryStat) {
    const score = identity.primaryStatValue || 0;
    const label = identity.primaryStatLabel.toLowerCase();
    if (score >= 12) {
      insights.push(`Your mastery of ${label} can turn this moment in your favor.`);
    } else if (score >= 8) {
      insights.push(`You weigh how your ${label} might guide the outcome.`);
    } else if (score) {
      insights.push(`You consider whether nurturing your ${label} will help here.`);
    }
  }

  const temperamentKey = resolveKey(identity.temperament);
  const temperamentGuidance = {
    bold: 'Bold instincts urge decisive action.',
    calm: 'Your calm outlook favors patience.',
    cunning: 'Cunning whispers that a clever angle exists.',
    compassionate: 'Compassion draws your attention to who might need aid.',
  };
  if (temperamentGuidance[temperamentKey]) {
    insights.push(temperamentGuidance[temperamentKey]);
  }

  const motivationKey = resolveKey(identity.motivation);
  const motivationGuidance = {
    redemption: 'You test each option against the path to redemption.',
    wealth: 'You evaluate which choice promises the greatest reward.',
    knowledge: 'You are hungry to learn what secrets lie ahead.',
    legacy: 'You envision how this decision echoes through history.',
  };
  if (motivationGuidance[motivationKey]) {
    insights.push(motivationGuidance[motivationKey]);
  }

  const statImpact = node?.effects?.stats || null;
  if (statImpact) {
    const [statKey] = Object.keys(statImpact);
    if (statKey) {
      const statLabel = formatLabel(statKey).toLowerCase();
      if (resolveKey(statKey) === resolveKey(identity.primaryStat)) {
        insights.push(`This encounter resonates with your honed ${statLabel}.`);
      } else {
        insights.push(`You anticipate how your ${statLabel} might shift if you press on.`);
      }
    }
  } else {
    const requirementChoice = Array.isArray(node?.choices)
      ? node.choices.find(choice => choice.requirements?.stats)
      : null;
    if (requirementChoice && requirementChoice.requirements.stats) {
      const [reqStat] = Object.keys(requirementChoice.requirements.stats);
      if (reqStat) {
        const statLabel = formatLabel(reqStat).toLowerCase();
        insights.push(`One path demands notable ${statLabel}.`);
      }
    }
  }

  return insights.join(' ');
}

// Select a random story seed based on desired length
function selectRandomStorySeed(templates, length) {
  if (!templates || !Object.keys(templates).length) {
    return { nodes: {} };
  }
  const target = templates[length] || templates[length?.toLowerCase()] || templates.Medium || templates.medium;
  if (!target) {
    const firstKey = Object.keys(templates)[0];
    return JSON.parse(JSON.stringify(Array.isArray(templates[firstKey]) ? templates[firstKey][0] : templates[firstKey]));
  }
  const pool = Array.isArray(target) ? target : [target];
  if (!pool.length) return { nodes: {} };
  const idx = Math.floor(Math.random() * pool.length);
  return JSON.parse(JSON.stringify(pool[idx]));
}

// Update the visible stats and inventory
function renderGameState(state = gameState) {
  const statsEntries = Object.entries(state.stats || {});
  const inventoryItems = Array.isArray(state.inventory) ? state.inventory : [];
  const statsText = statsEntries.map(([k, v]) => `${k}: ${v}`).join(', ');
  const invText = inventoryItems.join(', ');

  if (typeof document !== 'undefined') {
    const profile = document.getElementById('profile');
    if (profile) {
      profile.textContent = '';

      const section = document.createDocumentFragment();

      const addHeading = (label) => {
        const heading = document.createElement('p');
        heading.className = 'section-heading';
        heading.textContent = label;
        section.appendChild(heading);
      };

      const prefEntries = Object.entries(prefs || {});
      const identity = (state.identity && Object.keys(state.identity).length)
        ? state.identity
        : deriveIdentity(state, prefs);
      const hasPersonaDetails = identity && (identity.summary || prefEntries.length || statsEntries.length);
      addHeading('Persona');
      if (hasPersonaDetails) {
        const persona = document.createElement('div');
        persona.className = 'persona-block';

        if (identity.epithet) {
          const epithet = document.createElement('p');
          epithet.className = 'persona-epithet';
          epithet.textContent = `You are ${identity.epithet}.`;
          persona.appendChild(epithet);
        }

        if (identity.summary) {
          const summary = document.createElement('p');
          summary.className = 'persona-summary';
          summary.textContent = identity.summary;
          persona.appendChild(summary);
        }

        const tags = document.createElement('div');
        tags.className = 'persona-tags';

        if (identity.primaryStatLabel) {
          const statTag = document.createElement('span');
          statTag.className = 'persona-pill';
          statTag.textContent = `${identity.primaryStatLabel}: ${identity.primaryStatValue}`;
          tags.appendChild(statTag);
        }

        if (identity.origin) {
          const originTag = document.createElement('span');
          originTag.className = 'persona-pill';
          originTag.textContent = `Origin: ${identity.origin}`;
          tags.appendChild(originTag);
        }

        if (identity.temperament) {
          const temperamentTag = document.createElement('span');
          temperamentTag.className = 'persona-pill';
          temperamentTag.textContent = `Temperament: ${identity.temperament}`;
          tags.appendChild(temperamentTag);
        }

        if (identity.motivation) {
          const motivationTag = document.createElement('span');
          motivationTag.className = 'persona-pill';
          motivationTag.textContent = `Driven by ${identity.motivation}`;
          tags.appendChild(motivationTag);
        }

        if (tags.childElementCount) {
          persona.appendChild(tags);
        }

        section.appendChild(persona);
      } else {
        const emptyPersona = document.createElement('p');
        emptyPersona.className = 'muted-text';
        emptyPersona.textContent = 'Answer the prompts to define your legend.';
        section.appendChild(emptyPersona);
      }

      addHeading('Attributes');
      if (statsEntries.length) {
        const list = document.createElement('ul');
        list.className = 'stats-list';
        statsEntries.forEach(([k, v]) => {
          const item = document.createElement('li');
          const label = document.createElement('span');
          label.textContent = formatLabel(k);
          const value = document.createElement('strong');
          value.textContent = v;
          item.append(label, value);
          list.appendChild(item);
        });
        section.appendChild(list);
      } else {
        const empty = document.createElement('p');
        empty.className = 'muted-text';
        empty.textContent = 'Answer the prompts to forge your hero\'s abilities.';
        section.appendChild(empty);
      }

      addHeading('Inventory');
      if (inventoryItems.length) {
        const list = document.createElement('ul');
        list.className = 'inventory-list';
        inventoryItems.forEach((itemText) => {
          const item = document.createElement('li');
          item.textContent = itemText;
          list.appendChild(item);
        });
        section.appendChild(list);
      } else {
        const empty = document.createElement('p');
        empty.className = 'muted-text';
        empty.textContent = 'You have yet to gather any notable gear.';
        section.appendChild(empty);
      }

      if (prefEntries.length) {
        addHeading('Traits');
        const list = document.createElement('ul');
        list.className = 'profile-list';
        prefEntries.forEach(([k, v]) => {
          const item = document.createElement('li');
          item.className = 'profile-item';
          const label = document.createElement('span');
          label.className = 'profile-label';
          label.textContent = formatLabel(k);
          const value = document.createElement('span');
          value.textContent = v;
          item.append(label, value);
          list.appendChild(item);
        });
        section.appendChild(list);
      }

      profile.appendChild(section);
    }

    const logContainer = document.getElementById('log');
    if (logContainer) {
      logContainer.textContent = '';
      const logEntries = Array.isArray(state.log) ? state.log.slice(-10).reverse() : [];
      if (logEntries.length) {
        const list = document.createElement('ul');
        list.className = 'log-list';
        logEntries.forEach((entry) => {
          const item = document.createElement('li');
          item.textContent = entry;
          list.appendChild(item);
        });
        logContainer.appendChild(list);
      } else {
        const empty = document.createElement('p');
        empty.className = 'muted-text';
        empty.textContent = 'Your journey log will fill as your legend grows.';
        logContainer.appendChild(empty);
      }
    }
  }

  return { statsText, invText };
}

// Apply effects from a choice to the current game state
function applyChoiceEffects(choice, state = gameState) {
  if (!choice || !choice.effects) return;
  const { stats = {}, inventory = {}, log } = choice.effects;
  for (const [k, v] of Object.entries(stats)) {
    state.stats[k] = (state.stats[k] || 0) + v;
    if (v !== 0) {
      const direction = v >= 0 ? 'increases' : 'decreases';
      logEvent(`Your ${formatLabel(k)} ${direction} by ${Math.abs(v)}.`);
    }
  }
  if (inventory.add) {
    inventory.add.forEach(item => {
      if (!state.inventory.includes(item)) {
        state.inventory.push(item);
        logEvent(`You gain ${item}.`);
      }
    });
  }
  if (inventory.remove) {
    inventory.remove.forEach(item => {
      const idx = state.inventory.indexOf(item);
      if (idx !== -1) {
        state.inventory.splice(idx, 1);
        logEvent(`You part with ${item}.`);
      }
    });
  }
  if (log) {
    logEvent(log);
  }

  updateIdentity(state, prefs);
}

// Apply effects defined on a node when the node is entered
function applyNodeEffects(nodeOrId, maybeNode, maybeState = gameState) {
  let nodeId = null;
  let node = nodeOrId;
  let state = maybeState;

  if (typeof nodeOrId === 'string' || typeof nodeOrId === 'number') {
    nodeId = nodeOrId;
    node = maybeNode;
  } else {
    state = maybeNode || gameState;
  }

  if (!node || !node.effects) return;
  if (!state || typeof state !== 'object') return;

  const repeatable = Boolean(node.repeatableEffects);
  if (!repeatable) {
    if (!state.appliedNodeEffects || typeof state.appliedNodeEffects !== 'object') {
      state.appliedNodeEffects = {};
    }
    if (nodeId && state.appliedNodeEffects[nodeId]) {
      return;
    }
  }

  applyChoiceEffects({ effects: node.effects }, state);

  if (!repeatable && nodeId) {
    state.appliedNodeEffects[nodeId] = true;
  }

  updateIdentity(state, prefs);
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
  renderGameState();
  const q = questions[qIndex];
  const step = qIndex + 1;
  const total = questions.length;
  if (!app) return;
  app.textContent = '';
  const container = document.createElement('div');
  container.className = 'question-card';

  const progress = document.createElement('p');
  progress.className = 'question-progress';
  progress.textContent = `Question ${step} of ${total}`;
  container.append(progress);

  const progressBar = document.createElement('div');
  progressBar.className = 'progress-bar';
  const progressValue = document.createElement('span');
  progressValue.style.width = `${Math.round(((step - 1) / total) * 100)}%`;
  progressBar.append(progressValue);
  container.append(progressBar);

  const heading = document.createElement('h2');
  heading.textContent = q.text;
  container.append(heading);

  const choices = document.createElement('div');
  choices.className = 'choice-grid';
  const buttons = q.answers.map((answer, idx) => {
    const btn = document.createElement('button');
    btn.className = idx === 0 ? 'primary' : 'secondary';
    btn.textContent = answer;
    btn.addEventListener('click', () => {
      prefs[q.id] = answer;
      qIndex++;
      saveState();
      renderGameState();
      qIndex < questions.length ? renderQuestion() : startStory();
    });
    choices.append(btn);
    return btn;
  });

  container.append(choices);
  app.append(container);

  if (buttons.length) buttons[0].focus();
}

function startStory() {
  const story = buildStory(prefs, { resetState: true });
  logEvent('A new chapter begins.');
  renderGameState();
  renderNode('start', story);
}

function buildStory(prefs, { resetState = true } = {}) {
  const lengthPref = prefs.length || 'Medium';
  const seed = selectRandomStorySeed(storyTemplates, lengthPref);
  if (!seed || !seed.nodes) {
    return { nodes: {} };
  }

  const story = {
    meta: seed.meta || {},
    nodes: seed.nodes || {},
  };

  if (resetState) {
    gameState = normalizeGameState({
      stats: { ...(story.meta.stats || {}) },
      inventory: Array.isArray(story.meta.inventory)
        ? [...story.meta.inventory]
        : [],
      log: [],
      appliedNodeEffects: {},
    });
  } else {
    gameState = normalizeGameState(gameState);
  }

  const preferenceBonuses = {
    casual: { health: 4 },
    strategic: { insight: 3 },
    narrative: { influence: 2 },
    'risk-taker': { daring: 3 },
  };

  const focusBonuses = {
    character: { influence: 2 },
    plot: { resolve: 2 },
    world: { lore: 3 },
    discovery: { insight: 2 },
  };

  const motivationBonuses = {
    redemption: { resolve: 2 },
    wealth: { fortune: 3 },
    knowledge: { lore: 3 },
    legacy: { influence: 2 },
  };

  const originPackages = {
    noble: {
      stats: { influence: 2, fortune: 2 },
      inventory: ["Crested Signet"],
      log: 'Your noble lineage lends resources and sway.',
    },
    frontier: {
      stats: { health: 2, daring: 2 },
      inventory: ["Weathered Compass"],
      log: 'Frontier grit steels you for hardship.',
    },
    scholar: {
      stats: { insight: 3, lore: 2 },
      inventory: ["Annotated Map"],
      log: 'Years of study sharpen your understanding.',
    },
    outcast: {
      stats: { resolve: 2, stealth: 2 },
      inventory: ["Hidden Cache Key"],
      log: 'Life on the fringes has taught you how to endure unseen.',
    },
  };

  const temperamentPackages = {
    bold: {
      stats: { daring: 3, resolve: 1 },
      log: 'Bold instincts push you toward daring action.',
    },
    calm: {
      stats: { resolve: 2, health: 1 },
      log: 'Your calm heart steadies you when storms rise.',
    },
    cunning: {
      stats: { insight: 2, stealth: 1 },
      inventory: ["Glass Dagger"],
      log: 'Cunning senses reveal hidden advantages.',
    },
    compassionate: {
      stats: { influence: 1, empathy: 2 },
      inventory: ["Healer's Cord"],
      log: 'Compassion binds allies to your cause.',
    },
  };

  const applyBonuses = (bonusMap, key) => {
    if (!key) return;
    const canonical = resolveKey(key);
    const bonus = bonusMap[canonical];
    if (!bonus) return;
    for (const [stat, value] of Object.entries(bonus)) {
      gameState.stats[stat] = (gameState.stats[stat] || 0) + value;
    }
  };

  const applyPackage = (pkg, { includeStats = true } = {}) => {
    if (!pkg) return;
    if (includeStats && pkg.stats) {
      for (const [stat, value] of Object.entries(pkg.stats)) {
        gameState.stats[stat] = (gameState.stats[stat] || 0) + value;
      }
    }
    if (Array.isArray(pkg.inventory)) {
      pkg.inventory.forEach(item => {
        if (!gameState.inventory.includes(item)) {
          gameState.inventory.push(item);
        }
      });
    }
    if (includeStats && pkg.log) {
      logEvent(pkg.log);
    }
  };

  const originKey = resolveKey(prefs.origin, {
    'noble lineage': 'noble',
    'frontier wilds': 'frontier',
    'arcane academy': 'scholar',
    'hidden enclave': 'outcast',
  });
  const temperamentKey = resolveKey(prefs.temperament);

  if (resetState) {
    applyBonuses(preferenceBonuses, prefs.playstyle);
    applyBonuses(focusBonuses, prefs.focus);
    applyBonuses(motivationBonuses, prefs.motivation);
    applyPackage(originPackages[originKey], { includeStats: true });
    applyPackage(temperamentPackages[temperamentKey], { includeStats: true });

    if (prefs.companion && !gameState.inventory.includes(prefs.companion)) {
      gameState.inventory.push(prefs.companion);
    }
    if (prefs.signature && !gameState.inventory.includes(prefs.signature)) {
      gameState.inventory.push(prefs.signature);
    }
  } else {
    applyPackage(originPackages[originKey], { includeStats: false });
    applyPackage(temperamentPackages[temperamentKey], { includeStats: false });
    if (prefs.companion && !gameState.inventory.includes(prefs.companion)) {
      gameState.inventory.push(prefs.companion);
    }
    if (prefs.signature && !gameState.inventory.includes(prefs.signature)) {
      gameState.inventory.push(prefs.signature);
    }
  }

  const identity = updateIdentity(gameState, prefs);

  const replacements = Object.fromEntries(
    Object.entries(prefs).map(([k, v]) => [k.toLowerCase(), v])
  );
  replacements.focus_trait = {
    character: 'relationships',
    plot: 'twists',
    world: 'lore',
    discovery: 'mysteries',
  }[(prefs.focus || '').toLowerCase()] || 'possibilities';
  replacements.playstyle_trait = {
    casual: 'steady intuition',
    strategic: 'methodical planning',
    narrative: 'empathic storytelling',
    'risk-taker': 'audacious gambits',
  }[(prefs.playstyle || '').toLowerCase()] || 'adaptability';
  replacements.motivation = prefs.motivation || 'curiosity';
  replacements.genre = prefs.genre || 'story';
  replacements.tone = (prefs.tone || '').toLowerCase();
  replacements.companion = prefs.companion || 'no companion';
  replacements.signature = prefs.signature || 'wits';
  replacements.origin = prefs.origin || 'an unknown past';
  replacements.temperament = prefs.temperament || 'balanced instincts';
  replacements.hero_epithet = identity?.epithet || 'the Adventurer';
  replacements.primary_stat = identity?.primaryStatLabel || 'Potential';
  replacements.primary_stat_value = String(identity?.primaryStatValue ?? '0');
  replacements.identity_summary = identity?.summary || '';

  if (story.meta) {
    const personaLineParts = [];
    if (identity?.epithet) {
      personaLineParts.push(`You are ${identity.epithet}`);
    }
    if (identity?.summary) {
      personaLineParts.push(identity.summary);
    }
    const personaLine = personaLineParts.join(' — ');
    if (personaLine) {
      story.meta.subtitle = story.meta.subtitle
        ? `${story.meta.subtitle} ${personaLine}`
        : personaLine;
    }
  }

  const applyPlaceholders = (value) => {
    if (typeof value === 'string') {
      return value.replace(/{{(\w+)}}/g, (_, key) => {
        const replacement = replacements[key.toLowerCase()];
        return replacement !== undefined ? replacement : '';
      });
    }
    if (Array.isArray(value)) {
      return value.map(applyPlaceholders);
    }
    if (value && typeof value === 'object') {
      const result = {};
      Object.entries(value).forEach(([k, v]) => {
        result[k] = applyPlaceholders(v);
      });
      return result;
    }
    return value;
  };

  story.meta = applyPlaceholders(story.meta);
  story.nodes = applyPlaceholders(story.nodes);

  return story;
}

function renderNode(nodeId, story) {
  currentNode = nodeId;
  saveState();
  const node = story.nodes[nodeId];
  if (!node) return;
  applyNodeEffects(nodeId, node);
  const summary = node.log || node.title || (node.text ? node.text.split(/[.!?]/)[0] : 'A turning point');
  const lastLog = Array.isArray(gameState.log) ? gameState.log[gameState.log.length - 1] : null;
  if (summary && summary !== lastLog) {
    logEvent(summary);
  }
  renderGameState();
  saveState();
  if (!app) return;

  app.textContent = '';
  const storyContainer = document.createElement('div');
  storyContainer.className = 'story-content';

  if (story.meta && story.meta.title) {
    const title = document.createElement(nodeId === 'start' ? 'h2' : 'h3');
    title.className = nodeId === 'start' ? 'story-title' : 'chapter-title';
    title.textContent = nodeId === 'start' ? story.meta.title : node.title || story.meta.title;
    storyContainer.append(title);
    if (nodeId === 'start' && story.meta.subtitle) {
      const subtitle = document.createElement('p');
      subtitle.className = 'muted-text';
      subtitle.textContent = story.meta.subtitle;
      storyContainer.append(subtitle);
    }
  } else if (node.title) {
    const title = document.createElement('h3');
    title.className = 'chapter-title';
    title.textContent = node.title;
    storyContainer.append(title);
  }

  const paragraph = document.createElement('p');
  paragraph.textContent = node.text;
  storyContainer.append(paragraph);

  if (node.flavor) {
    const flavor = document.createElement('p');
    flavor.className = 'muted-text';
    flavor.textContent = node.flavor;
    storyContainer.append(flavor);
  }

  const identityEcho = generateIdentityReaction(gameState.identity, node);
  if (identityEcho) {
    const echo = document.createElement('p');
    echo.className = 'identity-echo';
    echo.textContent = identityEcho;
    storyContainer.append(echo);
  }

  const choices = node.choices && node.choices.length
    ? node.choices
    : [{ text: 'Restart your tale', next: null, style: 'secondary' }];
  const choiceGrid = document.createElement('div');
  choiceGrid.className = 'choice-grid';
  const buttons = [];
  choices.forEach(c => {
    if (c.requirements && !checkRequirements(c.requirements)) return;
    const btn = document.createElement('button');
    btn.className = c.style || 'primary';
    btn.textContent = c.text;
    if (c.hint) {
      btn.title = c.hint;
    }
    btn.addEventListener('click', () => {
      applyChoiceEffects(c);
      saveState();
      if (c.next) {
        renderNode(c.next, story);
      } else {
        resetGame();
      }
    });
    choiceGrid.append(btn);
    buttons.push(btn);
  });

  if (!buttons.length) {
    const fallback = document.createElement('button');
    fallback.className = 'secondary';
    fallback.textContent = 'Return to the beginning';
    fallback.addEventListener('click', resetGame);
    choiceGrid.append(fallback);
    buttons.push(fallback);
  }

  storyContainer.append(choiceGrid);

  const footer = document.createElement('div');
  footer.className = 'story-footer';
  const focusTag = document.createElement('p');
  focusTag.textContent = `Focus: ${prefs.focus || 'Balanced'}`;
  const playstyleTag = document.createElement('p');
  playstyleTag.textContent = `Approach: ${prefs.playstyle || 'Adaptive'}`;
  const motivationTag = document.createElement('p');
  motivationTag.textContent = `Motivation: ${prefs.motivation || 'Curiosity'}`;
  footer.append(focusTag, playstyleTag, motivationTag);
  storyContainer.append(footer);

  app.append(storyContainer);
  if (buttons.length) buttons[0].focus();
}

function resetGame() {
  prefs = {};
  qIndex = 0;
  currentNode = null;
  gameState = createDefaultGameState();
  saveState();
  renderGameState();
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
    storyTemplates = sData.templates || sData;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('questionsData', JSON.stringify(qData));
      localStorage.setItem('storyTemplatesData', JSON.stringify(sData));
    }
  } catch (error) {
    if (typeof localStorage !== 'undefined') {
      const qCache = loadStoredJson('questionsData', null);
      const sCache = loadStoredJson('storyTemplatesData', null);
      if (qCache && sCache) {
        questions = qCache.questions;
        storyTemplates = sCache.templates || sCache;
        return;
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
  renderGameState();
  if (qIndex >= questions.length) {
    const story = buildStory(prefs, { resetState: false });
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
