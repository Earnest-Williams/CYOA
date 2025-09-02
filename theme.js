function getThemesFromStyleSheets() {
  const themes = new Set();

  function extract(rules) {
    if (!rules) return;
    for (const rule of Array.from(rules)) {
      if (rule.selectorText) {
        const matches = rule.selectorText.match(/body\.theme-[\w-]+/g);
        if (matches) {
          matches.forEach((m) => themes.add(m.replace('body.', '')));
        }
      }
      if (rule.cssRules) {
        extract(rule.cssRules);
      }
    }
  }

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      extract(sheet.cssRules);
    } catch (e) {
      // Ignore cross-origin stylesheets
    }
  }

  return Array.from(themes);
}

function populateThemeDropdown() {
  const select = document.getElementById('theme-select');
  if (!select) return;

  const themeClasses = getThemesFromStyleSheets();

  function applyTheme(theme) {
    themeClasses.forEach((cls) => document.body.classList.remove(cls));
    if (theme) document.body.classList.add(theme);
  }

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Default';
  select.appendChild(defaultOption);

  themeClasses.forEach((cls) => {
    const option = document.createElement('option');
    option.value = cls;
    const label = cls
      .replace(/^theme-/, '')
      .split('-')
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
    option.textContent = label;
    select.appendChild(option);
  });

  const savedTheme = localStorage.getItem('theme') || '';
  applyTheme(savedTheme);
  select.value = savedTheme;

  select.addEventListener('change', (e) => {
    const theme = e.target.value;
    applyTheme(theme);
    localStorage.setItem('theme', theme);
  });
}

if (document.readyState === 'complete') {
  populateThemeDropdown();
} else {
  window.addEventListener('load', populateThemeDropdown);
}

