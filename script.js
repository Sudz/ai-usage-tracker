// ────────────────────────────────────────────────
// Data & Storage
// ────────────────────────────────────────────────
let services = JSON.parse(localStorage.getItem('services')) || [];
let history = JSON.parse(localStorage.getItem('history')) || [];
let dailyStats = JSON.parse(localStorage.getItem('dailyStats')) || {};

// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────
function saveData() {
    localStorage.setItem('services', JSON.stringify(services));
    localStorage.setItem('history', JSON.stringify(history));
    localStorage.setItem('dailyStats', JSON.stringify(dailyStats));
}

function today() {
    return new Date().toISOString().split('T')[0];
}

function getCurrentUsage(service) {
    const now = new Date();
    const rt = new Date(service.refreshTime);
    if (now >= rt) {
        service.currentUsage = 0;
        service.refreshTime = calculateRefreshTime(service.refreshPeriod).toISOString();
        saveData();
    }
    return service.currentUsage || 0;
}

function calculateRefreshTime(period) {
    const now = new Date();
    let d = new Date(now);
    d.setHours(0,0,0,0);
    if (period === 'daily') d.setDate(d.getDate() + 1);
    else if (period === 'weekly') d.setDate(d.getDate() + 7);
    else if (period === 'monthly') {
        d.setMonth(d.getMonth() + 1);
        d.setDate(1);
    }
    return d;
}

function getServiceIcon(name) {
    const n = name.toLowerCase();
    if (n.includes('grok')) return 'fa-robot';
    if (n.includes('claude')) return 'fa-comment-dots';
    if (n.includes('gemini') || n.includes('google')) return 'fa-google';
    if (n.includes('chatgpt') || n.includes('openai')) return 'fa-comment-medical';
    if (n.includes('perplexity')) return 'fa-search';
    return 'fa-brain';
}

function recordDailyUsage(amount) {
    const d = today();
    dailyStats[d] = (dailyStats[d] || 0) + amount;
    saveData();
}

function getAverageDaily(days = 14) {
    const dates = Object.keys(dailyStats).sort().slice(-days);
    if (!dates.length) return 0;
    return (Object.values(dailyStats).reduce((a,b)=>a+b,0) / dates.length).toFixed(1);
}

// ────────────────────────────────────────────────
// Toast Notification
// ────────────────────────────────────────────────
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container') || document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3200);
}

// ────────────────────────────────────────────────
// Render Dashboard
// ────────────────────────────────────────────────
function renderDashboard() {
    const cards = document.getElementById('services-cards');
    cards.innerHTML = '';

    let totalUsed = 0;
    let mostUsed = {name:'—', used:0};

    services.forEach((s, i) => {
        const used = getCurrentUsage(s);
        totalUsed += used;
        if (used > mostUsed.used) mostUsed = {name:s.name, used};

        const rem = s.limit - used;
        const pct = s.limit ? (used / s.limit * 100) : 0;
        const daysLeft = getDaysLeft(s);
        const color = daysLeft === '∞' || daysLeft > 14 ? 'var(--success)' : daysLeft > 5 ? 'var(--warning)' : 'var(--danger)';

        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <div class="flex-between">
                <h3><i class="fas ${getServiceIcon(s.name)}"></i> ${s.name}</h3>
                <div>
                    <button class="button secondary small" onclick="openEditModal(${i})"><i class="fas fa-edit"></i></button>
                    <button class="button danger small" onclick="deleteService(${i})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="progress mt-3">
                <div class="progress-fill" style="width:${pct}%"></div>
            </div>
            <div class="mt-2 text-center">
                ${used} / ${s.limit} (${rem} left)
            </div>
            <div class="mt-2 text-center" style="color:${color}; font-weight:600;">
                <i class="fas fa-fire"></i> ~${daysLeft} day${daysLeft === 1 ? '' : 's'} left
            </div>
            <div style="height:140px; margin:1rem 0;">
                <canvas id="mini-chart-${i}"></canvas>
            </div>
            <button class="button primary full-width" onclick="openLogModal(${i})">
                <i class="fas fa-plus"></i> Log Usage
            </button>
        `;
        cards.appendChild(div);

        new Chart(document.getElementById(`mini-chart-${i}`), {
            type: 'doughnut',
            data: {
                datasets: [{ data: [used, rem], backgroundColor: [var(--primary), '#e2e8f0'], borderWidth: 0 }]
            },
            options: { cutout: '70%', plugins: {legend:{display:false}} }
        });
    });

    // Summary
    document.getElementById('summary-stats').innerHTML = `
        <div class="card"><strong>Total Used</strong><div class="text-2xl">${totalUsed}</div></div>
        <div class="card"><strong>Most Used</strong><div class="text-2xl">${mostUsed.name}</div></div>
        <div class="card"><strong>Avg / day</strong><div class="text-2xl">${getAverageDaily()}</div></div>
    `;

    renderTrendChart();
}

// ────────────────────────────────────────────────
// Insights / Data Science
// ────────────────────────────────────────────────
function renderInsights() {
    renderCategoryPie();
    renderDayOfWeekBar();
    renderForecast();
    renderStreak();
}

function renderCategoryPie() {
    const byCat = {};
    history.forEach(h => {
        const c = h.category || 'other';
        byCat[c] = (byCat[c] || 0) + h.amount;
    });

    new Chart(document.getElementById('category-pie'), {
        type: 'pie',
        data: {
            labels: Object.keys(byCat),
            datasets: [{ data: Object.values(byCat), backgroundColor: ['#f97316','#22c55e','#eab308','#3b82f6','#8b5cf6','#ec4899'] }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
}

function renderDayOfWeekBar() {
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const byDay = Array(7).fill(0);

    history.forEach(h => {
        const d = new Date(h.timestamp).getDay();
        byDay[d] += h.amount;
    });

    new Chart(document.getElementById('dow-bar'), {
        type: 'bar',
        data: {
            labels: days,
            datasets: [{ label: 'Usage', data: byDay, backgroundColor: '#f97316' }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true } }
        }
    });
}

function renderForecast() {
    const avg = parseFloat(getAverageDaily(7)) || 0;
    const projected = (avg * 7).toFixed(0);

    let txt = `<p><strong>Next 7 days projection:</strong> ~${projected} requests (based on last week average of ${avg}/day)</p>`;

    if (avg > 0) {
        const spike = Object.values(dailyStats).slice(-7).some(v => v > avg * 2.5);
        if (spike) txt += `<p class="warning"><i class="fas fa-exclamation-triangle"></i> Spike detected in recent usage.</p>`;
    }

    // Simple recommendation example
    const codingHeavy = history.filter(h => h.category === 'coding').reduce((a,b)=>a+b.amount,0);
    if (codingHeavy > history.reduce((a,b)=>a+b.amount,0) * 0.4) {
        txt += `<p><strong>Tip:</strong> You use a lot of coding queries — consider Grok or GitHub Copilot for better code support.</p>`;
    }

    document.getElementById('forecast-content').innerHTML = txt;
}

function renderStreak() {
    const dates = Object.keys(dailyStats).sort();
    let streak = 0;
    let current = new Date();
    current.setHours(0,0,0,0);

    for (let i = dates.length-1; i >= 0; i--) {
        const d = new Date(dates[i]);
        if (d.toDateString() === current.toDateString()) {
            streak++;
            current.setDate(current.getDate() - 1);
        } else if (d < current) break;
    }

    document.getElementById('streak-info').textContent = streak > 0 ? `${streak}-day streak! 🔥` : "Start your streak today!";
}

// ────────────────────────────────────────────────
// Other render functions (history, trend chart, etc.)
// ────────────────────────────────────────────────
function renderTrendChart() {
    const ctx = document.getElementById('trend-chart');
    if (!ctx) return;

    const dates = Object.keys(dailyStats).sort().slice(-14);
    const values = dates.map(d => dailyStats[d] || 0);

    if (ctx.chart) ctx.chart.destroy();

    ctx.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates.map(d => new Date(d).toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'})),
            datasets: [{
                label: 'Total usage',
                data: values,
                borderColor: 'var(--primary)',
                backgroundColor: 'rgba(249,115,22,0.15)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
    });
}

// ────────────────────────────────────────────────
// Modals, forms, actions
// ────────────────────────────────────────────────
function openLogModal(index) {
    // same as before, but add category to history entry
    // ... (add category from select)
}

function exportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("AI Usage Tracker Report", 20, 20);
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);

    let y = 50;
    services.forEach(s => {
        doc.text(`${s.name}: ${getCurrentUsage(s)} / ${s.limit}`, 20, y);
        y += 10;
    });

    y += 10;
    doc.text("Recent History:", 20, y);
    y += 10;
    history.slice(-10).reverse().forEach(h => {
        doc.text(`${h.service} - ${h.amount} (${h.category || '?'}) - ${new Date(h.timestamp).toLocaleString()}`, 20, y);
        y += 8;
    });

    doc.save('ai-usage-report.pdf');
    showToast("PDF report generated!", "success");
}

// Hamburger menu
document.getElementById('hamburger')?.addEventListener('click', () => {
    document.getElementById('nav-links').classList.toggle('active');
});

// Routing & init
function handleRoute() {
    const hash = location.hash.slice(1) || 'dashboard';
    document.querySelectorAll('section').forEach(s => s.style.display = 'none');
    document.getElementById(hash).style.display = 'block';

    if (hash === 'dashboard') renderDashboard();
    if (hash === 'insights') renderInsights();
    if (hash === 'history') renderHistory();
}

window.addEventListener('hashchange', handleRoute);
window.addEventListener('load', () => {
    // Dark mode
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark');
        document.getElementById('dark-mode').checked = true;
    }
    document.getElementById('dark-mode').addEventListener('change', e => {
        document.body.classList.toggle('dark', e.target.checked);
        localStorage.setItem('darkMode', e.target.checked);
    });

    // First time
    if (!localStorage.getItem('visited')) {
        document.getElementById('welcome-overlay').style.display = 'flex';
        // Add sample services
        if (services.length === 0) {
            ['Grok', 'Claude', 'Gemini', 'Perplexity'].forEach(name => {
                services.push({
                    name,
                    limit: name === 'Grok' ? 20 : name === 'Claude' ? 30 : 50,
                    refreshPeriod: 'daily',
                    refreshTime: calculateRefreshTime('daily').toISOString(),
                    currentUsage: 0
                });
            });
            saveData();
        }
        localStorage.setItem('visited', 'true');
    }

    renderDashboard();
    handleRoute();
});

// Close welcome
function closeWelcome() {
    document.getElementById('welcome-overlay').style.display = 'none';
}
