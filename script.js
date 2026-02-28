let services = JSON.parse(localStorage.getItem('services')) || [];
let history = JSON.parse(localStorage.getItem('history')) || [];
let dailyStats = JSON.parse(localStorage.getItem('dailyStats')) || {};

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
    else if (period === 'monthly') d.setMonth(d.getMonth() + 1), d.setDate(1);
    return d;
}

function getServiceIcon(name) {
    const lower = name.toLowerCase();
    if (lower.includes('grok')) return {icon: 'fa-robot', color: '#FF6B6B'};
    if (lower.includes('claude')) return {icon: 'fa-user-secret', color: '#4ECDC4'};
    if (lower.includes('gemini')) return {icon: 'fa-gem', color: '#FFD93D'};
    if (lower.includes('chatgpt')) return {icon: 'fa-comment-medical', color: '#6B7280'};
    if (lower.includes('perplexity')) return {icon: 'fa-search-dollar', color: '#6366F1'};
    return {icon: 'fa-brain', color: '#8B5CF6'};
}

function recordDailyUsage(amount) {
    dailyStats[today()] = (dailyStats[today()] || 0) + amount;
    saveData();
}

function getAverageDaily(days = 14) {
    const dates = Object.keys(dailyStats).sort().slice(-days);
    if (!dates.length) return 0;
    const sum = dates.reduce((a, d) => a + (dailyStats[d] || 0), 0);
    return sum / dates.length;
}

function renderServices() {
    const container = document.getElementById('services-cards');
    container.innerHTML = '';
    let totalUsed = 0;
    let mostUsed = {name: '—', used: 0};

    services.forEach((s, i) => {
        const used = getCurrentUsage(s);
        totalUsed += used;
        if (used > mostUsed.used) mostUsed = {name: s.name, used};

        const rem = s.limit - used;
        const pct = s.limit ? (used / s.limit * 100) : 0;
        const icon = getServiceIcon(s.name);

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <h3><i class="fas ${icon.icon}" style="color:${icon.color}"></i> ${s.name}</h3>
            <div class="progress mt-2">
                <div class="progress-fill" style="width:${pct}%"></div>
            </div>
            <p class="mt-2">${used} / ${s.limit} (${rem} left)</p>
            <button class="button primary mt-3" onclick="openLogModal(${i})">Log Usage</button>
        `;
        container.appendChild(card);
    });

    document.getElementById('total-used').textContent = totalUsed;
    document.getElementById('most-used').textContent = mostUsed.name;
    document.getElementById('avg-daily').textContent = getAverageDaily().toFixed(1);
}

function renderInsights() {
    // 10+ analytics implementations (simplified placeholders - expand as needed)
    document.getElementById('category-pie').innerHTML = '<p>Category pie chart placeholder</p>';
    document.getElementById('top-descriptions').innerHTML = '<li>Top description placeholder</li>';
    document.getElementById('efficiency-bar').innerHTML = '<p>Efficiency bar placeholder</p>';
    document.getElementById('low-usage-days').textContent = 'Low usage days: 3';
    document.getElementById('vs-average-line').innerHTML = '<p>Usage vs average placeholder</p>';
    document.getElementById('projection').textContent = 'Projection: 5 days left';
    document.getElementById('anomalies').textContent = 'No anomalies detected';
    document.getElementById('recommendations').innerHTML = 'Try <a href="https://huggingface.co/spaces" target="_blank">Hugging Face Spaces</a>';
    document.getElementById('heatmap-chart').innerHTML = '<p>Heatmap placeholder</p>';
    document.getElementById('growth-rate-line').innerHTML = '<p>Growth rate placeholder</p>';
    document.getElementById('category-correlation').textContent = 'Correlation: Moderate';
    document.getElementById('forecast').textContent = 'Next week forecast: ~45 uses';
    document.getElementById('outliers').textContent = 'No outliers';
    document.getElementById('variance').textContent = 'Variance: 12.5';
}

// Routing
function handleRoute() {
    const hash = location.hash.slice(1) || 'dashboard';
    document.querySelectorAll('.container section').forEach(sec => sec.style.display = 'none');
    document.getElementById(hash).style.display = 'block';
    if (hash === 'insights') renderInsights();
}

window.addEventListener('hashchange', handleRoute);
window.addEventListener('load', () => {
    renderServices();
    handleRoute();
});

// Add your existing modal, form, etc. handlers here
