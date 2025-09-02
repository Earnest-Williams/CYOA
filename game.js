const questions = [
  { id: "genre", text: "Preferred genre?", answers: ["Fantasy", "Sci‑Fi", "Mystery"] },
  { id: "tone", text: "Tone?", answers: ["Light‑hearted", "Serious"] },
  { id: "length", text: "Desired length?", answers: ["Short", "Medium", "Long"] }
];

let prefs = {};
let qIndex = 0;
const app = document.getElementById("app");

function renderQuestion() {
  const q = questions[qIndex];
  const step = qIndex + 1;
  const total = questions.length;
  app.innerHTML = `<p class="question-progress">Question ${step} of ${total}</p><h2>${q.text}</h2>` +
    q.answers.map(a => `<button>${a}</button>`).join("");
  [...app.querySelectorAll("button")].forEach(btn =>
    btn.addEventListener("click", () => {
      prefs[q.id] = btn.textContent;
      qIndex++;
      qIndex < questions.length ? renderQuestion() : startStory();
    })
  );
}

function startStory() {
  const story = buildStory(prefs);
  renderNode("start", story);
}

function buildStory(prefs) {
  const genre = prefs.genre;
  const tone = prefs.tone;
  const length = prefs.length;
  let nodes;

  if (length === "Medium") {
    nodes = {
      start: {
        text: `You enter a ${tone.toLowerCase()} ${genre.toLowerCase()} world. You press onward.`,
        choices: [{ text: "Continue", next: "middle" }]
      },
      middle: {
        text: "The path splits ahead.",
        choices: [
          { text: "Go left", next: "left_end" },
          { text: "Go right", next: "right_end" }
        ]
      },
      left_end: { text: "A mysterious figure appears. The end!", choices: [] },
      right_end: { text: "You find treasure. The end!", choices: [] }
    };
  } else if (length === "Long") {
    nodes = {
      start: {
        text: `You enter a ${tone.toLowerCase()} ${genre.toLowerCase()} world. Two roads stretch out ahead.`,
        choices: [
          { text: "Take the forest path", next: "forest" },
          { text: "Take the mountain path", next: "mountain" }
        ]
      },
      forest: {
        text: "The forest thickens and a river blocks your way.",
        choices: [
          { text: "Build a raft", next: "raft" },
          { text: "Search for a bridge", next: "bridge" }
        ]
      },
      mountain: {
        text: "A steep climb challenges you.",
        choices: [
          { text: "Climb higher", next: "peak" },
          { text: "Explore a cave", next: "cave" }
        ]
      },
      raft: { text: "You sail to a hidden grove. The end!", choices: [] },
      bridge: { text: "You cross safely into a village. The end!", choices: [] },
      peak: { text: "At the peak, you glimpse new horizons. The end!", choices: [] },
      cave: { text: "Inside the cave, treasure awaits. The end!", choices: [] }
    };
  } else {
    nodes = {
      start: {
        text: `You enter a ${tone.toLowerCase()} ${genre.toLowerCase()} world. A fork lies ahead.`,
        choices: [
          { text: "Go left", next: "left" },
          { text: "Go right", next: "right" }
        ]
      },
      left: { text: "A mysterious figure appears. The end!", choices: [] },
      right: { text: "You find treasure. The end!", choices: [] }
    };
  }

  return { nodes };
}

function renderNode(nodeId, story) {
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
  renderQuestion();
}

renderQuestion();
