function populateThemeDropdown() {
  const select = document.getElementById('theme-select');
  if (!select) return;

  const themes = [
    { value: '', label: 'Default' },
    { value: 'theme-moss', label: 'Moss' },
    { value: 'theme-autumn', label: 'Autumn' }
  ];

  themes.forEach(({ value, label }) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  });

  const savedTheme = localStorage.getItem('theme') || '';
  document.body.className = savedTheme;
  select.value = savedTheme;

  select.addEventListener('change', (e) => {
    const theme = e.target.value;
    document.body.className = theme;
    localStorage.setItem('theme', theme);
  });
}

window.addEventListener('DOMContentLoaded', populateThemeDropdown);

