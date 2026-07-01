// ====== Data ======
const STORAGE_KEY = 'xiaobenben_data';
let data = loadData();
let editingJournalIndex = -1;
let editingTodoIndex = -1;

function defaultData() {
    return { journals: [], todos: [], dones: [] };
}

function loadData() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : defaultData();
    } catch { return defaultData(); }
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    updateBadges();
    // 同步到其他设备
    if (typeof Sync !== 'undefined' && Sync.getStatus() === 'connected') {
      Sync.push(data);
    }
}

// ====== Tab switching ======
document.querySelectorAll('.tab').forEach(function(tab) {
    tab.onclick = function() {
        var panels = document.querySelectorAll('.panel');
        for (var i = 0; i < panels.length; i++) {
            panels[i].classList.remove('active');
            panels[i].style.display = 'none';
        }
        var tabs = document.querySelectorAll('.tab');
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].classList.remove('active');
        }
        tab.classList.add('active');
        var pid = tab.getAttribute('data-tab') + 'Panel';
        var p = document.getElementById(pid);
        if (p) { p.classList.add('active'); p.style.display = 'block'; }
        if (tab.getAttribute('data-tab') === 'diet' && typeof renderCalendar === 'function') renderCalendar();
    };
});

// ====== Toast ======
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2000);
}
// ====== Confirm Delete ======
let confirmCallback = null;
function showConfirm(msg, cb) {
    document.getElementById("confirmMsg").textContent = msg;
    document.getElementById("confirmOverlay").classList.add("active");
    confirmCallback = cb;
}
document.getElementById("confirmCancel").addEventListener("click", function() {
    document.getElementById("confirmOverlay").classList.remove("active");
    confirmCallback = null;
});
document.getElementById("confirmOk").addEventListener("click", function() {
    document.getElementById("confirmOverlay").classList.remove("active");
    if (confirmCallback) confirmCallback();
    confirmCallback = null;
});

// ====== Edit Functions ======
function editJournal(i) {
    editingJournalIndex = i;
    document.getElementById('journalInput').value = data.journals[i].text;
    document.getElementById('journalInput').focus();
    document.getElementById('journalBtn').textContent = '保存修改 💾';
}

function editTodo(i) {
    editingTodoIndex = i;
    document.getElementById('todoInput').value = data.todos[i].text;
    document.getElementById('todoInput').focus();
    document.getElementById('todoBtn').textContent = '保存修改 ✚';
}

function moveJournalUp(i) {
    if (i <= 0) return;
    var tmp = data.journals[i]; data.journals[i] = data.journals[i-1]; data.journals[i-1] = tmp;
    saveData(); renderJournals();
}
function moveJournalDown(i) {
    if (i >= data.journals.length - 1) return;
    var tmp = data.journals[i]; data.journals[i] = data.journals[i+1]; data.journals[i+1] = tmp;
    saveData(); renderJournals();
}
function moveTodoUp(i) {
    if (i <= 0) return;
    var tmp = data.todos[i]; data.todos[i] = data.todos[i-1]; data.todos[i-1] = tmp;
    saveData(); renderTodos();
}
function moveTodoDown(i) {
    if (i >= data.todos.length - 1) return;
    var tmp = data.todos[i]; data.todos[i] = data.todos[i+1]; data.todos[i+1] = tmp;
    saveData(); renderTodos();
}

// ====== Journal ======
function renderJournals() {
    const el = document.getElementById('journalEntries');
    if (data.journals.length === 0) {
        el.innerHTML = '<div class="empty-state"><p>还没有记录，写下今天的故事吧</p></div>';
        return;
    }
    el.innerHTML = data.journals.map((j, i) => `
        <div class="entry-card">
            <div class="entry-text">${escapeHtml(j.text)}</div>
            <div class="entry-meta">
                <span class="entry-time">${j.time}</span>
                <div class="entry-actions">
                    ${i > 0 ? '<button class="entry-btn move" onclick="moveJournalUp(' + i + ')">↑</button>' : ''}
                    <button class="entry-btn delete" onclick="deleteJournal(${i})">🗑️</button>
                    <button class="entry-btn edit" onclick="editJournal(${i})">✏️</button>
                    ${i < data.journals.length - 1 ? '<button class="entry-btn move" onclick="moveJournalDown(' + i + ')">↓</button>' : ''}
                </div>
            </div>
        </div>
    `).join('');
}

function deleteJournal(i) {
    showConfirm('确定删除这条记录吗？', function() {
        data.journals.splice(i, 1);
        saveData();
        renderJournals();
        showToast('已删除');
    });
}

document.getElementById('journalBtn').addEventListener('click', () => {
    const input = document.getElementById('journalInput');
    const text = input.value.trim();
    if (editingJournalIndex < 0 && !text) { showToast('写点内容再保存吧'); return; }
    if (editingJournalIndex >= 0) {
        data.journals[editingJournalIndex].text = text;
        editingJournalIndex = -1;
        document.getElementById('journalBtn').textContent = '记录今天 💾';
        showToast('已修改');
    } else {
        data.journals.unshift({
            text,
            time: new Date().toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        });
        showToast('记录成功');
    }
    saveData();
    renderJournals();
    input.value = '';
});

document.getElementById('journalInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
        document.getElementById('journalBtn').click();
    }
});
// ====== Todo ======
function renderTodos() {
    const el = document.getElementById('todoEntries');
    if (data.todos.length === 0) {
        el.innerHTML = '<div class="empty-state"><p>还没有待办事项，添加一个吧</p></div>';
        return;
    }
    el.innerHTML = data.todos.map((t, i) => `
        <div class="entry-card todo-card">
            <div class="todo-top">
                    <div class="todo-check" onclick="completeTodo(${i})">✓</div>
                <div style="flex:1">
                    <div class="entry-text">${escapeHtml(t.text)}</div>
                    <span class="entry-time">${t.time}</span>
                </div>
                ${i > 0 ? '<button class="entry-btn move" onclick="moveTodoUp(' + i + ')">↑</button>' : ''}
                <button class="entry-btn delete" onclick="deleteTodo(${i})">🗑️</button>
                <button class="entry-btn edit" onclick="editTodo(${i})">✏️</button>
                ${i < data.todos.length - 1 ? '<button class="entry-btn move" onclick="moveTodoDown(' + i + ')">↓</button>' : ''}
            </div>
        </div>
    `).join('');
}
function renderDones() {
    const el = document.getElementById('doneEntries');
    if (data.dones.length === 0) {
        el.innerHTML = '<div class="empty-state"><p>还没有完成的事项，加油！</p></div>';
        return;
    }
    el.innerHTML = data.dones.map((d, i) => `
        <div class="entry-card done-card">
            <div class="todo-top">
                    <div class="todo-check" onclick="undoTodo(${i})">↩</div>
                <div style="flex:1">
                    <div class="entry-text">${escapeHtml(d.text)}</div>
                    <span class="entry-time">完成于 ${d.doneTime}</span>
                </div>
                <button class="entry-btn delete" onclick="deleteDone(${i})">🗑️</button>
            </div>
        </div>
    `).join('');
}

function completeTodo(i) {
    const todo = data.todos[i];
    data.todos.splice(i, 1);
    data.dones.unshift({
        text: todo.text, time: todo.time,
        doneTime: new Date().toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    });
    saveData();
    renderTodos();
    renderDones();
    showToast('太棒了！又完成一件事');
}
function undoTodo(i) {
    const done = data.dones[i];
    data.dones.splice(i, 1);
    data.todos.unshift({ text: done.text, time: done.time });
    saveData();
    renderTodos();
    renderDones();
    showToast('已移回待办事项');
}

function deleteTodo(i) {
    showConfirm('确定删除这个待办吗？', function() {
        data.todos.splice(i, 1);
        saveData();
        renderTodos();
        showToast('已删除');
    });
}

function deleteDone(i) {
    showConfirm('确定删除这条已完成记录吗？', function() {
        data.dones.splice(i, 1);
        saveData();
        renderDones();
        showToast('已删除');
    });
}

document.getElementById('todoBtn').addEventListener('click', () => {
    const input = document.getElementById('todoInput');
    const text = input.value.trim();
    if (editingTodoIndex < 0 && !text) { showToast('输入要做什么吧'); return; }
    if (editingTodoIndex >= 0) {
        data.todos[editingTodoIndex].text = text;
        editingTodoIndex = -1;
        document.getElementById('todoBtn').textContent = '添加 ✚';
        showToast('已修改');
    } else {
        data.todos.unshift({
            text,
            time: new Date().toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        });
        showToast('已添加到待办');
    }
    saveData();
    renderTodos();
    input.value = '';
});

document.getElementById('todoInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('todoBtn').click();
    }
});

// ====== Badges ======
function updateBadges() {
    document.getElementById('todoBadge').textContent = data.todos.length;
    document.getElementById('doneBadge').textContent = data.dones.length;
}

// ====== Helpers ======
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ====== Init ======
renderJournals();
renderTodos();
renderDones();
showToast('欢迎回来');

// ====== 跨设备同步接入 ======
if (typeof Sync !== 'undefined') {
  // 收到远端数据 → 更新本地并重绘
  Sync.onData(function(remoteData) {
    var remoteStr = JSON.stringify(remoteData);
    var localStr = localStorage.getItem(STORAGE_KEY);
    if (remoteStr === localStr) return;
    data = remoteData;
    localStorage.setItem(STORAGE_KEY, remoteStr);
    updateBadges();
    renderJournals();
    renderTodos();
    renderDones();
    if (typeof renderCalendar === "function") renderCalendar();
    showToast("已同步 📡");
  });
  
  // 如果有保存的配置，自动连接
  var savedCfg = Sync.getConfig();
  if (savedCfg.url && savedCfg.anonKey && savedCfg.token) {
    Sync.connect().catch(function(err) {
      console.warn('自动同步连接失败:', err.message);
    });
  }
}
// ====== 同步面板 UI 交互 ======
(function() {
  if (typeof Sync === 'undefined') return;
  
  var $ = function(id) { return document.getElementById(id); };
  
  var cfg = Sync.getConfig();
  if (cfg.url && $('syncUrl')) $('syncUrl').value = cfg.url;
  if (cfg.anonKey && $('syncAnonKey')) $('syncAnonKey').value = cfg.anonKey;
  if (cfg.token && $('syncToken')) $('syncToken').value = cfg.token;
  
  function updateSyncUI() {
    var statusEl = $('syncStatus');
    if (!statusEl) return;
    switch (Sync.getStatus()) {
      case 'connected':
        statusEl.innerHTML = '🟢 已连接 · 实时同步中';
        statusEl.style.background = '#d4edda';
        statusEl.style.color = '#155724';
        break;
      case 'connecting':
        statusEl.innerHTML = '🟡 连接中...';
        statusEl.style.background = '#fff3cd';
        statusEl.style.color = '#856404';
        break;
      default:
        statusEl.innerHTML = '⚪ 未连接';
        statusEl.style.background = '#f8f9fa';
        statusEl.style.color = '#b2bec3';
    }
  }
  
  Sync.onStatusChange(updateSyncUI);
  
  var connectBtn = $('syncConnectBtn');
  if (connectBtn) {
    connectBtn.addEventListener('click', async function() {
      var url = $('syncUrl').value.trim();
      var anonKey = $('syncAnonKey').value.trim();
      var token = $('syncToken').value.trim();
      if (!url || !anonKey || !token) { showToast('请填写所有字段'); return; }
      Sync.saveConfig(url, anonKey, token);
      try {
        await Sync.connect();
      showToast('同步连接成功 🎉');
      } catch(e) {
        showToast('连接失败：' + e.message);
      }
    });
  }
  
  var disconnectBtn = $('syncDisconnectBtn');
  if (disconnectBtn) {
    disconnectBtn.addEventListener('click', async function() {
      await Sync.disconnect();
      showToast('已断开同步');
    });
  }
  
  updateSyncUI();
})();

// ====== Diet Calendar ======
var dietMonth = new Date();

function getDateStr(d) {
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function getTodayStr() { return getDateStr(new Date()); }
function getDietTarget() {
    if (!data.dietTarget) data.dietTarget = 2000;
    return data.dietTarget;
}
function getDayLog(dateStr) {
    if (!data.dietLogs) data.dietLogs = {};
    return data.dietLogs[dateStr] || [];
}
function getDayTotal(dateStr) {
    var entries = getDayLog(dateStr);
    var sum = 0;
    for (var i = 0; i < entries.length; i++) sum += entries[i].cal;
    return sum;
}

function renderCalendar() {
    var year = dietMonth.getFullYear();
    var month = dietMonth.getMonth();
    var firstDay = new Date(year, month, 1);
    var lastDay = new Date(year, month + 1, 0);
    var numDays = lastDay.getDate();
    var todayStr = getTodayStr();
    var target = getDietTarget();

    var startDow = firstDay.getDay();
    startDow = (startDow === 0) ? 6 : startDow - 1;

    var html = '';
    var headers = ['一', '二', '三', '四', '五', '六', '日'];
    for (var h = 0; h < headers.length; h++) {
        html += '<div class="diet-weekday-header">' + headers[h] + '</div>';
    }

    for (var i = 0; i < startDow; i++) {
        html += '<div class="diet-cal-day other-month"></div>';
    }

    var monthCalSum = 0;
    var monthCalCount = 0;

    for (var d = 1; d <= numDays; d++) {
        var dateStr = year + '-' + String(month+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
        var cal = getDayTotal(dateStr);
        if (cal > 0) { monthCalSum += cal; monthCalCount++; }

        var cls = 'diet-cal-day';
        if (dateStr === todayStr) cls += ' today';
        if (cal > 0) cls += (cal <= target) ? ' under-target' : ' over-target';

        html += '<div class="' + cls + '" onclick="dietShowDay(\'' + dateStr + '\')">';
        html += '<div class="day-num">' + d + '</div>';
        if (cal > 0) html += '<div class="day-cal">' + cal + '</div>';
        html += '</div>';
    }
    // Fill remaining cells to complete the last row
    var total = startDow + numDays;
    var remain = total % 7;
    if (remain > 0) {
        for (var i = 0; i < 7 - remain; i++) {
            html += '<div class="diet-cal-day other-month"></div>';
        }
    }

    document.getElementById('dietCalGrid').innerHTML = html;
    document.getElementById('dietMonthLabel').textContent = year + '年' + (month+1) + '月';
    document.getElementById('dietTargetInput').value = target;

    var avg = monthCalCount > 0 ? Math.round(monthCalSum / monthCalCount) : 0;
    // document.getElementById('dietMonthSummary').textContent = '记录 ' + monthCalCount + '/' + numDays + ' 天 | 日均 ' + avg + ' kcal | 月累计 ' + monthCalSum + ' kcal';
    // document.getElementById('dietCalBadge').textContent = getDayTotal(getTodayStr());
}

// ====== Day Detail ======
function dietShowDay(dateStr) {
    var entries = getDayLog(dateStr);
    var target = getDietTarget();
    var total = getDayTotal(dateStr);
    var pct = Math.min(total / target * 100, 100);

    var html = '';
    html += '<div style="margin-bottom:12px">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
    html += '<strong style="font-size:1rem">' + dateStr + '</strong>';
    html += '<button style="padding:4px 10px;border:none;background:#f1f2f6;border-radius:6px;cursor:pointer;font-size:0.8rem;color:#636e72" onclick="dietCloseDay()">✕ 关闭</button>';
    html += '</div>';
    html += '<div style="text-align:center;padding:8px 0"><span style="font-size:2rem;font-weight:700;color:#ff6b6b">' + total + '</span><span style="font-size:0.9rem;color:#636e72;margin-left:6px">/ ' + target + ' kcal</span></div>';
    html += '<div style="height:8px;background:#f1f2f6;border-radius:4px;overflow:hidden;margin-bottom:4px"><div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,#2ed573,#ffa502,#ff6b6b);border-radius:4px;transition:width 0.3s"></div></div>';
    var st = total === 0 ? '还没有记录' : (total <= target ? '✓ 达标' : '⚠ 超标 ' + (total-target) + ' kcal');
    html += '<div style="text-align:center;font-size:0.8rem;color:#636e72">' + st + '</div>';
    html += '</div>';

    if (entries.length > 0) {
        for (var i = 0; i < entries.length; i++) {
            var e = entries[i];
            html += '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:#fafafa;border-radius:8px;margin-bottom:4px">';
            html += '<span style="flex:1;font-size:0.85rem;font-weight:600">+ ' + e.cal + ' kcal</span>';
            if (e.time) html += '<span style="font-size:0.7rem;color:#b2bec3">' + e.time + '</span>';
            html += '<button style="padding:2px 6px;border:none;background:transparent;cursor:pointer;color:#b2bec3;border-radius:4px;font-size:0.85rem" onclick="dietDeleteEntry(\'' + dateStr + '\',' + i + ')"';
            html += ' onmouseover="this.style.color=\'#ff6b6b\'" onmouseout="this.style.color=\'#b2bec3\'">✕</button>';
            html += '</div>';
        }
    } else {
        html += '<div style="text-align:center;padding:16px;color:#b2bec3;font-size:0.85rem">还没有记录</div>';
    }

    html += '<div style="display:flex;gap:8px;margin-top:10px">';
    html += '<input type="number" id="dietAddCal" placeholder="增加多少热量？" min="1" style="flex:1;border:2px solid #eee;border-radius:10px;padding:10px 12px;font-size:0.9rem;outline:none">';
    html += '<button style="padding:10px 18px;border:none;background:linear-gradient(135deg,#ff6b6b,#ffa502);color:white;border-radius:10px;cursor:pointer;font-weight:600;font-size:0.9rem;white-space:nowrap;box-shadow:0 3px 10px rgba(255,107,107,0.3)" onclick="dietAddCal(\'' + dateStr + '\')">+ 增加</button>';
    html += '</div>';
    html += '<div style="font-size:0.7rem;color:#b2bec3;margin-top:4px">按回车快速增加</div>';

    var el = document.getElementById('dietDayDetail');
    el.style.display = 'block';
    el.innerHTML = html;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    setTimeout(function() {
        var inp = document.getElementById('dietAddCal');
        if (inp) { inp.focus(); inp.onkeydown = function(e) { if (e.key === 'Enter') dietAddCal(dateStr); }; }
    }, 100);
}

function dietAddCal(dateStr) {
    var cal = parseInt(document.getElementById('dietAddCal').value, 10);
    if (isNaN(cal) || cal <= 0) { showToast('请输入有效数字'); return; }
    if (!data.dietLogs) data.dietLogs = {};
    if (!data.dietLogs[dateStr]) data.dietLogs[dateStr] = [];
    data.dietLogs[dateStr].push({ cal: cal, time: new Date().toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' }) });
    saveData();
    dietShowDay(dateStr);
    renderCalendar();
    showToast('+ ' + cal + ' kcal');
}

function dietDeleteEntry(dateStr, idx) {
    if (!data.dietLogs[dateStr]) return;
    data.dietLogs[dateStr].splice(idx, 1);
    if (data.dietLogs[dateStr].length === 0) delete data.dietLogs[dateStr];
    saveData();
    dietShowDay(dateStr);
    renderCalendar();
}

function dietCloseDay() { document.getElementById('dietDayDetail').style.display = 'none'; }

// ====== Events ======
document.getElementById('dietTargetBtn').addEventListener('click', function() {
    var val = parseInt(document.getElementById('dietTargetInput').value, 10);
    if (isNaN(val) || val < 100) return;
    data.dietTarget = val; saveData(); renderCalendar();
    showToast('目标设为 ' + val + ' kcal');
});
document.getElementById('dietTargetInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('dietTargetBtn').click();
});
document.getElementById('dietPrevMonth').addEventListener('click', function() { dietMonth.setMonth(dietMonth.getMonth()-1); renderCalendar(); });
document.getElementById('dietNextMonth').addEventListener('click', function() { dietMonth.setMonth(dietMonth.getMonth()+1); renderCalendar(); });

// ====== Auto-resize ======
document.getElementById('journalInput').addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});
// ====== Back to top ======
var backBtn = document.getElementById('backToTop');
if (backBtn) {
    backBtn.addEventListener('click', function() { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    window.addEventListener('scroll', function() { backBtn.style.display = window.scrollY > 300 ? 'flex' : 'none'; });
}
function toggleSyncPanel() {
    var panels = document.querySelectorAll('.panel');
    for (var i = 0; i < panels.length; i++) {
        panels[i].classList.remove('active');
        panels[i].style.display = 'none';
    }
    var sp = document.getElementById('syncPanel');
    if (sp) { sp.classList.add('active'); sp.style.display = 'block'; }
}

// ====== Auto-resize ======
