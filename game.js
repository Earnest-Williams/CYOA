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
  app.innerHTML = `<h2>${q.text}</h2>` +
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
  renderNode(story.start, story);
}

function buildStory(prefs) {
  const genre = prefs.genre;
  const tone = prefs.tone;
  const nodes = {
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
  return { start: nodes.start, nodes };
}

function renderNode(node, story) {
  app.innerHTML = `<p>${node.text}</p>` +
    (node.choices.map(c => `<button>${c.text}</button>`).join("") || "<button>Restart</button>");

  const buttons = [...app.querySelectorAll("button")];
  if (node.choices.length === 0) {
    buttons[0].addEventListener("click", () => location.reload());
  } else {
    buttons.forEach((btn, i) =>
      btn.addEventListener("click", () =>
        renderNode(story.nodes[node.choices[i].next], story)
      )
    );
  }
}

renderQuestion();
