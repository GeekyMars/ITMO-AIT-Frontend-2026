const THEME_STORAGE_KEY = 'nova_theme';

// Определение активной темы
function getPreferredTheme() {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme) {
        return storedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

// Применение темы к корневому элементу
function setTheme(theme, save = true) {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-bs-theme', theme);

    if (save) {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    }

    updateThemeToggleUI(theme);
}

// Обновление иконки и текстовой метки кнопки
function updateThemeToggleUI(theme) {
    const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
    const isLight = theme === 'light';

    toggleBtns.forEach(btn => {
        const icon = btn.querySelector('i');
        if (icon) {
            icon.className = isLight ? 'bi bi-sun-fill text-warning' : 'bi bi-moon-stars-fill text-main';
        }
        const label = isLight ? 'Включить тёмную тему' : 'Включить светлую тему';
        btn.setAttribute('aria-label', label);
        btn.setAttribute('title', label);
    });
}

// Немедленное применение темы при парсинге тега script
const initialTheme = getPreferredTheme();
setTheme(initialTheme, false);

// Слушатель системной смены темы в ОС в реальном времени
window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
    // Реагируем только если пользователь не переопределил тему вручную
    if (!localStorage.getItem(THEME_STORAGE_KEY)) {
        setTheme(e.matches ? 'light' : 'dark', false);
    }
});

// Инициализация обработчиков после построения DOM
document.addEventListener('DOMContentLoaded', () => {
    const activeTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    updateThemeToggleUI(activeTheme);

    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
            setTheme(nextTheme, true);
        });
    });
});