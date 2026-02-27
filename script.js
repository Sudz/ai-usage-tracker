let services = JSON.parse(localStorage.getItem('services')) || [];
let history  = JSON.parse(localStorage.getItem('history'))  || [];

function saveData() {
    localStorage.setItem('services', JSON.stringify(services));
    localStorage.setItem('history', JSON.stringify(history));
}

function calculateRefreshTime(period) {
    const now = new Date();
    let refreshDate = new Date(now);
    refreshDate.setHours(0, 0, 0, 0);

    if (period === 'daily') {
        refreshDate.setDate(now.getDate() + 1);
    } else if (period === 'weekly') {
        refreshDate.setDate(now.getDate() + 7);
    } else if (period === 'monthly') {
        refreshDate.setMonth(now.getMonth() + 1);
        refreshDate.setDate(1);
    }

    return refreshDate;
}

function getCurrentUsage(service) {
    const now = new Date();
    const refreshTime = new Date(service.refreshTime);
    if (now >= refreshTime) {
        service.currentUsage = 0;
        service.refreshTime = calculateRefreshTime(service.refreshPeriod).toISOString();
        saveData();
    }
    return service.currentUsage || 0;
}

function getServiceIcon(name) {
    const n = name.toLowerCase();
    if (n.includes('grok') || n.includes('xai'))     return 'fa-robot';
    if (n.includes('claude') || n.includes('anthropic')) return 'fa-comment-dots';
    if (n.includes('gemini') || n.includes('google'))   return 'fa-google';
    if (n.includes('chatgpt') || n.includes('openai'))  return 'fa-comment-medical';
    if (n.includes('perplexity'))                       return 'fa-search';
    if (n.includes('copilot') || n.includes('github'))  return 'fa-github';
    if (n.includes('llama') || n.includes('meta'))      return 'fa-meta';
    return 'fa-brain';
}

function renderServices() {
    const container = document.getElementById('services-cards');
    container.innerHTML = '';

    services.forEach((service, index) => {
        const used = getCurrentUsage(service);
        const remaining = service.limit - used;
        const pct = service.limit > 0 ? (used / service.limit) * 100 : 0;
        const refreshDate = new Date(service.refreshTime);
        const icon = getServiceIcon(service.name);

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <h2 class="card-title"><i class="fas ${icon}"></i> ${service.name}</h2>

            <div class="progress-container">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${pct}%; background: ${pct < 50 ? '#22c55e' : pct < 80 ? '#eab308' : '#ef4444'}"></div>
                </div>
                <p class="progress-text">${used} / ${service.limit} (${remaining} remaining)</p>
            </div>

            <div class="chart-container">
                <canvas id="chart-${index}"></canvas>
            </div>

            <p class="card-info"><i class="fas fa-sync-alt"></i> Refreshes: ${refreshDate.toLocaleString()}</p>

            <button class="button primary" onclick="openLogModal(${index})">
                <i class="fas fa-plus-circle"></i> Log Usage
            </button>
        `;
        container.appendChild(card);

        new Chart(document.getElementById(`chart-${index}`), {
            type: 'doughnut',
            data: {
                labels: ['Used', 'Remaining'],
                datasets: [{
                    data: [used, remaining],
                    backgroundColor: ['#f97316', '#e2e8f0'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: { legend: { display: false } }
            }
        });
    });
}

function exportData() {
    const data = {
        services,
        history,
        exportedAt: new Date().toISOString(),
        note: "AI Usage Tracker export – import not yet implemented"
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-usage-tracker-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function renderHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = '';
    history.forEach(entry => {
        const li = document.createElement('li');
        li.innerHTML = `
            <strong>${entry.service}</strong> — ${entry.amount} used
            <br><small>${new Date(entry.timestamp).toLocaleString()}</small>
            <p>"${entry.description}"</p>
        `;
        list.appendChild(li);
    });
}

function openLogModal(index) {
    const modal = document.getElementById('log-modal');
    modal.style.display = 'flex';

    const form = document.getElementById('log-form');
    form.onsubmit = e => {
        e.preventDefault();
        const amount = parseInt(document.getElementById('usage-amount').value);
        const desc   = document.getElementById('usage-description').value.trim();

        if (amount < 1 || !desc) return alert('Please fill all fields correctly.');

        services[index].currentUsage = (services[index].currentUsage || 0) + amount;

        history.push({
            service: services[index].name,
            amount,
            description: desc,
            timestamp: new Date().toISOString()
        });

        saveData();
        renderServices();
        renderHistory();
        closeModal();
    };
}

function closeModal() {
    document.getElementById('log-modal').style.display = 'none';
    document.getElementById('log-form').reset();
}

document.getElementById('add-service-form').addEventListener('submit', e => {
    e.preventDefault();
    const name   = document.getElementById('service-name').value.trim();
    const limit  = parseInt(document.getElementById('limit').value);
    const period = document.getElementById('refresh-period').value;

    if (!name || limit < 1) return alert('Please enter valid name and limit.');

    services.push({
        name,
        limit,
        refreshPeriod: period,
        refreshTime: calculateRefreshTime(period).toISOString(),
        currentUsage: 0
    });

    saveData();
    renderServices();
    e.target.reset();
});

// Routing
function handleRoute() {
    const hash = location.hash.slice(1) || 'dashboard';
    document.querySelectorAll('.container > section').forEach(sec => {
        sec.style.display = sec.id === hash ? 'block' : 'none';
    });
    if (hash === 'history') renderHistory();
}

window.addEventListener('hashchange', handleRoute);
window.addEventListener('load', () => {
    renderServices();
    handleRoute();
});