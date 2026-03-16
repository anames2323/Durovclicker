const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

const API_URL = window.location.origin;

// Получение данных пользователя
function getUserData() {
    const user = tg.initDataUnsafe?.user || {};
    
    // Генерируем аватар с инициалами
    const firstName = user.first_name || 'U';
    const lastName = user.last_name || '';
    const initials = firstName.charAt(0).toUpperCase() + (lastName ? lastName.charAt(0).toUpperCase() : '');
    
    return {
        name: user.first_name ? user.first_name + (user.last_name ? ' ' + user.last_name : '') : 'TON Miner',
        username: user.username ? '@' + user.username : '@ton_miner',
        id: user.id || Math.floor(Math.random() * 900000) + 100000,
        initials: initials
    };
}

const userData = getUserData();

// Обновление профиля
document.getElementById('user-name').textContent = userData.name;
document.getElementById('user-username').textContent = userData.username;
document.getElementById('user-id').textContent = userData.id;
document.getElementById('user-avatar').textContent = userData.initials;

// Игровые переменные
let balance = parseFloat(localStorage.getItem('tonBalance')) || 0;
let totalClicks = parseInt(localStorage.getItem('totalClicks')) || 0;
let clickPower = parseInt(localStorage.getItem('clickPower')) || 1;
let autoClickPower = parseInt(localStorage.getItem('autoClickPower')) || 0;
let multiplier = parseInt(localStorage.getItem('multiplier')) || 1;
let energy = parseInt(localStorage.getItem('energy')) || 1000;
const maxEnergy = 1000;

let upgrades = JSON.parse(localStorage.getItem('upgrades')) || {
    click: { level: 1, cost: 100, baseCost: 100 },
    auto: { level: 0, cost: 500, baseCost: 500 },
    multiplier: { level: 0, cost: 2000, baseCost: 2000 },
    durov: { level: 0, cost: 10000, baseCost: 10000 },
    blockchain: { level: 0, cost: 50000, baseCost: 50000 },
    empire: { level: 0, cost: 250000, baseCost: 250000 }
};

const achievementsData = [    { id: 'first_click', name: 'Первый шаг', desc: 'Сделайте первый клик', icon: '👆', unlocked: false, check: () => totalClicks >= 1 },
    { id: 'hundred_clicks', name: 'Активный', desc: '100 кликов', icon: '💪', unlocked: false, check: () => totalClicks >= 100 },
    { id: 'thousand_clicks', name: 'Клик-мастер', desc: '1000 кликов', icon: '🔥', unlocked: false, check: () => totalClicks >= 1000 },
    { id: 'balance_1k', name: 'Тысячник', desc: '1000 TON', icon: '💎', unlocked: false, check: () => balance >= 1000 },
    { id: 'balance_10k', name: 'Богач', desc: '10,000 TON', icon: '💰', unlocked: false, check: () => balance >= 10000 },
    { id: 'balance_100k', name: 'Магнат', desc: '100,000 TON', icon: '🤑', unlocked: false, check: () => balance >= 100000 },
    { id: 'auto_10', name: 'Автоматизация', desc: '10 авто-кликов', icon: '🤖', unlocked: false, check: () => upgrades.auto.level >= 10 },
    { id: 'durov_fan', name: 'Фанат Дурова', desc: 'Купите совет Дурова', icon: '👨‍', unlocked: false, check: () => upgrades.durov.level >= 1 }
];

let savedAchievements = JSON.parse(localStorage.getItem('achievements'));
if (savedAchievements && Array.isArray(savedAchievements)) {
    savedAchievements.forEach((saved, i) => {
        if (achievementsData[i]) {
            achievementsData[i].unlocked = saved.unlocked || false;
        }
    });
}

const TON_TO_USD = 5.5;

function isInTelegram() {
    return tg.initDataUnsafe && tg.initDataUnsafe.user;
}

// Сохранение на сервер
async function saveToServer() {
    try {
        await fetch(`${API_URL}/api/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: userData.id,
                 {
                    name: userData.name,
                    username: userData.username,
                    balance,
                    totalClicks,
                    clickPower,
                    autoClickPower,
                    energy,
                    upgrades
                }
            })
        });
    } catch (e) {
        console.log('Server save error:', e);
    }
}
// Загрузка с сервера
async function loadFromServer() {
    try {
        const response = await fetch(`${API_URL}/api/user/${userData.id}`);
        const data = await response.json();
        
        if (data.success && data.user) {
            if (data.banned) {
                alert('Вы забанены! Обратитесь к администратору.');
                return;
            }
            balance = data.user.balance || 0;
            totalClicks = data.user.totalClicks || 0;
            clickPower = data.user.clickPower || 1;
            autoClickPower = data.user.autoClickPower || 0;
            energy = data.user.energy || 1000;
            if (data.user.upgrades) {
                upgrades = data.user.upgrades;
            }
        }
    } catch (e) {
        console.log('Server load error:', e);
    }
}

// Основной клик
const mainCoin = document.getElementById('main-coin');
mainCoin.addEventListener('click', (e) => {
    if (energy <= 0) {
        showFloatingText(e.clientX, e.clientY, '⚡ Нет энергии!', '#ff4444');
        return;
    }
    
    const earned = clickPower * multiplier;
    balance += earned;
    totalClicks++;
    energy = Math.max(0, energy - 1);
    
    updateUI();
    saveData();
    saveToServer();
    
    showFloatingText(e.clientX, e.clientY, `+${earned} TON`);
    
    if (tg.HapticFeedback && isInTelegram()) {
        tg.HapticFeedback.impactOccurred('medium');
    }
    
    mainCoin.style.transform = 'scale(0.92) rotate(-5deg)';
    setTimeout(() => {        mainCoin.style.transform = 'scale(1) rotate(0deg)';
    }, 100);
    
    createClickParticles(e.clientX, e.clientY);
});

// Создание частиц
function createClickParticles(x, y) {
    for (let i = 0; i < 5; i++) {
        const particle = document.createElement('div');
        particle.className = 'click-particle';
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.setProperty('--angle', (Math.random() * 360) + 'deg');
        particle.style.setProperty('--distance', (50 + Math.random() * 100) + 'px');
        document.body.appendChild(particle);
        setTimeout(() => particle.remove(), 800);
    }
}

// Покупка улучшений
function buyUpgrade(type) {
    const upgrade = upgrades[type];
    
    if (balance >= upgrade.cost) {
        balance -= upgrade.cost;
        upgrade.level++;
        upgrade.cost = Math.floor(upgrade.baseCost * Math.pow(1.5, upgrade.level));
        
        switch(type) {
            case 'click': clickPower++; break;
            case 'auto': autoClickPower++; break;
            case 'multiplier': multiplier *= 2; break;
            case 'durov': autoClickPower += 10; break;
            case 'blockchain': autoClickPower += 50; break;
            case 'empire': autoClickPower += 200; break;
        }
        
        showModal('Улучшение куплено!', `Вы приобрели: ${getUpgradeName(type)}`);
        updateUI();
        saveData();
        saveToServer();
        
        if (tg.HapticFeedback && isInTelegram()) {
            tg.HapticFeedback.notificationOccurred('success');
        }
    } else {
        if (tg.HapticFeedback && isInTelegram()) {
            tg.HapticFeedback.notificationOccurred('error');
        }        const btn = document.getElementById(`upgrade-${type}`);
        btn.classList.add('shake');
        setTimeout(() => btn.classList.remove('shake'), 500);
    }
}

function getUpgradeName(type) {
    const names = {
        click: 'Сила клика',
        auto: 'Авто-кликер',
        multiplier: 'Множитель x2',
        durov: 'Совет Дурова',
        blockchain: 'Блокчейн',
        empire: 'Империя Telegram'
    };
    return names[type];
}

function showModal(title, text) {
    document.querySelector('.modal-content h3').textContent = title;
    document.getElementById('modal-text').textContent = text;
    document.getElementById('success-modal').classList.add('show');
}

function closeModal() {
    document.getElementById('success-modal').classList.remove('show');
}

function showFloatingText(x, y, text, color = null) {
    const el = document.createElement('div');
    el.className = 'floating-text';
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    if (color) el.style.color = color;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1200);
}

// Авто-клик
setInterval(() => {
    if (autoClickPower > 0) {
        const earned = autoClickPower * multiplier;
        balance += earned;
        updateUI();
        saveData();
        saveToServer();
    }
}, 1000);
// Восстановление энергии
setInterval(() => {
    if (energy < maxEnergy) {
        energy = Math.min(maxEnergy, energy + 10);
        updateUI();
        saveData();
    }
}, 1000);

// Проверка достижений
function checkAchievements() {
    let changed = false;
    achievementsData.forEach(ach => {
        if (!ach.unlocked && ach.check()) {
            ach.unlocked = true;
            changed = true;
            showFloatingText(window.innerWidth / 2, window.innerHeight / 2, `🏅 ${ach.name}!`, '#ffd700');
            if (tg.HapticFeedback && isInTelegram()) {
                tg.HapticFeedback.notificationOccurred('success');
            }
        }
    });
    if (changed) {
        saveData();
        renderAchievements();
    }
}

function renderAchievements() {
    const container = document.getElementById('achievements-list');
    container.innerHTML = achievementsData.map(ach => `
        <div class="achievement-item ${ach.unlocked ? 'unlocked' : 'locked'}">
            <div class="achievement-icon">${ach.icon}</div>
            <div class="achievement-name">${ach.name}</div>
            <div class="achievement-desc">${ach.desc}</div>
        </div>
    `).join('');
}

function updateUI() {
    document.getElementById('balance').textContent = Math.floor(balance).toLocaleString();
    document.getElementById('balance-usd').textContent = (balance * TON_TO_USD).toFixed(2);
    document.getElementById('total-clicks').textContent = totalClicks.toLocaleString();
    document.getElementById('per-second').textContent = (autoClickPower * multiplier).toLocaleString();
    document.getElementById('click-power').textContent = (clickPower * multiplier).toLocaleString();
    
    Object.keys(upgrades).forEach(key => {
        document.getElementById(`cost-${key}`).textContent = upgrades[key].cost.toLocaleString();
        document.getElementById(`level-${key}`).textContent = upgrades[key].level;
                const btn = document.getElementById(`upgrade-${key}`);
        if (btn) {
            if (balance < upgrades[key].cost) {
                btn.classList.add('disabled');
            } else {
                btn.classList.remove('disabled');
            }
        }
    });
    
    document.getElementById('energy-text').textContent = `${energy}/${maxEnergy}`;
    document.getElementById('energy-fill').style.width = (energy / maxEnergy * 100) + '%';
    
    checkAchievements();
}

function saveData() {
    try {
        localStorage.setItem('tonBalance', balance);
        localStorage.setItem('totalClicks', totalClicks);
        localStorage.setItem('clickPower', clickPower);
        localStorage.setItem('autoClickPower', autoClickPower);
        localStorage.setItem('multiplier', multiplier);
        localStorage.setItem('energy', energy);
        localStorage.setItem('upgrades', JSON.stringify(upgrades));
        localStorage.setItem('achievements', JSON.stringify(achievementsData));
    } catch (e) {
        console.log('LocalStorage error:', e);
    }
}

document.getElementById('success-modal').addEventListener('click', (e) => {
    if (e.target.id === 'success-modal') {
        closeModal();
    }
});

function openSettings() {
    if (tg.HapticFeedback && isInTelegram()) {
        tg.HapticFeedback.impactOccurred('light');
    }
    showModal('⚙️ Настройки', 'Функция в разработке! Следите за обновлениями.');
}

// Инициализация
loadFromServer().then(() => {
    renderAchievements();
    updateUI();
});
if (isInTelegram()) {
    tg.MainButton.setText('🚀 ИГРАТЬ');
    tg.MainButton.show();
    tg.MainButton.onClick(() => {
        tg.HapticFeedback.impactOccurred('heavy');
    });
}

window.addEventListener('error', (e) => {
    console.log('App error:', e.message);
});

console.log('🎮 TON Clicker loaded successfully!');
console.log('User:', userData.name);
console.log('In Telegram:', isInTelegram());
