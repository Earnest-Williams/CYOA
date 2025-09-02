function setTheme(href) {
  const link = document.querySelector('link[rel="stylesheet"]');
  if (link) {
    link.setAttribute('href', href);
  }
}

function populateThemeDropdown() {
  const select = document.getElementById('theme-select');
  if (!select) return;
  const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
  links.forEach(link => {
    const href = link.getAttribute('href');
    const label = link.getAttribute('title') || href;
    const option = document.createElement('option');
    option.value = href;
    option.textContent = label;
    select.appendChild(option);
  });
  const current = document.querySelector('link[rel="stylesheet"]').getAttribute('href');
  select.value = current;
  select.addEventListener('change', () => {
    setTheme(select.value);
  });
}

window.addEventListener('load', populateThemeDropdown);
