let userData = null;
let tg = null;
let clickSound = null;

// Создание звука клика
function createClickSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        return function playClick() {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        };
    } catch (e) {
        console.log('Audio not supported');
        return function() {};
    }
}

// Инициализация
function initApp() {
    console.log('🚀 Initializing app...');
    
    clickSound = createClickSound();
    tg = window.Telegram.WebApp;
    
    tg.ready();
    tg.expand();
    
    tg.onEvent('mainButtonPressed', function() {
        tg.HapticFeedback.impactOccurred('heavy');
    });
    
    setTimeout(() => {
        setupUserData();
        setupGame();
    }, 300);
}
// Данные пользователя с аватаркой
function setupUserData() {
    console.log('👤 Setting up user data...');
    
    let user = null;
    let isTelegram = false;
    
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
        user = tg.initDataUnsafe.user;
        isTelegram = true;
        console.log('✅ Telegram user found:', user);
    }
    
    if (user) {
        const firstName = user.first_name || 'User';
        const lastName = user.last_name || '';
        const initials = (firstName.charAt(0) + (lastName ? lastName.charAt(0) : '')).toUpperCase();
        
        let photoUrl = null;
        if (user.photo_url) {
            photoUrl = user.photo_url;
            console.log('✅ Photo URL found');
        }
        
        userData = {
            name: firstName + (lastName ? ' ' + lastName : ''),
            username: user.username ? '@' + user.username : '@user',
            id: user.id || 0,
            initials: initials || 'U',
            photoUrl: photoUrl,
            isTelegram: isTelegram
        };
    } else {
        userData = {
            name: 'TON Miner',
            username: '@ton_miner',
            id: Math.floor(Math.random() * 900000) + 100000,
            initials: 'TM',
            photoUrl: null,
            isTelegram: false
        };
    }
    
    updateProfileUI();
}

// Обновление профиля с аватаркой
function updateProfileUI() {
    const nameEl = document.getElementById('user-name');    const usernameEl = document.getElementById('user-username');
    const idEl = document.getElementById('user-id');
    const avatarImg = document.getElementById('user-avatar-img');
    const avatarText = document.getElementById('user-avatar-text');
    
    if (nameEl) nameEl.textContent = userData.name;
    if (usernameEl) usernameEl.textContent = userData.username;
    if (idEl) idEl.textContent = userData.id;
    
    if (avatarImg && avatarText) {
        if (userData.photoUrl && userData.isTelegram) {
            avatarImg.src = userData.photoUrl;
            avatarImg.style.display = 'block';
            avatarText.style.display = 'none';
            
            avatarImg.onload = function() {
                console.log('✅ Avatar loaded successfully');
            };
            avatarImg.onerror = function() {
                console.log('❌ Avatar failed to load, showing initials');
                avatarImg.style.display = 'none';
                avatarText.style.display = 'flex';
                avatarText.textContent = userData.initials;
            };
        } else {
            avatarImg.style.display = 'none';
            avatarText.style.display = 'flex';
            avatarText.textContent = userData.initials;
        }
    }
    
    console.log('✅ Profile updated:', userData.name);
}

// Настройка игры
function setupGame() {
    console.log('🎮 Setting up game...');
    
    loadGameData();
    setupCoinClick();
    updateUI();
    renderAchievements();
    
    setInterval(autoSave, 5000);
    setInterval(autoClick, 1000);
    setInterval(regenEnergy, 1000);
    
    console.log('✅ Game setup complete!');
}
// Переменные игры
let balance = 0;
let totalClicks = 0;
let clickPower = 1;
let autoClickPower = 0;
let multiplier = 1;
let energy = 1000;
const maxEnergy = 1000;

let upgrades = {
    click: { level: 1, cost: 100, baseCost: 100 },
    auto: { level: 0, cost: 500, baseCost: 500 },
    multiplier: { level: 0, cost: 2000, baseCost: 2000 },
    durov: { level: 0, cost: 10000, baseCost: 10000 },
    blockchain: { level: 0, cost: 50000, baseCost: 50000 },
    empire: { level: 0, cost: 250000, baseCost: 250000 }
};

const achievementsData = [
    { id: 'first_click', name: 'Первый шаг', desc: 'Сделайте первый клик', icon: '👆', unlocked: false },
    { id: 'hundred_clicks', name: 'Активный', desc: '100 кликов', icon: '💪', unlocked: false },
    { id: 'thousand_clicks', name: 'Клик-мастер', desc: '1000 кликов', icon: '🔥', unlocked: false },
    { id: 'balance_1k', name: 'Тысячник', desc: '1000 TON', icon: '💎', unlocked: false },
    { id: 'balance_10k', name: 'Богач', desc: '10,000 TON', icon: '💰', unlocked: false },
    { id: 'balance_100k', name: 'Магнат', desc: '100,000 TON', icon: '🤑', unlocked: false }
];

// Загрузка данных
function loadGameData() {
    try {
        balance = parseFloat(localStorage.getItem('tonBalance')) || 0;
        totalClicks = parseInt(localStorage.getItem('totalClicks')) || 0;
        clickPower = parseInt(localStorage.getItem('clickPower')) || 1;
        autoClickPower = parseInt(localStorage.getItem('autoClickPower')) || 0;
        multiplier = parseInt(localStorage.getItem('multiplier')) || 1;
        energy = parseInt(localStorage.getItem('energy')) || 1000;
        
        const savedUpgrades = localStorage.getItem('upgrades');
        if (savedUpgrades) {
            upgrades = JSON.parse(savedUpgrades);
        }
        
        const savedAchievements = localStorage.getItem('achievements');
        if (savedAchievements) {
            const ach = JSON.parse(savedAchievements);
            ach.forEach((a, i) => {
                if (achievementsData[i]) {
                    achievementsData[i].unlocked = a.unlocked;
                }
            });        }
        
        console.log('✅ Game data loaded');
    } catch (e) {
        console.log('⚠️ Load error:', e);
    }
}

// Клик по монете
function setupCoinClick() {
    const coin = document.getElementById('main-coin');
    if (!coin) {
        console.log('❌ Coin not found!');
        return;
    }
    
    coin.addEventListener('click', handleCoinClick);
    
    coin.addEventListener('touchstart', function(e) {
        e.preventDefault();
        const touch = e.touches[0];
        handleCoinClick({
            clientX: touch.clientX,
            clientY: touch.clientY
        });
    }, { passive: false });
    
    console.log('✅ Coin click setup');
}

// Обработка клика
function handleCoinClick(e) {
    if (energy <= 0) {
        showFloatingText(e.clientX, e.clientY, '⚡ Нет энергии!', '#ff4444');
        return;
    }
    
    const earned = clickPower * multiplier;
    balance += earned;
    totalClicks++;
    energy = Math.max(0, energy - 1);
    
    updateUI();
    saveGameData();
    
    showFloatingText(e.clientX, e.clientY, `+${earned} TON`);
    
    if (clickSound) {
        clickSound();
    }    
    if (tg && tg.HapticFeedback && userData.isTelegram) {
        tg.HapticFeedback.impactOccurred('medium');
    }
    
    const coin = document.getElementById('main-coin');
    coin.style.transform = 'scale(0.92)';
    setTimeout(() => {
        coin.style.transform = 'scale(1)';
    }, 100);
    
    createParticles(e.clientX, e.clientY);
}

// Частицы
function createParticles(x, y) {
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

// Покупка улучшения
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
        
        showModal('Улучшение куплено!', getUpgradeName(type));
        updateUI();
        saveGameData();
                if (tg && tg.HapticFeedback && userData.isTelegram) {
            tg.HapticFeedback.notificationOccurred('success');
        }
    } else {
        if (tg && tg.HapticFeedback && userData.isTelegram) {
            tg.HapticFeedback.notificationOccurred('error');
        }
        const btn = document.getElementById(`upgrade-${type}`);
        if (btn) {
            btn.classList.add('shake');
            setTimeout(() => btn.classList.remove('shake'), 500);
        }
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

// Модальное окно
function showModal(title, text) {
    document.querySelector('.modal-content h3').textContent = title;
    document.getElementById('modal-text').textContent = text;
    document.getElementById('success-modal').classList.add('show');
}

function closeModal() {
    document.getElementById('success-modal').classList.remove('show');
}

// Плавающий текст
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
function autoClick() {
    if (autoClickPower > 0) {
        const earned = autoClickPower * multiplier;
        balance += earned;
        updateUI();
        saveGameData();
    }
}

// Энергия
function regenEnergy() {
    if (energy < maxEnergy) {
        energy = Math.min(maxEnergy, energy + 10);
        updateUI();
        saveGameData();
    }
}

// Сохранение
function autoSave() {
    saveGameData();
}

function saveGameData() {
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
        console.log('Save error:', e);
    }
}

// Обновление UI
function updateUI() {
    const els = {
        balance: document.getElementById('balance'),
        balanceUsd: document.getElementById('balance-usd'),
        totalClicks: document.getElementById('total-clicks'),
        perSecond: document.getElementById('per-second'),
        clickPower: document.getElementById('click-power'),
        energyText: document.getElementById('energy-text'),
        energyFill: document.getElementById('energy-fill')
    };    
    if (els.balance) els.balance.textContent = Math.floor(balance).toLocaleString();
    if (els.balanceUsd) els.balanceUsd.textContent = (balance * 5.5).toFixed(2);
    if (els.totalClicks) els.totalClicks.textContent = totalClicks.toLocaleString();
    if (els.perSecond) els.perSecond.textContent = (autoClickPower * multiplier).toLocaleString();
    if (els.clickPower) els.clickPower.textContent = (clickPower * multiplier).toLocaleString();
    if (els.energyText) els.energyText.textContent = `${energy}/${maxEnergy}`;
    if (els.energyFill) els.energyFill.style.width = (energy / maxEnergy * 100) + '%';
    
    Object.keys(upgrades).forEach(key => {
        const costEl = document.getElementById(`cost-${key}`);
        const levelEl = document.getElementById(`level-${key}`);
        const btn = document.getElementById(`upgrade-${key}`);
        
        if (costEl) costEl.textContent = upgrades[key].cost.toLocaleString();
        if (levelEl) levelEl.textContent = upgrades[key].level;
        if (btn) {
            btn.classList.toggle('disabled', balance < upgrades[key].cost);
        }
    });
    
    checkAchievements();
}

// Достижения
function checkAchievements() {
    let changed = false;
    
    const checks = [
        () => totalClicks >= 1,
        () => totalClicks >= 100,
        () => totalClicks >= 1000,
        () => balance >= 1000,
        () => balance >= 10000,
        () => balance >= 100000
    ];
    
    achievementsData.forEach((ach, i) => {
        if (!ach.unlocked && checks[i] && checks[i]()) {
            ach.unlocked = true;
            changed = true;
            showFloatingText(window.innerWidth / 2, window.innerHeight / 2, `🏅 ${ach.name}!`, '#ffd700');
        }
    });
    
    if (changed) {
        saveGameData();
        renderAchievements();
    }
}
function renderAchievements() {
    const container = document.getElementById('achievements-list');
    if (!container) return;
    
    container.innerHTML = achievementsData.map(ach => `
        <div class="achievement-item ${ach.unlocked ? 'unlocked' : 'locked'}">
            <div class="achievement-icon">${ach.icon}</div>
            <div class="achievement-name">${ach.name}</div>
            <div class="achievement-desc">${ach.desc}</div>
        </div>
    `).join('');
}

// Настройки
function openSettings() {
    showModal('⚙️ Настройки', 'Функция в разработке!');
}

// Закрытие модального окна
document.getElementById('success-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'success-modal') {
        closeModal();
    }
});

// Запуск
initApp();

console.log('🎮 TON Clicker ready!');
