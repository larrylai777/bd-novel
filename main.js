// ===== 主題切換 =====
function toggleTheme() {
    document.body.classList.toggle('light');
    localStorage.setItem('theme', document.body.classList.contains('light') ? 'light' : 'dark');
}

// ===== 漢堡選單 =====
function toggleMenu() {
    const menu = document.getElementById('navMenu');
    if (menu) menu.classList.toggle('open');
}

// ===== 初始化 =====
window.addEventListener('DOMContentLoaded', () => {
    // 載入主題偏好
    if (localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light');
    }

    // 點擊選單外部關閉
    document.addEventListener('click', (e) => {
        const nav = document.getElementById('nav');
        const menu = document.getElementById('navMenu');
        if (nav && menu && !nav.contains(e.target)) {
            menu.classList.remove('open');
        }
    });
});
