function populateThemeDropdown() {
  const select = document.getElementById('theme-select');
  if (!select) return;

  const themes = [
    { value: '', label: 'Default' },
    { value: 'theme-moss', label: 'Moss' },
    { value: 'theme-autumn', label: 'Autumn' }
  ];

  const themeClasses = ['theme-moss', 'theme-autumn'];

  function applyTheme(theme) {
    themeClasses.forEach((cls) => document.body.classList.remove(cls));
    if (theme) document.body.classList.add(theme);
  }

  themes.forEach(({ value, label }) => {
    const option = document.createElement('option');
    option.value = value;
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

window.addEventListener('DOMContentLoaded', populateThemeDropdown);

