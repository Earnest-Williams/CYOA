let questions = [];
let storyTemplates = {};

let prefs = JSON.parse(localStorage.getItem("prefs")) || {};
let qIndex = Number(localStorage.getItem("qIndex")) || 0;
let currentNode = localStorage.getItem("currentNode") || null;
const app = document.getElementById("app");
app.setAttribute("aria-live", "polite");

function saveState() {
  localStorage.setItem("prefs", JSON.stringify(prefs));
  localStorage.setItem("qIndex", qIndex);
  currentNode
    ? localStorage.setItem("currentNode", currentNode)
    : localStorage.removeItem("currentNode");
}

function renderQuestion() {
  currentNode = null;
  saveState();
  const q = questions[qIndex];
  const step = qIndex + 1;
  const total = questions.length;
  app.textContent = "";
  const progress = document.createElement("p");
  progress.className = "question-progress";
  progress.setAttribute("aria-live", "polite");
  progress.textContent = `Question ${step} of ${total}`;
  app.append(progress);

  const heading = document.createElement("h2");
  heading.setAttribute("aria-live", "polite");
  heading.textContent = q.text;
  app.append(heading);

  const buttons = q.answers.map(a => {
    const btn = document.createElement("button");
    btn.textContent = a;
    btn.addEventListener("click", () => {
      prefs[q.id] = btn.textContent;
      qIndex++;
      saveState();
      qIndex < questions.length ? renderQuestion() : startStory();
    });
    app.append(btn);
    return btn;
  });

  if (buttons.length) {
    buttons[0].focus();
  }
}

function startStory() {
  const story = buildStory(prefs);
  renderNode("start", story);
}

function buildStory(prefs) {
  const nodes = JSON.parse(JSON.stringify(storyTemplates[prefs.length]));
  Object.values(nodes).forEach(node => {
    node.text = node.text
      .replace(/{{tone}}/g, prefs.tone.toLowerCase())
      .replace(/{{genre}}/g, prefs.genre.toLowerCase());
  });
  return { nodes };
}

function renderNode(nodeId, story) {
  currentNode = nodeId;
  saveState();
  const node = story.nodes[nodeId];
  app.textContent = "";
  const para = document.createElement("p");
  para.setAttribute("aria-live", "polite");
  para.textContent = node.text;
  app.append(para);

  const buttons =
    node.choices.length > 0
      ? node.choices.map(c => {
          const btn = document.createElement("button");
          btn.textContent = c.text;
          btn.addEventListener("click", () =>
            renderNode(c.next, story)
          );
          app.append(btn);
          return btn;
        })
      : [
          (() => {
            const btn = document.createElement("button");
            btn.textContent = "Restart";
            btn.addEventListener("click", resetGame);
            app.append(btn);
            return btn;
          })()
        ];

  if (buttons.length) {
    buttons[0].focus();
  }
}

function resetGame() {
  prefs = {};
  qIndex = 0;
  currentNode = null;
  saveState();
  renderQuestion();
}

function clearSave() {
  localStorage.removeItem("prefs");
  localStorage.removeItem("qIndex");
  localStorage.removeItem("currentNode");
  localStorage.removeItem("theme");
  localStorage.removeItem("questionsData");
  localStorage.removeItem("storyTemplatesData");
  const select = document.getElementById("theme-select");
  if (select) {
    const themeClasses =
      typeof getThemesFromStyleSheets === "function"
        ? getThemesFromStyleSheets()
        : [];
    themeClasses.forEach(cls => document.body.classList.remove(cls));
    select.value = "";
  }
  resetGame();
}

document.getElementById("clear-save").addEventListener("click", clearSave);

async function loadData() {
  try {
    const [qRes, sRes] = await Promise.all([
      fetch("questions.json"),
      fetch("stories.json")
    ]);
    const qData = await qRes.json();
    const sData = await sRes.json();
    questions = qData.questions;
    storyTemplates = sData;
    localStorage.setItem("questionsData", JSON.stringify(qData));
    localStorage.setItem("storyTemplatesData", JSON.stringify(sData));
  } catch (error) {
    const qCache = localStorage.getItem("questionsData");
    const sCache = localStorage.getItem("storyTemplatesData");
    if (qCache && sCache) {
      try {
        const qData = JSON.parse(qCache);
        const sData = JSON.parse(sCache);
        questions = qData.questions;
        storyTemplates = sData;
        return;
      } catch (e) {
        // fall through to display error
      }
    }
    app.textContent = "Failed to load game data. Check your connection and try again.";
    const retry = document.createElement("button");
    retry.textContent = "Retry";
    retry.addEventListener("click", init);
    app.append(retry);
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
    const start = currentNode || "start";
    renderNode(start, story);
  } else {
    renderQuestion();
  }
}

init();
