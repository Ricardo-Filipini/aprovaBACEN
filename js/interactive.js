// Variáveis globais para o estado da aplicação interativa
let currentUser = { id: 0, nome: "Anônimo", palpite: null }; // Usuário anônimo por padrão
let usuariosSimulados = [
    { id: 0, nome: "Anônimo", palpite: null }
    // Outros usuários podem ser adicionados aqui ou carregados da planilha
];
let enquetesSimuladas = []; // { idUsuario: number, voto: string, timestampz: string }
let mensagensSimuladas = []; // { idUsuario: number, mensagem: string, timestampz: string }
let nextUserIdSimulado = 1; // Próximo ID para usuários não anônimos
let enqueteChartInstance = null;
const enqueteOptions = ['Super Otimista', 'Otimista', 'Realista', 'Pessimista', 'Mar céu lar'];

// --- LÓGICA DE IDENTIFICAÇÃO GLOBAL DO USUÁRIO ---
function setupGlobalUserIdentification() {
    const userSelectDropdown = document.getElementById('user-select-dropdown');
    const globalNomeUsuarioInput = document.getElementById('global-nome-usuario');
    const btnGlobalIdentificar = document.getElementById('btn-global-identificar');
    const globalUserDisplay = document.getElementById('global-user-display'); // Onde mostrar "Logado como: Nome"

    // Função para atualizar a exibição do usuário atual
    function updateGlobalUserDisplay() {
        if (globalUserDisplay && currentUser) {
            globalUserDisplay.textContent = `Logado como: ${currentUser.nome}`;
        }
        // Atualiza também a mensagem de boas-vindas no header principal, se existir
        const welcomeMessageElement = document.getElementById('welcome-user-message');
        if (welcomeMessageElement && currentUser) {
            welcomeMessageElement.innerHTML = `Bem-vindo(a), <span class="text-blue-600 font-semibold">${currentUser.nome}</span>!`;
        }
    }
    
    // Inicializa a exibição do usuário
    updateGlobalUserDisplay();

    // Popular o dropdown com usuários simulados (em produção, viria do Google Sheets)
    if (userSelectDropdown) {
        userSelectDropdown.innerHTML = ''; // Limpa opções existentes

        // Adiciona opção para voltar a ser Anônimo ou selecionar Anônimo
        const anonOption = document.createElement('option');
        anonOption.value = "0"; // ID do anônimo
        anonOption.textContent = "Anônimo";
        userSelectDropdown.appendChild(anonOption);

        usuariosSimulados.filter(u => u.id !== 0).forEach(u => {
            const option = document.createElement('option');
            option.value = u.id.toString();
            option.textContent = u.nome;
            userSelectDropdown.appendChild(option);
        });
        // Seleciona o usuário atual no dropdown
        userSelectDropdown.value = currentUser.id.toString();

        userSelectDropdown.addEventListener('change', async (event) => {
            const selectedUserId = parseInt(event.target.value);
            let selectedUser = usuariosSimulados.find(u => u.id === selectedUserId);
            
            if (selectedUser) {
                // Em um cenário de produção, você poderia buscar os dados completos do usuário aqui se necessário
                // Ex: const fullUserData = await fetchUserDataById(selectedUserId);
                setCurrentUser(selectedUser);
            }
        });
    }

    // Listener para o botão de identificar/cadastrar
    if (btnGlobalIdentificar && globalNomeUsuarioInput) {
        btnGlobalIdentificar.addEventListener('click', handleGlobalUserLogin);
        globalNomeUsuarioInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') handleGlobalUserLogin();
        });
    }

    async function handleGlobalUserLogin() {
        const nome = globalNomeUsuarioInput.value.trim();
        if (!nome) {
            // Se o campo estiver vazio, e o usuário quiser voltar para anônimo
            const anonUser = usuariosSimulados.find(u => u.id === 0);
            if (anonUser) setCurrentUser(anonUser);
            return;
        }
        try {
            // SIMULAÇÃO (PRODUÇÃO usaria checkOrAddUser(nome) do google-sheets-api.js)
            let user = usuariosSimulados.find(u => u.nome.toLowerCase() === nome.toLowerCase() && u.id !== 0);
            if (!user) { // Novo usuário
                user = { id: nextUserIdSimulado++, nome: nome, palpite: null };
                usuariosSimulados.push(user);
                // Adicionar ao dropdown se for um novo usuário
                if (userSelectDropdown) {
                    const option = document.createElement('option');
                    option.value = user.id.toString();
                    option.textContent = user.nome;
                    userSelectDropdown.appendChild(option);
                }
            }
            setCurrentUser(user);
            if (userSelectDropdown) userSelectDropdown.value = user.id.toString();
            globalNomeUsuarioInput.value = ''; // Limpa o input
        } catch (error) {
            console.error("Erro ao logar/cadastrar usuário globalmente:", error);
            alert("Erro ao tentar identificar usuário. Tente novamente.");
        }
    }
}

function setCurrentUser(user) {
    currentUser = user;
    // console.log("Usuário atual definido para:", currentUser); // Log de depuração

    // Atualiza a exibição global do usuário
    const globalUserDisplay = document.getElementById('global-user-display');
    if (globalUserDisplay) {
        globalUserDisplay.textContent = `Logado como: ${currentUser.nome}`;
    }
    const welcomeMessageElement = document.getElementById('welcome-user-message');
    if (welcomeMessageElement) {
        welcomeMessageElement.innerHTML = `Bem-vindo(a), <span class="text-blue-600 font-semibold">${currentUser.nome}</span>!`;
    }
    const userSelectDropdown = document.getElementById('user-select-dropdown');
     if (userSelectDropdown) {
        userSelectDropdown.value = currentUser.id.toString();
    }


    // Re-renderiza ou atualiza componentes das seções ativas que dependem do usuário
    // É importante que as funções de inicialização das seções sejam robustas
    // para serem chamadas múltiplas vezes ou para apenas atualizarem os dados.
    if (document.getElementById('palpites-section') && typeof initPalpitesSection === 'function') {
        initPalpitesSection(); 
    }
    if (document.getElementById('enquete-section') && typeof initEnqueteSection === 'function') {
        initEnqueteSection(); 
    }
    if (document.getElementById('mensagens-section') && typeof initMuralSection === 'function') {
        initMuralSection(); 
    }
}

// --- INICIALIZAÇÃO DAS SEÇÕES ESPECÍFICAS ---
function initPalpitesSection() {
    if (!currentUser) currentUser = { id: 0, nome: "Anônimo", palpite: null };
    setupPalpiteForm();
    renderPalpiteRanking(); // Idealmente buscaria dados reais aqui
    renderCountdownTimers(); // Idealmente buscaria dados reais aqui
}

function initEnqueteSection() {
    if (!currentUser) currentUser = { id: 0, nome: "Anônimo", palpite: null };
    renderEnqueteOptions();
    setupEnqueteForm();
    renderEnqueteChart(); // Idealmente buscaria dados reais aqui
}

function initMuralSection() {
    if (!currentUser) currentUser = { id: 0, nome: "Anônimo", palpite: null };
    setupMensagemForm();
    renderMensagens(); // Idealmente buscaria dados reais aqui
}

function initMotivosSection() {
    // A lógica de carregamento de motivos já está no HTML da seção.
    // Se houver mais interatividade a ser adicionada, seria aqui.
    // console.log('Seção Motivos inicializada/recarregada.');
}

function initMetodologiaSection() {
    // A lógica de gráficos e countdowns já está no HTML da seção.
    // Se houver mais interatividade a ser adicionada, seria aqui.
    // console.log('Seção Metodologia inicializada/recarregada.');
}


// --- LÓGICA DE PALPITES (SEÇÃO PALPITES) ---
function setupPalpiteForm() {
    const palpiteDateInput = document.getElementById('palpite-date');
    const btnEnviarPalpite = document.getElementById('btn-enviar-palpite');

    if (!palpiteDateInput || !btnEnviarPalpite) {
        // console.warn("Elementos do formulário de palpite não encontrados.");
        return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    palpiteDateInput.setAttribute('min', today);

    if (currentUser && currentUser.palpite) {
        palpiteDateInput.value = currentUser.palpite;
    } else {
        palpiteDateInput.value = '';
    }

    // Evitar adicionar múltiplos listeners se a função for chamada várias vezes
    if (btnEnviarPalpite.dataset.listenerAttached !== 'true') {
        btnEnviarPalpite.addEventListener('click', async () => {
            if (!currentUser) {
                alert("Você precisa se identificar para enviar um palpite.");
                return;
            }
            const palpiteDate = palpiteDateInput.value;
            if (!palpiteDate) {
                alert("Por favor, selecione uma data para o seu palpite.");
                return;
            }

            try {
                // SIMULAÇÃO:
                const userIndex = usuariosSimulados.findIndex(u => u.id === currentUser.id);
                if (userIndex !== -1) {
                    usuariosSimulados[userIndex].palpite = palpiteDate;
                    if(currentUser.id === usuariosSimulados[userIndex].id) currentUser.palpite = palpiteDate;
                } else if (currentUser.id !== 0) { // Novo usuário identificado que não está na lista simulada ainda
                    const newUserForSim = {...currentUser, palpite: palpiteDate};
                    usuariosSimulados.push(newUserForSim);
                }
                // PRODUÇÃO: await updateUserPalpite(currentUser.id, palpiteDate);
                
                alert("Seu palpite foi registrado (simulado)!");
                renderPalpiteRanking();
                renderCountdownTimers();
            } catch (error) {
                console.error("Erro ao enviar palpite:", error);
                alert("Erro ao registrar seu palpite. Tente novamente.");
            }
        });
        btnEnviarPalpite.dataset.listenerAttached = 'true';
    }
}

function getPalpiteRankingData() { 
    const counts = {};
    usuariosSimulados.filter(u => u.palpite).forEach(u => {
        counts[u.palpite] = (counts[u.palpite] || 0) + 1;
    });
    return Object.entries(counts)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => {
            if (b.count === a.count) return new Date(a.date) - new Date(b.date);
            return b.count - a.count;
        });
}

function renderPalpiteRanking() {
    const palpiteRankingDiv = document.getElementById('palpite-ranking');
    if (!palpiteRankingDiv) return;
    const rankingData = getPalpiteRankingData();
    if (rankingData.length === 0) {
        palpiteRankingDiv.innerHTML = '<p class="text-sm text-slate-500">Nenhum palpite ainda.</p>';
        return;
    }
    palpiteRankingDiv.innerHTML = rankingData.map((item, index) => `
        <div class="flex justify-between items-center p-1.5 rounded ${index < 3 ? 'bg-blue-50' : ''}">
            <span>${index + 1}. ${formatDate(item.date + 'T00:00:00')}</span>
            <span class="font-semibold text-blue-600">${item.count} voto(s)</span>
        </div>
    `).join('');
}

let countdownIntervals = {};
function renderCountdownTimers() {
    const countdownTimersDiv = document.getElementById('countdown-timers');
    if (!countdownTimersDiv) return;
    const rankingData = getPalpiteRankingData();
    const top3 = rankingData.slice(0, 3);
    Object.values(countdownIntervals).forEach(clearInterval);
    countdownIntervals = {};
    if (top3.length === 0) {
        countdownTimersDiv.innerHTML = '<p class="text-sm text-slate-500">Aguardando mais palpites para o Top 3...</p>';
        return;
    }
    countdownTimersDiv.innerHTML = top3.map((item, index) => `
        <div class="p-3 rounded-lg border border-slate-200">
            <p class="font-semibold text-slate-700 mb-1">
                Top ${index + 1}: ${formatDate(item.date + 'T00:00:00')} (${item.count} votos)
            </p>
            <div id="countdown-${item.date.replace(/\//g, '-')}" class="flex space-x-2 text-sm"></div>
        </div>
    `).join('');
    top3.forEach(item => {
        updateCountdownDisplay(item.date);
        countdownIntervals[item.date] = setInterval(() => updateCountdownDisplay(item.date), 1000);
    });
}

function updateCountdownDisplay(dateString) {
    const countdownElement = document.getElementById(`countdown-${dateString.replace(/\//g, '-')}`);
    if (!countdownElement) return;
    const targetDate = new Date(dateString + 'T00:00:00').getTime();
    const now = new Date().getTime();
    const difference = targetDate - now;
    if (difference <= 0) {
        countdownElement.innerHTML = '<span class="text-green-600 font-semibold">Data alcançada ou ultrapassada!</span>';
        if (countdownIntervals[dateString]) clearInterval(countdownIntervals[dateString]);
        return;
    }
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);
    countdownElement.innerHTML = `
        <div class="countdown-item"><strong>${days}</strong><span class="block text-xs">Dias</span></div>
        <div class="countdown-item"><strong>${hours}</strong><span class="block text-xs">Horas</span></div>
        <div class="countdown-item"><strong>${minutes}</strong><span class="block text-xs">Min</span></div>
        <div class="countdown-item"><strong>${seconds}</strong><span class="block text-xs">Seg</span></div>
    `;
}

// --- LÓGICA DE ENQUETE (SEÇÃO ENQUETE) ---
function renderEnqueteOptions() {
    const enqueteOpcoesDiv = document.getElementById('enquete-opcoes');
    if (!enqueteOpcoesDiv) return;
    enqueteOpcoesDiv.innerHTML = enqueteOptions.map(opt => `
        <label class="radio-label">
            <input type="radio" name="enquete-voto" value="${opt}">
            <span>${opt}</span>
        </label>
    `).join('');
}

function setupEnqueteForm() {
    const btnVotarEnquete = document.getElementById('btn-votar-enquete');
    if (!btnVotarEnquete) return;

    if (btnVotarEnquete.dataset.listenerAttached !== 'true') {
        btnVotarEnquete.addEventListener('click', async () => {
            if (!currentUser) {
                alert("Você precisa se identificar para votar na enquete.");
                return;
            }
            const selectedOption = document.querySelector('input[name="enquete-voto"]:checked');
            if (!selectedOption) {
                alert("Por favor, selecione uma opção na enquete.");
                return;
            }
            const voto = selectedOption.value;
            try {
                // SIMULAÇÃO:
                enquetesSimuladas.push({ idUsuario: currentUser.id, voto: voto, timestampz: new Date().toISOString() });
                // PRODUÇÃO: await addEnqueteVote(currentUser.id, voto);
                alert("Seu voto foi registrado (simulado)!");
                renderEnqueteChart();
            } catch (error) {
                console.error("Erro ao registrar voto na enquete:", error);
                alert("Erro ao registrar seu voto. Tente novamente.");
            }
        });
        btnVotarEnquete.dataset.listenerAttached = 'true';
    }
}

function renderEnqueteChart() {
    const enqueteChartCanvas = document.getElementById('enquete-chart');
    if (!enqueteChartCanvas) return;
    const ctx = enqueteChartCanvas.getContext('2d');
    const voteCounts = enqueteOptions.reduce((acc, opt) => ({ ...acc, [opt]: 0 }), {});
    enquetesSimuladas.forEach(e => { if (voteCounts[e.voto] !== undefined) voteCounts[e.voto]++; });

    if (enqueteChartInstance) enqueteChartInstance.destroy();
    const noDataMessageId = 'enquete-no-data-message';
    let noDataMessageEl = document.getElementById(noDataMessageId);
    if (!noDataMessageEl && enqueteChartCanvas.parentNode) { // Cria se não existir
        noDataMessageEl = document.createElement('p');
        noDataMessageEl.id = noDataMessageId;
        noDataMessageEl.className = 'text-sm text-slate-500 text-center mt-4';
        enqueteChartCanvas.parentNode.insertBefore(noDataMessageEl, enqueteChartCanvas.nextSibling);
    }

    if (enquetesSimuladas.length === 0) {
        enqueteChartCanvas.style.display = 'none';
        if (noDataMessageEl) {
            noDataMessageEl.textContent = 'Nenhum voto na enquete ainda.';
            noDataMessageEl.style.display = 'block';
        }
    } else {
        enqueteChartCanvas.style.display = 'block';
        if (noDataMessageEl) noDataMessageEl.style.display = 'none';
    }

    enqueteChartInstance = new Chart(ctx, { /* ... (configurações do gráfico como antes) ... */ 
        type: 'doughnut',
        data: {
            labels: enqueteOptions,
            datasets: [{
                label: 'Votos da Enquete',
                data: enqueteOptions.map(opt => voteCounts[opt]),
                backgroundColor: ['#34d399', '#60a5fa', '#fbbf24', '#f87171', '#94a3b8'],
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { padding: 15, font: { size: 12 } } },
                tooltip: { callbacks: { label: (context) => `${context.label || ''}: ${context.parsed || 0} voto(s)` } }
            }
        }
    });
}

// --- LÓGICA DE MENSAGENS (SEÇÃO MURAL) ---
function setupMensagemForm() {
    const mensagemTextInput = document.getElementById('mensagem-text');
    const btnEnviarMensagem = document.getElementById('btn-enviar-mensagem');
    if (!mensagemTextInput || !btnEnviarMensagem) return;

    if (btnEnviarMensagem.dataset.listenerAttached !== 'true') {
        btnEnviarMensagem.addEventListener('click', async () => {
            if (!currentUser) {
                alert("Você precisa se identificar para enviar uma mensagem.");
                return;
            }
            const texto = mensagemTextInput.value.trim();
            if (!texto) {
                alert("Por favor, escreva uma mensagem.");
                return;
            }
            try {
                // SIMULAÇÃO:
                mensagensSimuladas.push({ idUsuario: currentUser.id, mensagem: texto, timestampz: new Date().toISOString() });
                // PRODUÇÃO: await addMensagem(currentUser.id, texto);
                mensagemTextInput.value = '';
                renderMensagens();
            } catch (error) {
                console.error("Erro ao enviar mensagem:", error);
                alert("Erro ao enviar sua mensagem. Tente novamente.");
            }
        });
        btnEnviarMensagem.dataset.listenerAttached = 'true';
    }
}

function renderMensagens() {
    const mensagensDisplayDiv = document.getElementById('mensagens-display');
    if (!mensagensDisplayDiv) return;
    if (mensagensSimuladas.length === 0) {
        mensagensDisplayDiv.innerHTML = '<p class="text-sm text-slate-500">Nenhuma mensagem ainda. Seja o primeiro!</p>';
        return;
    }
    mensagensDisplayDiv.innerHTML = mensagensSimuladas.map(msg => {
        const user = usuariosSimulados.find(u => u.id === msg.idUsuario);
        const nomeAutor = user ? user.nome : "Desconhecido";
        const isMyMsg = currentUser && msg.idUsuario === currentUser.id;
        const time = formatTime(msg.timestampz);
        return `
            <div class="message ${isMyMsg ? 'my-message' : 'other-message'}">
                <p class="text-sm break-words">${escapeHTML(msg.mensagem)}</p>
                <p class="text-xs ${isMyMsg ? 'text-blue-700' : 'text-slate-500'} text-right mt-1">
                    <strong>${escapeHTML(nomeAutor)}</strong> - ${time}
                </p>
            </div>
        `;
    }).join('');
    mensagensDisplayDiv.scrollTop = mensagensDisplayDiv.scrollHeight;
}

// Função para escapar HTML e prevenir XSS simples
function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, function (match) {
        return {
            '&': '&',
            '<': '<',
            '>': '>',
            '"': '"',
            "'": '&#39;'
        }[match];
    });
}
