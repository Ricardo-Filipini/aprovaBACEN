// Variáveis globais para o estado da aplicação interativa
let currentUser = null; // { id: number, nome: string, palpite: string | null }
let usuariosSimulados = [
    { id: 0, nome: "Anônimo", palpite: null }
];
let enquetesSimuladas = []; // { idUsuario: number, voto: string, timestampz: string }
let mensagensSimuladas = []; // { idUsuario: number, mensagem: string, timestampz: string }
let nextUserIdSimulado = 1;
let enqueteChartInstance = null;
const enqueteOptions = ['Super Otimista', 'Otimista', 'Realista', 'Pessimista', 'Mar céu lar'];

// --- INICIALIZAÇÃO DAS SEÇÕES ---
function initInicioSection() {
    console.log('Inicializando scripts da Seção Início...');
    setupUserIdentification();
    // Se houver outros elementos na seção 'inicio' que precisam de JS, adicione aqui.
}

function initPalpitesSection() {
    console.log('Inicializando scripts da Seção Palpites...');
    if (!currentUser) {
        console.warn("Usuário não identificado. Funcionalidades de palpite limitadas.");
        // Poderia desabilitar inputs ou mostrar mensagem
    }
    setupPalpiteForm();
    renderPalpiteRanking();
    renderCountdownTimers();
}

function initEnqueteSection() {
    console.log('Inicializando scripts da Seção Enquete...');
    if (!currentUser) {
        console.warn("Usuário não identificado. Funcionalidades de enquete limitadas.");
    }
    renderEnqueteOptions();
    setupEnqueteForm();
    renderEnqueteChart();
}

function initMuralSection() {
    console.log('Inicializando scripts da Seção Mural...');
    if (!currentUser) {
        console.warn("Usuário não identificado. Funcionalidades de mural limitadas.");
    }
    setupMensagemForm();
    renderMensagens();
}

// --- LÓGICA DE IDENTIFICAÇÃO DO USUÁRIO (SEÇÃO INÍCIO) ---
function setupUserIdentification() {
    const nomeUsuarioInput = document.getElementById('nome-usuario');
    const btnEntrar = document.getElementById('btn-entrar');
    const btnAnonimo = document.getElementById('btn-anonimo');
    const userSection = document.getElementById('user-section-card'); // O card de identificação
    const infographicContent = document.getElementById('infographic-main-content'); // Conteúdo principal que aparece após login
    const welcomeMessage = document.getElementById('welcome-user-message'); // Onde mostrar "Bem-vindo NOME"

    if (!nomeUsuarioInput || !btnEntrar || !btnAnonimo || !userSection || !infographicContent || !welcomeMessage) {
        console.warn("Elementos de identificação não encontrados na seção 'inicio.html'.");
        return;
    }

    btnEntrar.addEventListener('click', handleUserLogin);
    nomeUsuarioInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') handleUserLogin();
    });
    btnAnonimo.addEventListener('click', handleAnonymousLogin);

    async function handleUserLogin() {
        const nome = nomeUsuarioInput.value.trim();
        if (!nome) {
            alert("Por favor, digite um nome ou escolha ser anônimo.");
            return;
        }
        try {
            // PRODUÇÃO: const result = await checkOrAddUser(nome);
            // SIMULAÇÃO:
            let user = usuariosSimulados.find(u => u.nome.toLowerCase() === nome.toLowerCase() && u.id !== 0);
            if (!user) {
                user = { id: nextUserIdSimulado++, nome: nome, palpite: null };
                usuariosSimulados.push(user);
            }
            const result = { user: user }; // Fim da simulação
            
            setCurrentUser(result.user);
        } catch (error) {
            console.error("Erro ao logar/cadastrar usuário:", error);
            alert("Erro ao tentar identificar usuário. Tente novamente.");
        }
    }

    async function handleAnonymousLogin() {
        try {
            // PRODUÇÃO: const result = await checkOrAddUser("Anônimo");
            // SIMULAÇÃO:
            let user = usuariosSimulados.find(u => u.id === 0);
            if (!user) { // Garante que o anônimo exista na simulação
                user = { id: 0, nome: "Anônimo", palpite: null };
                usuariosSimulados.unshift(user); // Adiciona no início se não existir
            }
            const result = { user: user }; // Fim da simulação
            setCurrentUser(result.user);
        } catch (error) {
            console.error("Erro ao logar como anônimo:", error);
            alert("Erro ao tentar continuar como anônimo. Tente novamente.");
        }
    }

    function setCurrentUser(user) {
        currentUser = user;
        if (userSection) userSection.classList.add('hidden');
        if (infographicContent) infographicContent.classList.remove('hidden');
        if (welcomeMessage) welcomeMessage.innerHTML = `Bem-vindo(a), <span class="text-blue-600 font-semibold">${currentUser.nome}</span>!`;
        
        // Após identificar, recarrega as seções que dependem do usuário, se já estiverem visíveis
        // ou garante que os dados corretos sejam mostrados se o usuário navegar para elas.
        // Isso é mais complexo em um SPA real. Por ora, vamos focar em ter o currentUser.
        // Se uma seção já estiver carregada e precisar ser atualizada:
        if (document.getElementById('palpite-date')) initPalpitesSection(); // Re-init para refletir palpite
        if (document.getElementById('enquete-chart')) initEnqueteSection(); // Re-init para refletir votos
        if (document.getElementById('mensagens-display')) initMuralSection(); // Re-init para destacar mensagens
    }
}


// --- LÓGICA DE PALPITES (SEÇÃO PALPITES) ---
function setupPalpiteForm() {
    const palpiteDateInput = document.getElementById('palpite-date');
    const btnEnviarPalpite = document.getElementById('btn-enviar-palpite');

    if (!palpiteDateInput || !btnEnviarPalpite) {
        console.warn("Elementos do formulário de palpite não encontrados.");
        return;
    }
    
    // Define data mínima para hoje
    const today = new Date().toISOString().split('T')[0];
    palpiteDateInput.setAttribute('min', today);

    // Reflete palpite existente do usuário
    if (currentUser && currentUser.palpite) {
        palpiteDateInput.value = currentUser.palpite;
    } else {
        palpiteDateInput.value = '';
    }

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
            // PRODUÇÃO: await updateUserPalpite(currentUser.id, palpiteDate);
            // SIMULAÇÃO:
            const userIndex = usuariosSimulados.findIndex(u => u.id === currentUser.id);
            if (userIndex !== -1) {
                usuariosSimulados[userIndex].palpite = palpiteDate;
                currentUser.palpite = palpiteDate;
            } // Fim da simulação
            
            alert("Seu palpite foi registrado!");
            renderPalpiteRanking();
            renderCountdownTimers();
        } catch (error) {
            console.error("Erro ao enviar palpite:", error);
            alert("Erro ao registrar seu palpite. Tente novamente.");
        }
    });
}

function getPalpiteRankingData() { // Simulado
    const counts = {};
    usuariosSimulados.filter(u => u.palpite).forEach(u => {
        counts[u.palpite] = (counts[u.palpite] || 0) + 1;
    });
    return Object.entries(counts)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => {
            if (b.count === a.count) {
                return new Date(a.date) - new Date(b.date);
            }
            return b.count - a.count;
        });
}

function renderPalpiteRanking() {
    const palpiteRankingDiv = document.getElementById('palpite-ranking');
    if (!palpiteRankingDiv) return;

    const rankingData = getPalpiteRankingData(); // Simulado
    // PRODUÇÃO: Deveria buscar de `await getAllUsers()` e processar.

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

    const rankingData = getPalpiteRankingData(); // Simulado
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
            <div id="countdown-${item.date}" class="flex space-x-2 text-sm"></div>
        </div>
    `).join('');
    
    top3.forEach(item => {
        updateCountdownDisplay(item.date);
        countdownIntervals[item.date] = setInterval(() => updateCountdownDisplay(item.date), 1000);
    });
}

function updateCountdownDisplay(dateString) {
    const countdownElement = document.getElementById(`countdown-${dateString}`);
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
            // PRODUÇÃO: await addEnqueteVote(currentUser.id, voto);
            // SIMULAÇÃO:
            enquetesSimuladas.push({
                idUsuario: currentUser.id,
                voto: voto,
                timestampz: new Date().toISOString()
            }); // Fim da simulação
            
            alert("Seu voto foi registrado!");
            renderEnqueteChart();
        } catch (error) {
            console.error("Erro ao registrar voto na enquete:", error);
            alert("Erro ao registrar seu voto. Tente novamente.");
        }
    });
}

function renderEnqueteChart() {
    const enqueteChartCanvas = document.getElementById('enquete-chart');
    if (!enqueteChartCanvas) return;
    const ctx = enqueteChartCanvas.getContext('2d');

    // PRODUÇÃO: Deveria buscar de `await getAllEnqueteVotes()` e processar.
    // SIMULAÇÃO:
    const voteCounts = enqueteOptions.reduce((acc, opt) => ({ ...acc, [opt]: 0 }), {});
    enquetesSimuladas.forEach(e => {
        if (voteCounts[e.voto] !== undefined) voteCounts[e.voto]++;
    }); // Fim da simulação

    if (enqueteChartInstance) enqueteChartInstance.destroy();

    const noDataMessageId = 'enquete-no-data-message';
    let noDataMessageEl = document.getElementById(noDataMessageId);

    if (Object.values(voteCounts).every(count => count === 0) && enquetesSimuladas.length === 0) { // Ajuste para simulação
        enqueteChartCanvas.style.display = 'none';
        if (!noDataMessageEl) {
            noDataMessageEl = document.createElement('p');
            noDataMessageEl.id = noDataMessageId;
            noDataMessageEl.textContent = 'Nenhum voto na enquete ainda.';
            noDataMessageEl.className = 'text-sm text-slate-500 text-center mt-4';
            enqueteChartCanvas.parentNode.insertBefore(noDataMessageEl, enqueteChartCanvas.nextSibling);
        }
        noDataMessageEl.style.display = 'block';
    } else {
        enqueteChartCanvas.style.display = 'block';
        if (noDataMessageEl) noDataMessageEl.style.display = 'none';
    }

    enqueteChartInstance = new Chart(ctx, {
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
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.label || ''}: ${context.parsed || 0} voto(s)`
                    }
                }
            }
        }
    });
}

// --- LÓGICA DE MENSAGENS (SEÇÃO MURAL) ---
function setupMensagemForm() {
    const mensagemTextInput = document.getElementById('mensagem-text');
    const btnEnviarMensagem = document.getElementById('btn-enviar-mensagem');
    if (!mensagemTextInput || !btnEnviarMensagem) return;

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
            // PRODUÇÃO: await addMensagem(currentUser.id, texto);
            // SIMULAÇÃO:
            mensagensSimuladas.push({
                idUsuario: currentUser.id,
                mensagem: texto,
                timestampz: new Date().toISOString()
            }); // Fim da simulação
            
            mensagemTextInput.value = '';
            renderMensagens();
        } catch (error) {
            console.error("Erro ao enviar mensagem:", error);
            alert("Erro ao enviar sua mensagem. Tente novamente.");
        }
    });
}

function renderMensagens() {
    const mensagensDisplayDiv = document.getElementById('mensagens-display');
    if (!mensagensDisplayDiv) return;

    // PRODUÇÃO: Deveria buscar de `await getAllMensagens()` e `await getAllUsers()` para nomes.
    // SIMULAÇÃO:
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
                <p class="text-sm break-words">${msg.mensagem}</p>
                <p class="text-xs ${isMyMsg ? 'text-blue-700' : 'text-slate-500'} text-right mt-1">
                    <strong>${nomeAutor}</strong> - ${time}
                </p>
            </div>
        `;
    }).join('');
    mensagensDisplayDiv.scrollTop = mensagensDisplayDiv.scrollHeight;
}

// --- Lógica para seções adaptadas (ex: Motivos) ---
function initMotivosSection() {
    console.log('Inicializando scripts da Seção Motivos...');
    // A lógica de carregamento de motivos do seu Index.html original pode ser movida/adaptada aqui
    // Exemplo:
    // const loadMoreReasonsButton = document.getElementById('loadMoreReasons');
    // if (loadMoreReasonsButton) {
    //     loadMoreReasonsButton.addEventListener('click', loadMoreReasonsFunction);
    //     loadInitialReasonsFunction(); // Para carregar os primeiros
    // }
}
