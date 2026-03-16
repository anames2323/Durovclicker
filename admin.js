const API_URL = window.location.origin;
let currentAdmin = null;
let selectedUserId = null;

function checkAuth() {
    const admin = localStorage.getItem('adminAuth');
    if (admin) {
        currentAdmin = JSON.parse(admin);
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'flex';
        loadDashboard();
    }
}

async function adminLogin() {
    const adminId = document.getElementById('admin-id').value;
    const adminKey = document.getElementById('admin-key').value;
    const errorEl = document.getElementById('login-error');
    
    if (!adminId || !adminKey) {
        errorEl.textContent = 'Заполните все поля!';
        errorEl.classList.add('show');
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
            loadDashboard();
        } else {
            errorEl.textContent = data.message || 'Ошибка авторизации!';
            errorEl.classList.add('show');
        }
    } catch (error) {
        errorEl.textContent = 'Ошибка соединения!';
        errorEl.classList.add('show');
    }
}
function adminLogout() {
    localStorage.removeItem('adminAuth');
    currentAdmin = null;
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('admin-panel').style.display = 'none';
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(sectionId).classList.add('active');
    event.target.classList.add('active');
    
    if (sectionId === 'dashboard') loadDashboard();
    if (sectionId === 'users') loadUsers();
    if (sectionId === 'admins') loadAdmins();
    if (sectionId === 'settings') loadSettings();
}

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
        console.log('Dashboard load error:', error);
    }
}

async function loadUsers() {
    try {
        const response = await fetch(`${API_URL}/api/admin/users`, {
            headers: { 'Authorization': `Bearer ${currentAdmin.token}` }
        });
        const data = await response.json();
        
        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = data.users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${user.name || 'Unknown'}</td>
                <td>${(user.balance || 0).toLocaleString()}</td>
                <td>${(user.totalClicks || 0).toLocaleString()}</td>                <td>
                    <span class="status-badge ${user.banned ? 'status-banned' : 'status-active'}">
                        ${user.banned ? 'Забанен' : 'Активен'}
                    </span>
                </td>
                <td>
                    <button class="action-btn-small" onclick="openUserModal(${user.id})">
                        <i class="fas fa-eye"></i>
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

function searchUsers() {
    const query = document.getElementById('user-search').value.toLowerCase();
    const rows = document.querySelectorAll('#users-table-body tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
    });
}

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

async function openUserModal(userId) {
    selectedUserId = userId;
    try {
        const response = await fetch(`${API_URL}/api/admin/user/${userId}`, {            headers: { 'Authorization': `Bearer ${currentAdmin.token}` }
        });
        const user = await response.json();
        
        document.getElementById('modal-user-name').textContent = user.name || 'Unknown';
        document.getElementById('modal-user-id').textContent = user.id;
        document.getElementById('modal-user-balance').textContent = (user.balance || 0).toLocaleString();
        document.getElementById('modal-user-clicks').textContent = (user.totalClicks || 0).toLocaleString();
        document.getElementById('modal-user-status').textContent = user.banned ? 'Забанен' : 'Активен';
        
        document.getElementById('user-modal').classList.add('show');
    } catch (error) {
        console.log('User modal error:', error);
    }
}

function closeUserModal() {
    document.getElementById('user-modal').classList.remove('show');
    selectedUserId = null;
}

async function banUser() {
    if (!selectedUserId) return;
    await updateUserStatus(selectedUserId, true);
}

async function banUserById(userId) {
    await updateUserStatus(userId, true);
}

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
            alert(`Пользователь ${banned ? 'забанен' : 'разбанен'}!`);
            closeUserModal();            loadUsers();
            loadDashboard();
        } else {
            alert('Ошибка: ' + data.message);
        }
    } catch (error) {
        alert('Ошибка соединения!');
    }
}

async function resetUserBalance() {
    if (!selectedUserId) return;
    if (!confirm('Вы уверены? Баланс будет сброшен до 0!')) return;
    
    try {
        const response = await fetch(`${API_URL}/api/admin/user/${selectedUserId}/reset`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentAdmin.token}`
            }
        });
        
        const data = await response.json();
        if (data.success) {
            alert('Баланс сброшен!');
            closeUserModal();
            loadUsers();
        } else {
            alert('Ошибка: ' + data.message);
        }
    } catch (error) {
        alert('Ошибка соединения!');
    }
}

async function addBalanceUser() {
    if (!selectedUserId) return;
    const amount = prompt('Введите количество TON для добавления:');
    if (!amount || isNaN(amount)) return;
    
    try {
        const response = await fetch(`${API_URL}/api/admin/user/${selectedUserId}/balance`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentAdmin.token}`
            },
            body: JSON.stringify({ amount: parseInt(amount) })
        });        
        const data = await response.json();
        if (data.success) {
            alert(`Добавлено ${amount} TON!`);
            closeUserModal();
            loadUsers();
        } else {
            alert('Ошибка: ' + data.message);
        }
    } catch (error) {
        alert('Ошибка соединения!');
    }
}

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

async function addAdmin() {
    const id = document.getElementById('new-admin-id').value;
    const name = document.getElementById('new-admin-name').value;
    const role = document.getElementById('new-admin-role').value;
        if (!id || !name) {
        alert('Заполните все поля!');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/admin/add`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentAdmin.token}`
            },
            body: JSON.stringify({ id, name, role })
        });
        
        const data = await response.json();
        if (data.success) {
            alert('Админ добавлен!');
            document.getElementById('new-admin-id').value = '';
            document.getElementById('new-admin-name').value = '';
            loadAdmins();
        } else {
            alert('Ошибка: ' + data.message);
        }
    } catch (error) {
        alert('Ошибка соединения!');
    }
}

async function removeAdmin(adminId) {
    if (!confirm('Вы уверены?')) return;
    
    try {
        const response = await fetch(`${API_URL}/api/admin/remove/${adminId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentAdmin.token}` }
        });
        
        const data = await response.json();
        if (data.success) {
            alert('Админ удалён!');
            loadAdmins();
        } else {
            alert('Ошибка: ' + data.message);
        }
    } catch (error) {
        alert('Ошибка соединения!');
    }
}
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

async function saveSettings() {
    try {
        const response = await fetch(`${API_URL}/api/admin/settings`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentAdmin.token}`
            },
            body: JSON.stringify({
                multiplier: parseInt(document.getElementById('setting-multiplier').value),
                maxEnergy: parseInt(document.getElementById('setting-max-energy').value)
            })
        });
        
        const data = await response.json();
        if (data.success) {
            alert('Настройки сохранены!');
        } else {
            alert('Ошибка: ' + data.message);
        }
    } catch (error) {
        alert('Ошибка соединения!');
    }
}

async function changeSecretKey() {
    const newKey = document.getElementById('setting-secret-key').value;
    if (!newKey) {
        alert('Введите новый ключ!');
        return;
    }
    if (!confirm('Вы уверены? Все админы должны будут войти заново!')) return;
    
    try {
        const response = await fetch(`${API_URL}/api/admin/secret-key`, {
            method: 'POST',            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentAdmin.token}`
            },
            body: JSON.stringify({ newKey })
        });
        
        const data = await response.json();
        if (data.success) {
            alert('Ключ изменён!');
            document.getElementById('setting-secret-key').value = '';
        } else {
            alert('Ошибка: ' + data.message);
        }
    } catch (error) {
        alert('Ошибка соединения!');
    }
}

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
    } catch (error) {
        alert('Ошибка экспорта!');
    }
}

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
            alert('Все данные сброшены!');            location.reload();
        } else {
            alert('Ошибка: ' + data.message);
        }
    } catch (error) {
        alert('Ошибка соединения!');
    }
}

checkAuth();