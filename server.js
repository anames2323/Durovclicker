const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

// Пути к файлам данных
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ADMINS_FILE = path.join(DATA_DIR, 'admins.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.json');

// Создание директории и файлов
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

// Инициализация файлов
function initFile(file, defaultData) {
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify(defaultData, null, 2));
    }
}

initFile(USERS_FILE, { users: [] });
initFile(ADMINS_FILE, { 
    admins: [
        { id: 0, name: 'Super Admin', role: 'superadmin' }
    ],
    secretKey: 'DEFAULT_SECRET_KEY_CHANGE_ME'
});
initFile(SETTINGS_FILE, {
    multiplier: 1,
    maxEnergy: 1000,
    energyRegen: 10
});
initFile(TRANSACTIONS_FILE, { transactions: [] });

// Чтение/запись файлов
function readFile(file) {
    if (!fs.existsSync(file)) {
        return {};
    }
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function writeFile(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Генерация токена
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Проверка авторизации админа
function verifyAdmin(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ success: false, message: 'Нет токена' });
    }
    
    const adminsData = readFile(ADMINS_FILE);
    const admin = adminsData.admins.find(a => a.token === token);
    
    if (!admin) {
        return res.status(401).json({ success: false, message: 'Неверный токен' });
    }
    
    req.admin = admin;
    next();
}

// Логирование транзакций
function logTransaction(adminId, userId, amount, action, type) {
    const transactions = readFile(TRANSACTIONS_FILE);
    transactions.transactions.push({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        adminId,
        userId,
        amount,
        action,
        type
    });
    writeFile(TRANSACTIONS_FILE, transactions);
}

// ========== ИГРОВЫЕ API ==========

app.post('/api/save', (req, res) => {
    const { userId, data } = req.body;
    const usersData = readFile(USERS_FILE);
    
    let user = usersData.users.find(u => u.id === userId);    if (user) {
        Object.assign(user, data, { lastOnline: Date.now() });
    } else {
        usersData.users.push({
            id: userId,
            balance: 0,
            totalClicks: 0,
            clickPower: 1,
            autoClickPower: 0,
            energy: 1000,
            banned: false,
            lastOnline: Date.now(),
            ...data
        });
    }
    
    writeFile(USERS_FILE, usersData);
    res.json({ success: true });
});

app.get('/api/user/:userId', (req, res) => {
    const usersData = readFile(USERS_FILE);
    const user = usersData.users.find(u => u.id === parseInt(req.params.userId));
    
    if (user) {
        if (user.banned) {
            return res.json({ success: false, message: 'Вы забанены!', banned: true });
        }
        res.json({ success: true, user });
    } else {
        res.json({ success: true, user: null });
    }
});

// ========== ЛИДЕРБОРД API ==========

app.get('/api/leaderboard/:type', (req, res) => {
    const type = req.params.type;
    const limit = parseInt(req.query.limit) || 50;
    
    const usersData = readFile(USERS_FILE);
    
    let sortedUsers = usersData.users.sort((a, b) => {
        if (type === 'balance') {
            return (b.balance || 0) - (a.balance || 0);
        } else if (type === 'clicks') {
            return (b.totalClicks || 0) - (a.totalClicks || 0);
        }
        return 0;
    });    
    const topPlayers = sortedUsers.slice(0, limit).map((user, index) => ({
        rank: index + 1,
        id: user.id,
        name: user.name || `User${user.id}`,
        score: type === 'balance' ? (user.balance || 0) : (user.totalClicks || 0),
        isBot: user.id < 100000
    })).filter(p => !p.isBot);
    
    res.json({
        success: true,
        type: type,
        leaderboard: topPlayers,
        totalPlayers: sortedUsers.filter(u => u.id >= 100000).length
    });
});

app.get('/api/leaderboard/rank/:userId', (req, res) => {
    const userId = parseInt(req.params.userId);
    const usersData = readFile(USERS_FILE);
    
    const sortedByBalance = usersData.users.sort((a, b) => 
        (b.balance || 0) - (a.balance || 0)
    );
    
    const sortedByClicks = usersData.users.sort((a, b) => 
        (b.totalClicks || 0) - (a.totalClicks || 0)
    );
    
    const userBalance = usersData.users.find(u => u.id === userId);
    
    const rankBalance = sortedByBalance.findIndex(u => u.id === userId) + 1;
    const rankClicks = sortedByClicks.findIndex(u => u.id === userId) + 1;
    
    res.json({
        success: true,
        userId: userId,
        rankBalance: rankBalance || 0,
        rankClicks: rankClicks || 0,
        balance: userBalance ? userBalance.balance : 0,
        totalClicks: userBalance ? userBalance.totalClicks : 0
    });
});

// ========== АДМИН API ==========

app.post('/api/admin/login', (req, res) => {
    const { adminId, adminKey } = req.body;
    const adminsData = readFile(ADMINS_FILE);
    const settingsData = readFile(SETTINGS_FILE);    
    const admin = adminsData.admins.find(a => a.id === parseInt(adminId));
    
    if (!admin) {
        return res.json({ success: false, message: 'Админ не найден!' });
    }
    
    if (adminKey !== settingsData.secretKey) {
        return res.json({ success: false, message: 'Неверный ключ!' });
    }
    
    const token = generateToken();
    admin.token = token;
    writeFile(ADMINS_FILE, adminsData);
    
    res.json({
        success: true,
        admin: { id: admin.id, name: admin.name, role: admin.role, token }
    });
});

app.get('/api/admin/dashboard', verifyAdmin, (req, res) => {
    const usersData = readFile(USERS_FILE);
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    
    const totalUsers = usersData.users.length;
    const onlineUsers = usersData.users.filter(u => u.lastOnline > dayAgo).length;
    const totalTON = usersData.users.reduce((sum, u) => sum + (u.balance || 0), 0);
    const bannedUsers = usersData.users.filter(u => u.banned).length;
    
    res.json({ totalUsers, onlineUsers, totalTON, bannedUsers });
});

app.get('/api/admin/users', verifyAdmin, (req, res) => {
    const usersData = readFile(USERS_FILE);
    res.json({ users: usersData.users });
});

app.get('/api/admin/user/:userId', verifyAdmin, (req, res) => {
    const usersData = readFile(USERS_FILE);
    const user = usersData.users.find(u => u.id === parseInt(req.params.userId));
    
    if (user) {
        res.json(user);
    } else {
        res.status(404).json({ message: 'Пользователь не найден' });
    }
});
app.post('/api/admin/user/:userId/ban', verifyAdmin, (req, res) => {
    const { banned } = req.body;
    const usersData = readFile(USERS_FILE);
    const user = usersData.users.find(u => u.id === parseInt(req.params.userId));
    
    if (user) {
        user.banned = banned;
        writeFile(USERS_FILE, usersData);
        logTransaction(req.admin.id, parseInt(req.params.userId), 0, banned ? 'ban' : 'unban', 'moderation');
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }
});

app.post('/api/admin/user/:userId/balance', verifyAdmin, (req, res) => {
    const { amount, action } = req.body;
    const usersData = readFile(USERS_FILE);
    const user = usersData.users.find(u => u.id === parseInt(req.params.userId));
    
    const oldBalance = user ? (user.balance || 0) : 0;
    
    if (!user) {
        usersData.users.push({
            id: parseInt(req.params.userId),
            name: `User${req.params.userId}`,
            balance: amount || 0,
            totalClicks: 0,
            clickPower: 1,
            autoClickPower: 0,
            energy: 1000,
            banned: false,
            lastOnline: Date.now()
        });
        writeFile(USERS_FILE, usersData);
        
        logTransaction(req.admin.id, parseInt(req.params.userId), amount, action, 'balance');
        
        return res.json({ success: true, message: 'Пользователь создан' });
    }
    
    if (action === 'set') {
        user.balance = amount || 0;
    } else {
        user.balance = (user.balance || 0) + (amount || 0);
    }
    
    writeFile(USERS_FILE, usersData);
    logTransaction(req.admin.id, parseInt(req.params.userId), amount, action, 'balance');
        res.json({
        success: true,
        message: action === 'set' ? `Баланс установлен: ${amount} TON` : `Добавлено: ${amount} TON`,
        oldBalance,
        newBalance: user.balance
    });
});

app.get('/api/admin/list', verifyAdmin, (req, res) => {
    const adminsData = readFile(ADMINS_FILE);
    const admins = adminsData.admins.map(a => ({
        id: a.id,
        name: a.name,
        role: a.role
    }));
    res.json({ admins });
});

app.post('/api/admin/add', verifyAdmin, (req, res) => {
    const { id, name, role } = req.body;
    
    if (req.admin.role !== 'superadmin') {
        return res.json({ success: false, message: 'Недостаточно прав!' });
    }
    
    const adminsData = readFile(ADMINS_FILE);
    
    if (adminsData.admins.find(a => a.id === parseInt(id))) {
        return res.json({ success: false, message: 'Админ уже существует!' });
    }
    
    adminsData.admins.push({ id: parseInt(id), name, role });
    writeFile(ADMINS_FILE, adminsData);
    
    res.json({ success: true });
});

app.delete('/api/admin/remove/:adminId', verifyAdmin, (req, res) => {
    if (req.admin.role !== 'superadmin') {
        return res.json({ success: false, message: 'Недостаточно прав!' });
    }
    
    const adminsData = readFile(ADMINS_FILE);
    const index = adminsData.admins.findIndex(a => a.id === parseInt(req.params.adminId));
    
    if (index > -1) {
        adminsData.admins.splice(index, 1);
        writeFile(ADMINS_FILE, adminsData);
        res.json({ success: true });
    } else {        res.status(404).json({ success: false, message: 'Админ не найден' });
    }
});

app.get('/api/admin/settings', verifyAdmin, (req, res) => {
    const settings = readFile(SETTINGS_FILE);
    res.json(settings);
});

app.post('/api/admin/settings', verifyAdmin, (req, res) => {
    const settings = readFile(SETTINGS_FILE);
    Object.assign(settings, req.body);
    writeFile(SETTINGS_FILE, settings);
    res.json({ success: true });
});

app.post('/api/admin/secret-key', verifyAdmin, (req, res) => {
    if (req.admin.role !== 'superadmin') {
        return res.json({ success: false, message: 'Недостаточно прав!' });
    }
    
    const { newKey } = req.body;
    const adminsData = readFile(ADMINS_FILE);
    adminsData.secretKey = newKey;
    writeFile(ADMINS_FILE, adminsData);
    
    res.json({ success: true });
});

app.get('/api/admin/transactions', verifyAdmin, (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    const transactions = readFile(TRANSACTIONS_FILE);
    
    const recentTransactions = transactions.transactions
        .sort((a, b) => b.id - a.id)
        .slice(0, limit);
    
    res.json({
        success: true,
        transactions: recentTransactions
    });
});

app.get('/api/admin/export', verifyAdmin, (req, res) => {
    const data = {
        users: readFile(USERS_FILE),
        admins: readFile(ADMINS_FILE),
        settings: readFile(SETTINGS_FILE),
        transactions: readFile(TRANSACTIONS_FILE),
        exportedAt: new Date().toISOString()    };
    res.json(data);
});

app.post('/api/admin/reset-all', verifyAdmin, (req, res) => {
    if (req.admin.role !== 'superadmin') {
        return res.json({ success: false, message: 'Недостаточно прав!' });
    }
    
    writeFile(USERS_FILE, { users: [] });
    writeFile(TRANSACTIONS_FILE, { transactions: [] });
    res.json({ success: true });
});

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Админ панель
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 TON Clicker Server running on port ${PORT}`);
    console.log(`📊 Admin Panel: http://localhost:${PORT}/admin`);
    console.log(`🔐 Default Login: ID=0, Key=DEFAULT_SECRET_KEY_CHANGE_ME`);
});
