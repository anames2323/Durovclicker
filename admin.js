const API_URL = window.location.origin;
let currentAdmin = null;
let selectedUserId = null;

// Проверка авторизации
function checkAuth() {
    const admin = localStorage.getItem('adminAuth');
    if (admin) {
        currentAdmin = JSON.parse(admin);
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'flex';
        loadDashboard();
    }
}

// Вход админа
async function adminLogin() {
    const adminId = document.getElementById('admin-id').value;
    const adminKey = document.getElementById('admin-key').value;
    const errorEl = document.getElementById('login-error');
    
    if (!adminId || !adminKey) {
        showNotification('⚠️ Заполните все поля!', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminId, adminKey })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentAdmin = data.admin;
            localStorage.setItem('adminAuth', JSON.stringify(data.admin));
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('admin-panel').style.display = 'flex';
            showNotification('✅ Успешный вход!', 'success');
            loadDashboard();
        } else {
            showNotification('❌ ' + data.message, 'error');
        }
    } catch (error) {
        showNotification('❌ Ошибка соединения!', 'error');
    }
}
// Выход
function adminLogout() {
    localStorage.removeItem('adminAuth');
    currentAdmin = null;
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('admin-panel').style.display = 'none';
    showNotification('👋 Вы вышли из системы', 'success');
}

// Переключение секций
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(sectionId).classList.add('active');
    event.target.classList.add('active');
    
    if (sectionId === 'dashboard') loadDashboard();
    if (sectionId === 'users') loadUsers();
    if (sectionId === 'admins') loadAdmins();
    if (sectionId === 'transactions') loadTransactions();
    if (sectionId === 'settings') loadSettings();
}

// Уведомления
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Загрузка дашборда
async function loadDashboard() {
    try {
        const response = await fetch(`${API_URL}/api/admin/dashboard`, {
            headers: { 'Authorization': `Bearer ${currentAdmin.token}` }
        });
        const data = await response.json();
        
        document.getElementById('total-users').textContent = data.totalUsers || 0;
        document.getElementById('online-users').textContent = data.onlineUsers || 0;
        document.getElementById('total-ton').textContent = (data.totalTON || 0).toLocaleString();
        document.getElementById('banned-users').textContent = data.bannedUsers || 0;
    } catch (error) {
        console.log('Dashboard load error:', error);    }
}

// Быстрая выдача TON
async function quickGiveTON() {
    const userId = document.getElementById('give-user-id').value;
    const amount = document.getElementById('give-ton-amount').value;
    
    if (!userId || !amount) {
        showNotification('⚠️ Заполните все поля!', 'error');
        return;
    }
    
    if (isNaN(userId) || isNaN(amount) || parseInt(amount) <= 0) {
        showNotification('⚠️ Неверные данные!', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/admin/user/${userId}/balance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentAdmin.token}`
            },
            body: JSON.stringify({
                amount: parseInt(amount),
                action: 'add'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`✅ Выдано ${amount} TON игроку ${userId}!`, 'success');
            document.getElementById('give-user-id').value = '';
            document.getElementById('give-ton-amount').value = '';
            loadUsers();
            loadDashboard();
        } else {
            showNotification('❌ Ошибка: ' + data.message, 'error');
        }
    } catch (error) {
        showNotification('❌ Ошибка соединения!', 'error');
    }
}

// Загрузка пользователей
async function loadUsers() {
    try {        const response = await fetch(`${API_URL}/api/admin/users`, {
            headers: { 'Authorization': `Bearer ${currentAdmin.token}` }
        });
        const data = await response.json();
        
        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = data.users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${user.name || 'Unknown'}</td>
                <td>${(user.balance || 0).toLocaleString()}</td>
                <td>${(user.totalClicks || 0).toLocaleString()}</td>
                <td>
                    <span class="status-badge ${user.banned ? 'status-banned' : 'status-active'}">
                        ${user.banned ? 'Забанен' : 'Активен'}
                    </span>
                </td>
                <td>
                    <button class="action-btn-small" onclick="openUserModal(${user.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn-small gift" onclick="quickGiveToUser(${user.id})">
                        <i class="fas fa-gift"></i>
                    </button>
                    <button class="action-btn-small danger" onclick="banUserById(${user.id})">
                        <i class="fas fa-ban"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.log('Users load error:', error);
    }
}

// Быстрая выдача конкретному пользователю
function quickGiveToUser(userId) {
    document.getElementById('give-user-id').value = userId;
    document.getElementById('give-ton-amount').focus();
    showNotification('👉 Введите сумму и нажмите "Выдать"', 'success');
}

// Поиск пользователей
function searchUsers() {
    const query = document.getElementById('user-search').value.toLowerCase();
    const rows = document.querySelectorAll('#users-table-body tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';    });
}

// Фильтр пользователей
function filterUsers() {
    const filter = document.getElementById('user-filter').value;
    const rows = document.querySelectorAll('#users-table-body tr');
    
    rows.forEach(row => {
        const isBanned = row.querySelector('.status-banned');
        if (filter === 'all') {
            row.style.display = '';
        } else if (filter === 'banned' && isBanned) {
            row.style.display = '';
        } else if (filter === 'active' && !isBanned) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Открытие модального окна пользователя
async function openUserModal(userId) {
    selectedUserId = userId;
    try {
        const response = await fetch(`${API_URL}/api/admin/user/${userId}`, {
            headers: { 'Authorization': `Bearer ${currentAdmin.token}` }
        });
        const user = await response.json();
        
        document.getElementById('modal-user-name').textContent = user.name || 'Unknown';
        document.getElementById('modal-user-id').textContent = user.id;
        document.getElementById('modal-user-balance').textContent = (user.balance || 0).toLocaleString();
        document.getElementById('modal-user-clicks').textContent = (user.totalClicks || 0).toLocaleString();
        document.getElementById('modal-user-status').textContent = user.banned ? 'Забанен' : 'Активен';
        
        window.currentUserBalance = user.balance || 0;
        
        document.getElementById('user-modal').classList.add('show');
    } catch (error) {
        console.log('User modal error:', error);
        showNotification('❌ Ошибка загрузки пользователя!', 'error');
    }
}

function closeUserModal() {
    document.getElementById('user-modal').classList.remove('show');
    selectedUserId = null;
}
// Бан пользователя
async function banUser() {
    if (!selectedUserId) return;
    await updateUserStatus(selectedUserId, true);
}

async function banUserById(userId) {
    if (!confirm('Вы уверены что хотите забанить этого пользователя?')) return;
    await updateUserStatus(userId, true);
}

// Разбан пользователя
async function unbanUser() {
    if (!selectedUserId) return;
    await updateUserStatus(selectedUserId, false);
}

async function updateUserStatus(userId, banned) {
    try {
        const response = await fetch(`${API_URL}/api/admin/user/${userId}/ban`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentAdmin.token}`
            },
            body: JSON.stringify({ banned })
        });
        
        const data = await response.json();
        if (data.success) {
            showNotification(`Пользователь ${banned ? 'забанен' : 'разбанен'}!`, 'success');
            closeUserModal();
            loadUsers();
            loadDashboard();
        } else {
            showNotification('Ошибка: ' + data.message, 'error');
        }
    } catch (error) {
        showNotification('Ошибка соединения!', 'error');
    }
}

// Сброс баланса
async function resetUserBalance() {
    if (!selectedUserId) return;
    if (!confirm('Вы уверены? Баланс будет сброшен до 0!')) return;
    
    try {
        const response = await fetch(`${API_URL}/api/admin/user/${selectedUserId}/balance`, {            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentAdmin.token}`
            },
            body: JSON.stringify({ amount: 0, action: 'set' })
        });
        
        const data = await response.json();
        if (data.success) {
            showNotification('Баланс сброшен!', 'success');
            closeUserModal();
            loadUsers();
            loadDashboard();
        } else {
            showNotification('Ошибка: ' + data.message, 'error');
        }
    } catch (error) {
        showNotification('Ошибка соединения!', 'error');
    }
}

// Добавление баланса
async function addBalanceUser() {
    if (!selectedUserId) return;
    
    const amount = prompt('Введите количество TON для добавления:');
    if (!amount || isNaN(amount) || parseInt(amount) <= 0) {
        showNotification('⚠️ Неверное количество!', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/admin/user/${selectedUserId}/balance`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentAdmin.token}`
            },
            body: JSON.stringify({ amount: parseInt(amount), action: 'add' })
        });
        
        const data = await response.json();
        if (data.success) {
            showNotification(`✅ Добавлено ${amount} TON!`, 'success');
            closeUserModal();
            loadUsers();
            loadDashboard();
        } else {
            showNotification('Ошибка: ' + data.message, 'error');        }
    } catch (error) {
        showNotification('Ошибка соединения!', 'error');
    }
}

// Загрузка админов
async function loadAdmins() {
    try {
        const response = await fetch(`${API_URL}/api/admin/list`, {
            headers: { 'Authorization': `Bearer ${currentAdmin.token}` }
        });
        const data = await response.json();
        
        const list = document.getElementById('admins-list');
        list.innerHTML = data.admins.map(admin => `
            <div class="admin-card">
                <div class="admin-info">
                    <div class="admin-avatar">${admin.name.charAt(0).toUpperCase()}</div>
                    <div class="admin-details">
                        <h4>${admin.name}</h4>
                        <p>ID: ${admin.id}</p>
                    </div>
                </div>
                <div>
                    <span class="admin-role role-${admin.role}">${admin.role}</span>
                    ${currentAdmin.role === 'superadmin' && admin.id !== currentAdmin.id ? 
                        `<button class="action-btn-small danger" onclick="removeAdmin(${admin.id})">
                            <i class="fas fa-trash"></i>
                        </button>` : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.log('Admins load error:', error);
    }
}

// Добавление админа
async function addAdmin() {
    const id = document.getElementById('new-admin-id').value;
    const name = document.getElementById('new-admin-name').value;
    const role = document.getElementById('new-admin-role').value;
    
    if (!id || !name) {
        showNotification('⚠️ Заполните все поля!', 'error');
        return;
    }
    
    try {        const response = await fetch(`${API_URL}/api/admin/add`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentAdmin.token}`
            },
            body: JSON.stringify({ id, name, role })
        });
        
        const data = await response.json();
        if (data.success) {
            showNotification('✅ Админ добавлен!', 'success');
            document.getElementById('new-admin-id').value = '';
            document.getElementById('new-admin-name').value = '';
            loadAdmins();
        } else {
            showNotification('Ошибка: ' + data.message, 'error');
        }
    } catch (error) {
        showNotification('Ошибка соединения!', 'error');
    }
}

// Удаление админа
async function removeAdmin(adminId) {
    if (!confirm('Вы уверены?')) return;
    
    try {
        const response = await fetch(`${API_URL}/api/admin/remove/${adminId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentAdmin.token}` }
        });
        
        const data = await response.json();
        if (data.success) {
            showNotification('✅ Админ удалён!', 'success');
            loadAdmins();
        } else {
            showNotification('Ошибка: ' + data.message, 'error');
        }
    } catch (error) {
        showNotification('Ошибка соединения!', 'error');
    }
}

// Загрузка истории транзакций
async function loadTransactions() {
    try {
        const response = await fetch(`${API_URL}/api/admin/transactions`, {
            headers: { 'Authorization': `Bearer ${currentAdmin.token}` }        });
        const data = await response.json();
        
        const tbody = document.getElementById('transactions-body');
        if (!tbody) return;
        
        if (data.transactions && data.transactions.length > 0) {
            tbody.innerHTML = data.transactions.map(tx => `
                <tr>
                    <td>${new Date(tx.timestamp).toLocaleString('ru-RU')}</td>
                    <td>${tx.adminId}</td>
                    <td>${tx.userId}</td>
                    <td class="${tx.action === 'add' ? 'transaction-add' : 'transaction-set'}">
                        ${tx.action === 'add' ? '+ Добавить' : '= Установить'}
                    </td>
                    <td class="${tx.amount > 0 ? 'transaction-add' : ''}">
                        ${tx.amount > 0 ? '+' : ''}${tx.amount.toLocaleString()} TON
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Нет транзакций</td></tr>';
        }
    } catch (error) {
        console.log('Transactions load error:', error);
    }
}

// Загрузка настроек
async function loadSettings() {
    try {
        const response = await fetch(`${API_URL}/api/admin/settings`, {
            headers: { 'Authorization': `Bearer ${currentAdmin.token}` }
        });
        const data = await response.json();
        
        document.getElementById('setting-multiplier').value = data.multiplier || 1;
        document.getElementById('setting-max-energy').value = data.maxEnergy || 1000;
    } catch (error) {
        console.log('Settings load error:', error);
    }
}

// Сохранение настроек
async function saveSettings() {
    try {
        const response = await fetch(`${API_URL}/api/admin/settings`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',                'Authorization': `Bearer ${currentAdmin.token}`
            },
            body: JSON.stringify({
                multiplier: parseInt(document.getElementById('setting-multiplier').value),
                maxEnergy: parseInt(document.getElementById('setting-max-energy').value)
            })
        });
        
        const data = await response.json();
        if (data.success) {
            showNotification('✅ Настройки сохранены!', 'success');
        } else {
            showNotification('Ошибка: ' + data.message, 'error');
        }
    } catch (error) {
        showNotification('Ошибка соединения!', 'error');
    }
}

// Изменение секретного ключа
async function changeSecretKey() {
    const newKey = document.getElementById('setting-secret-key').value;
    if (!newKey) {
        showNotification('⚠️ Введите новый ключ!', 'error');
        return;
    }
    if (!confirm('Вы уверены? Все админы должны будут войти заново!')) return;
    
    try {
        const response = await fetch(`${API_URL}/api/admin/secret-key`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentAdmin.token}`
            },
            body: JSON.stringify({ newKey })
        });
        
        const data = await response.json();
        if (data.success) {
            showNotification('✅ Ключ изменён!', 'success');
            document.getElementById('setting-secret-key').value = '';
            adminLogout();
        } else {
            showNotification('Ошибка: ' + data.message, 'error');
        }
    } catch (error) {
        showNotification('Ошибка соединения!', 'error');
    }
}
// Экспорт данных
async function exportData() {
    try {
        const response = await fetch(`${API_URL}/api/admin/export`, {
            headers: { 'Authorization': `Bearer ${currentAdmin.token}` }
        });
        const data = await response.json();
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        showNotification('✅ Данные экспортированы!', 'success');
    } catch (error) {
        showNotification('Ошибка экспорта!', 'error');
    }
}

// Сброс всех данных
async function resetAllData() {
    if (!confirm('ВНИМАНИЕ! Все данные будут удалены! Это действие нельзя отменить!')) return;
    if (!confirm('Вы точно уверены?')) return;
    
    try {
        const response = await fetch(`${API_URL}/api/admin/reset-all`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentAdmin.token}` }
        });
        
        const data = await response.json();
        if (data.success) {
            showNotification('✅ Все данные сброшены!', 'success');
            location.reload();
        } else {
            showNotification('Ошибка: ' + data.message, 'error');
        }
    } catch (error) {
        showNotification('Ошибка соединения!', 'error');
    }
}

// Инициализация
checkAuth();

console.log('🛡️ Admin Panel ready!');
