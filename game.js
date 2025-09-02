let questions = [];
let storyTemplates = {};

let prefs = JSON.parse(localStorage.getItem("prefs")) || {};
let qIndex = Number(localStorage.getItem("qIndex")) || 0;
let currentNode = localStorage.getItem("currentNode") || null;
const app = document.getElementById("app");

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
  app.innerHTML = `<p class="question-progress">Question ${step} of ${total}</p><h2>${q.text}</h2>` +
    q.answers.map(a => `<button>${a}</button>`).join("");
  [...app.querySelectorAll("button")].forEach(btn =>
    btn.addEventListener("click", () => {
      prefs[q.id] = btn.textContent;
      qIndex++;
      saveState();
      qIndex < questions.length ? renderQuestion() : startStory();
    })
  );
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
  app.innerHTML = `<p>${node.text}</p>` +
    (node.choices.map(c => `<button>${c.text}</button>`).join("") || "<button>Restart</button>");

  const buttons = [...app.querySelectorAll("button")];
  if (node.choices.length === 0) {
    buttons[0].addEventListener("click", resetGame);
  } else {
    buttons.forEach((btn, i) =>
      btn.addEventListener("click", () =>
        renderNode(node.choices[i].next, story)
      )
    );
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
  resetGame();
}

document.getElementById("clear-save").addEventListener("click", clearSave);

async function loadData() {
  const [qRes, sRes] = await Promise.all([
    fetch("questions.json"),
    fetch("stories.json")
  ]);
  const qData = await qRes.json();
  const sData = await sRes.json();
  questions = qData.questions;
  storyTemplates = sData;
}

async function init() {
  await loadData();
  if (qIndex >= questions.length) {
    const story = buildStory(prefs);
    const start = currentNode || "start";
    renderNode(start, story);
  } else {
    renderQuestion();
  }
}

init();
