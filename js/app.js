// js/app.js

const SUPABASE_URL = "https://nrmkbqbuuytwiuweedfy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ybWticWJ1dXl0d2l1d2VlZGZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0MzgwODAsImV4cCI6MjA2NDAxNDA4MH0.r-J894pdUHE3uqwhBJIj5_jRR1ZKHwTDIfLWS7VNYK8";

let supabaseClient; 
let currentUser = { id: 0, name: 'Anônimo', palpite: null }; 

// --- Declarações de Elementos Globais da UI ---
let authWidgetContainer, enqueteOptionsArea, muralPostArea, rankingDisplayArea, top3CountdownArea, enqueteChartCanvas;
let enqueteChartInstance = null;

const OPCOES_ENQUETE = [
    { label: 'Super Otimista', value: 'Super Otimista', icon: '😊' },
    { label: 'Otimista', value: 'Otimista', icon: '🙂' },
    { label: 'Realista', value: 'Realista', icon: '😐' },
    { label: 'Pessimista', value: 'Pessimista', icon: '😟' },
    { label: 'Mar céu lar', value: 'Mar céu lar', icon: '🌊' }
];
const palpiteCountdownIntervals = {}; 
let muralMensagensDisplay;


// --- Funções de Atualização da UI (Definidas antes de initializeApp) ---

function updateUserPalpiteWidget() {
    const palpiteWidget = document.getElementById('user-palpite-widget');
    const palpiteDateDisplay = document.getElementById('user-palpite-date-display');

    if (!palpiteWidget || !palpiteDateDisplay) return;

    if (currentUser.id !== 0 && currentUser.palpite) {
        const date = new Date(currentUser.palpite);
        date.setUTCDate(date.getUTCDate() + 1);
        palpiteDateDisplay.textContent = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year:'2-digit' }); 
        palpiteWidget.style.display = 'flex';
    } else if (currentUser.id !== 0 && !currentUser.palpite) {
        palpiteDateDisplay.textContent = 'Palpite?'; 
        palpiteWidget.style.display = 'flex';
    }
    else {
        palpiteWidget.style.display = 'none';
    }
}

async function updateEnqueteSection() {
    if (!enqueteOptionsArea) {
        console.error("Elemento enqueteOptionsArea não encontrado.");
        return;
    }
    enqueteOptionsArea.innerHTML = '';
    
    if (currentUser.id === 0) {
        enqueteOptionsArea.innerHTML = `
            <p class="text-sm text-gray-600 mb-2 text-center">Identifique-se para votar:</p>
            <div class="flex flex-wrap justify-center gap-2">
                ${OPCOES_ENQUETE.map(opcao => `
                    <button class="enquete-icon-button-disabled p-2 border rounded-lg text-2xl md:text-3xl cursor-pointer hover:bg-gray-200" title="${opcao.label}">
                        ${opcao.icon}
                    </button>
                `).join('')}
            </div>
        `;
        document.querySelectorAll('.enquete-icon-button-disabled').forEach(button => {
            button.addEventListener('click', toggleAuthModal);
        });
        return; 
    }
    
    const userVote = await checkIfUserVoted(currentUser.id);

    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'flex flex-wrap justify-center gap-2 md:gap-3';

    OPCOES_ENQUETE.forEach(opcao => { 
        const button = document.createElement('button');
        button.className = `enquete-icon-button p-2 md:p-3 border rounded-lg text-2xl md:text-3xl transition-all duration-200 hover:shadow-lg`;
        if (opcao.value === userVote) {
            button.classList.add('bg-purple-600', 'text-white', 'ring-2', 'ring-purple-700', 'ring-offset-2');
        } else {
            button.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-purple-200');
        }
        button.title = opcao.label;
        button.textContent = opcao.icon;
        button.addEventListener('click', () => handleSubmitEnqueteVoto(opcao.value));
        optionsContainer.appendChild(button);
    });
    enqueteOptionsArea.appendChild(optionsContainer);
    if (userVote) {
            enqueteOptionsArea.innerHTML += `<p class="text-center text-xs text-gray-600 mt-3">Seu voto: <span class="font-semibold">${userVote}</span>. Clique em outra opção para mudar.</p>`;
    } else {
        enqueteOptionsArea.innerHTML += `<p class="text-center text-xs text-gray-600 mt-3">Escolha uma opção para registrar seu sentimento!</p>`;
    }
}

function updateMuralSection() {
    if (!muralPostArea) {
        console.warn("Elemento muralPostArea não encontrado ao tentar atualizar.");
        return;
    }
    muralPostArea.innerHTML = ''; 
    muralPostArea.innerHTML = `
        <textarea id="mural-message-input" rows="3" placeholder="Sua mensagem de otimismo (ou não)..." class="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 text-sm"></textarea>
        <button id="submit-mural-message-btn" class="mt-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-4 rounded-md text-sm">Enviar Mensagem</button>
    `;
    const submitMsgBtn = document.getElementById('submit-mural-message-btn');
    if(submitMsgBtn) submitMsgBtn.addEventListener('click', handleSubmitMuralMessage);
}


// --- Inicialização e Funções Principais ---
document.addEventListener('DOMContentLoaded', () => {
    authWidgetContainer = document.getElementById('auth-widget-container');
    enqueteOptionsArea = document.getElementById('enquete-options-area');
    muralPostArea = document.getElementById('mural-post-area');
    rankingDisplayArea = document.getElementById('ranking-display-area');
    top3CountdownArea = document.getElementById('top3-countdown-area');
    enqueteChartCanvas = document.getElementById('enqueteChart');
    muralMensagensDisplay = document.getElementById('mural-mensagens-display');


    if (typeof ChartDataLabels !== 'undefined') {
        Chart.register(ChartDataLabels);
    } else {
        console.warn('ChartDataLabels plugin não encontrado.');
    }

    if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); 
        console.log('Supabase client instance inicializada.');
        initializeApp();
    } else {
        console.error('Supabase SDK não encontrado ou createClient não é uma função.');
        const body = document.querySelector('body');
        const errorDiv = document.createElement('div');
        errorDiv.style.backgroundColor = 'red';
        errorDiv.style.color = 'white';
        errorDiv.style.padding = '10px';
        errorDiv.style.textAlign = 'center';
        errorDiv.style.position = 'fixed';
        errorDiv.style.top = '0';
        errorDiv.style.left = '0';
        errorDiv.style.width = '100%';
        errorDiv.style.zIndex = '9999';
        errorDiv.textContent = 'Erro crítico: Não foi possível carregar o SDK do banco de dados.';
        if (body) {
            body.prepend(errorDiv);
        }
    }
});

function initializeApp() {
    console.log('Aplicativo inicializado e pronto para interagir com Supabase.');
    setupAuthElements(); 
    loadUsersForDropdown();
    
    loadPalpites(); 
    loadMensagens(); 
    
    // Atualizar UI após carregar dados essenciais
    updateUserPalpiteWidget(); 
    updateEnqueteSection(); // Renderiza os botões de voto
    loadEnqueteResults(); // Carrega e renderiza o gráfico da enquete
    updateMuralSection(); 
}


function setupAuthElements() {
    if (!authWidgetContainer) {
        console.error("Elemento auth-widget-container não encontrado.");
        return;
    }
    authWidgetContainer.innerHTML = ''; 

    const mainButtonContainer = document.createElement('div');
    mainButtonContainer.className = 'flex flex-col items-end space-y-2'; 

    const authButton = document.createElement('button');
    authButton.className = 'bg-white text-blue-700 py-2 px-4 rounded-full shadow-lg hover:bg-blue-100 transition-all duration-300 flex items-center text-base'; 
    
    const userIcon = document.createElement('span');
    userIcon.className = 'mr-2 text-xl'; 
    userIcon.textContent = '👤'; 

    const userNameSpan = document.createElement('span');
    userNameSpan.id = 'auth-username';
    userNameSpan.textContent = currentUser.name; 

    authButton.appendChild(userIcon);
    authButton.appendChild(userNameSpan);
    authButton.addEventListener('click', toggleAuthModal);
    mainButtonContainer.appendChild(authButton);

    const palpiteWidget = document.createElement('div');
    palpiteWidget.id = 'user-palpite-widget';
    palpiteWidget.className = 'text-sm text-gray-800 bg-white py-2 px-3 rounded-full shadow-lg hover:bg-gray-100 cursor-pointer flex items-center'; 
    palpiteWidget.style.display = 'none'; 
    palpiteWidget.innerHTML = `
        <span class="mr-2 text-lg">📅</span> 
        <span id="user-palpite-date-display" class="font-medium"></span>
    `;
    palpiteWidget.addEventListener('click', togglePalpiteModal);
    mainButtonContainer.appendChild(palpiteWidget);
    
    authWidgetContainer.appendChild(mainButtonContainer);

    let authModal = document.getElementById('auth-modal');
    if (!authModal) {
        authModal = document.createElement('div');
        authModal.id = 'auth-modal';
        authModal.className = 'fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 hidden p-4';
        document.body.appendChild(authModal);
    }
    authModal.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-semibold text-gray-700">Identificação</h2>
                <button id="close-auth-modal" class="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>
            <div class="mb-4">
                <label for="user-select" class="block text-sm font-medium text-gray-700 mb-1">Selecionar Usuário:</label>
                <select id="user-select" class="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="0">Anônimo</option>
                </select>
            </div>
            <div class="mb-4">
                <label for="new-user-name" class="block text-sm font-medium text-gray-700 mb-1">Ou Cadastrar Novo:</label>
                <input type="text" id="new-user-name" placeholder="Seu nome aqui" class="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
            </div>
            <div class="flex justify-end space-x-3">
                <button id="login-button" class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition-colors">Entrar / Cadastrar</button>
            </div>
        </div>
    `;
    document.getElementById('close-auth-modal').addEventListener('click', toggleAuthModal);
    document.getElementById('login-button').addEventListener('click', handleLoginRegister);
    authModal.addEventListener('click', (e) => { if (e.target.id === 'auth-modal') toggleAuthModal(); });

    let palpiteModal = document.getElementById('palpite-modal');
    if(!palpiteModal) {
        palpiteModal = document.createElement('div');
        palpiteModal.id = 'palpite-modal';
        palpiteModal.className = 'fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 hidden p-4';
        document.body.appendChild(palpiteModal);
    }
    palpiteModal.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow-xl w-full max-w-xs">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-semibold text-gray-700">Seu Palpite</h2>
                <button id="close-palpite-modal" class="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>
            <div class="mb-4">
                <label for="palpite-date-input" class="block text-sm font-medium text-gray-700 mb-1">Data da Divulgação:</label>
                <input type="date" id="palpite-date-input" class="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
            </div>
            <div id="palpite-modal-actions" class="flex justify-end space-x-3">
                </div>
        </div>
    `;
    document.getElementById('close-palpite-modal').addEventListener('click', togglePalpiteModal);
    palpiteModal.addEventListener('click', (e) => { if (e.target.id === 'palpite-modal') togglePalpiteModal(); });
    updateUserPalpiteWidget(); 
}

function toggleAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.classList.toggle('hidden');
        if (!modal.classList.contains('hidden')) {
            loadUsersForDropdown(); 
            const newUserInput = document.getElementById('new-user-name');
            if (newUserInput) newUserInput.value = '';
        }
    }
}

function togglePalpiteModal() {
    if (currentUser.id === 0) {
        alert("Identifique-se para gerenciar seu palpite.");
        toggleAuthModal(); 
        return;
    }
    const modal = document.getElementById('palpite-modal');
    if (modal) {
        modal.classList.toggle('hidden');
        if (!modal.classList.contains('hidden')) {
            const palpiteDateInput = document.getElementById('palpite-date-input');
            if (currentUser.palpite) {
                const date = new Date(currentUser.palpite);
                const year = date.getUTCFullYear();
                const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                const day = String(date.getUTCDate()).padStart(2, '0');
                palpiteDateInput.value = `${year}-${month}-${day}`;
            } else {
                palpiteDateInput.value = '';
            }
            renderPalpiteModalActions();
        }
    }
}

function renderPalpiteModalActions() {
    const actionsContainer = document.getElementById('palpite-modal-actions');
    if (!actionsContainer) return;
    actionsContainer.innerHTML = '';

    const saveButton = document.createElement('button');
    saveButton.id = 'save-palpite-btn';
    saveButton.className = 'bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md text-sm';
    saveButton.textContent = currentUser.palpite ? 'Atualizar Palpite' : 'Salvar Palpite';
    saveButton.addEventListener('click', handleSubmitPalpite);
    actionsContainer.appendChild(saveButton);

    if (currentUser.palpite) {
        const removeButton = document.createElement('button');
        removeButton.id = 'remove-palpite-modal-btn';
        removeButton.className = 'bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-md text-sm';
        removeButton.textContent = 'Remover';
        removeButton.addEventListener('click', handleRemovePalpite);
        actionsContainer.appendChild(removeButton);
    }
}


async function loadUsersForDropdown() {
    if (!supabaseClient) return; 
    try {
        const { data: users, error } = await supabaseClient.from('user').select('id, name').order('name', { ascending: true }); 
        if (error) throw error;

        const userSelect = document.getElementById('user-select');
        if (!userSelect) return;

        const previouslySelectedUserId = userSelect.value;
        
        Array.from(userSelect.options).forEach(option => {
            if (option.value !== "0") {
                userSelect.remove(option.index);
            }
        });

        users.forEach(user => {
            if (user.id !== 0) { 
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = user.name; 
                userSelect.appendChild(option);
            }
        });

        if (currentUser.id !== 0 && Array.from(userSelect.options).some(opt => opt.value == currentUser.id)) {
             userSelect.value = currentUser.id;
        } else if (previouslySelectedUserId && Array.from(userSelect.options).some(opt => opt.value == previouslySelectedUserId)) {
            userSelect.value = previouslySelectedUserId;
        } else {
            userSelect.value = "0"; 
        }

    } catch (error) {
        console.error('Erro ao carregar usuários:', error.message);
    }
}

async function handleLoginRegister() {
    const selectedUserId = document.getElementById('user-select').value;
    const newUserName = document.getElementById('new-user-name').value.trim();

    if (newUserName) {
        try {
            const { data: existingUser, error: checkError } = await supabaseClient 
                .from('user')
                .select('id, name') 
                .eq('name', newUserName) 
                .single();

            if (checkError && checkError.code !== 'PGRST116') { 
                throw checkError;
            }

            if (existingUser) {
                alert('Este nome de usuário já existe. Por favor, escolha outro ou selecione na lista.');
                return;
            }

            const { data, error } = await supabaseClient 
                .from('user')
                .insert([{ name: newUserName }]) 
                .select()
                .single();
            
            if (error) throw error;

            if (data) {
                currentUser = { id: data.id, name: data.name, palpite: data.palpite }; 
                alert(`Usuário ${data.name} cadastrado com sucesso!`); 
            }
        } catch (error) {
            console.error('Erro ao registrar novo usuário:', error.message);
            alert('Falha ao registrar. Tente novamente.');
            return;
        }
    } else if (selectedUserId) { 
        try {
            const { data, error } = await supabaseClient 
                .from('user')
                .select('id, name, palpite') 
                .eq('id', selectedUserId)
                .single();

            if (error) throw error;
            if (data) {
                currentUser = { id: data.id, name: data.name, palpite: data.palpite }; 
            } else if (selectedUserId === "0") { 
                 currentUser = { id: 0, name: 'Anônimo', palpite: null }; 
                 console.warn("Usuário anônimo (ID 0) não encontrado no banco. Usando default local.");
            }
        } catch (error) {
            console.error('Erro ao buscar usuário:', error.message);
            currentUser = { id: 0, name: 'Anônimo', palpite: null }; 
        }
    }

    const authUsernameSpan = document.getElementById('auth-username');
    if (authUsernameSpan) authUsernameSpan.textContent = currentUser.name; 
    
    toggleAuthModal();
    console.log('Usuário atual:', currentUser);

    updateUserPalpiteWidget(); 
    updateEnqueteSection(); 
    updateMuralSection();
    loadPalpites(); 
    loadMensagens(); 
}

async function handleSubmitPalpite() { 
    if (currentUser.id === 0) {
        alert('Você precisa estar identificado para registrar um palpite.');
        togglePalpiteModal(); 
        toggleAuthModal(); 
        return;
    }

    const palpiteDateInput = document.getElementById('palpite-date-input');
    if (!palpiteDateInput || !palpiteDateInput.value) {
        alert('Por favor, selecione uma data para o seu palpite.');
        return;
    }
    const palpiteDate = palpiteDateInput.value; 

    try {
        const { data, error } = await supabaseClient 
            .from('user')
            .update({ palpite: palpiteDate })
            .eq('id', currentUser.id)
            .select()
            .single();

        if (error) throw error;

        if (data) {
            currentUser.palpite = data.palpite;
            alert('Palpite registrado/atualizado com sucesso!');
            updateUserPalpiteWidget();
            loadPalpites(); 
            togglePalpiteModal(); 
        }
    } catch (error) {
        console.error('Erro ao registrar palpite:', error.message);
        alert('Falha ao registrar o palpite. Tente novamente.');
    }
}

async function handleRemovePalpite() { 
    if (currentUser.id === 0 || !currentUser.palpite) return;

    if (!confirm('Tem certeza que deseja remover seu palpite?')) {
        return;
    }

    try {
        const { data, error } = await supabaseClient 
            .from('user')
            .update({ palpite: null })
            .eq('id', currentUser.id)
            .select()
            .single();

        if (error) throw error;

        currentUser.palpite = null;
        alert('Palpite removido com sucesso.');
        updateUserPalpiteWidget();
        loadPalpites(); 
        togglePalpiteModal(); 
    } catch (error) {
        console.error('Erro ao remover palpite:', error.message);
        alert('Falha ao remover o palpite. Tente novamente.');
    }
}

async function loadPalpites() {
    if (!supabaseClient) { 
        console.warn("Supabase client não inicializado ao tentar carregar palpites.");
        if(rankingDisplayArea) rankingDisplayArea.innerHTML = '<p class="text-sm text-orange-500">Conexão com ranking indisponível.</p>';
        return;
    }
    try {
        const { data: allPalpites, error } = await supabaseClient 
            .from('user')
            .select('id, name, palpite') 
            .not('palpite', 'is', null);

        if (error) throw error;

        const palpitesPorData = allPalpites.reduce((acc, user) => {
            const dateStr = user.palpite; 
            if (!acc[dateStr]) {
                acc[dateStr] = { count: 0, users: [] };
            }
            acc[dateStr].count++;
            acc[dateStr].users.push(user.name);
            return acc;
        }, {});

        const sortedDates = Object.entries(palpitesPorData)
            .map(([date, data]) => ({ date, ...data }))
            .sort((a, b) => {
                if (b.count === a.count) {
                    return new Date(a.date) - new Date(b.date); 
                }
                return b.count - a.count; 
            });

        renderRanking(sortedDates); 
        renderTop3Countdowns(sortedDates.slice(0, 3)); 

    } catch (error) {
        console.error('Erro ao carregar palpites:', error.message);
        if(rankingDisplayArea) rankingDisplayArea.innerHTML = '<p class="text-sm text-red-500">Erro ao carregar ranking de palpites.</p>';
    }
}

function renderRanking(sortedPalpiteDates) {
    if(!rankingDisplayArea) return;
    rankingDisplayArea.innerHTML = ''; 
    if (!sortedPalpiteDates || sortedPalpiteDates.length === 0) {
        rankingDisplayArea.innerHTML = '<p class="text-sm text-gray-600">Ainda não há palpites registrados.</p>';
        return;
    }

    const list = document.createElement('ul');
    list.className = 'space-y-2';

    sortedPalpiteDates.slice(0, 10).forEach((pData, index) => { 
        const listItem = document.createElement('li');
        listItem.className = 'p-3 rounded-md flex justify-between items-center text-sm bg-gray-50 hover:bg-gray-100 cursor-pointer relative group';
        
        const palpiteDate = new Date(pData.date);
        palpiteDate.setUTCDate(palpiteDate.getUTCDate() + 1);

        let medal = '';
        if (index === 0) medal = '🥇 ';
        else if (index === 1) medal = '🥈 ';
        else if (index === 2) medal = '🥉 ';

        listItem.innerHTML = `
            <div>
                <span class="font-semibold text-indigo-600">${medal}${palpiteDate.toLocaleDateString('pt-BR', {day: '2-digit', month: 'long', year: 'numeric'})}</span>
                <span class="text-xs text-gray-500 ml-1">(${pData.count} ${pData.count > 1 ? 'votos' : 'voto'})</span>
            </div>
            <div class="user-tooltip absolute left-0 bottom-full mb-2 w-auto p-2 bg-gray-700 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 min-w-max max-h-20 overflow-y-auto">
                ${pData.users.join(', ')}
            </div>
        `;
        list.appendChild(listItem);
    });
    rankingDisplayArea.appendChild(list);
}


function renderTop3Countdowns(top3PalpiteDates) { 
    if(!top3CountdownArea) return;
    Object.values(palpiteCountdownIntervals).forEach(clearInterval);
    for (const key in palpiteCountdownIntervals) {
        delete palpiteCountdownIntervals[key];
    }

    top3CountdownArea.innerHTML = '<h4 class="text-md font-semibold text-orange-600 mb-2">Contagem Regressiva (Top 3 Datas):</h4>';
    if (!top3PalpiteDates || top3PalpiteDates.length === 0) {
        top3CountdownArea.innerHTML += '<p class="text-sm text-gray-500">Sem palpites no Top 3 para contagem.</p>';
        return;
    }

    top3PalpiteDates.forEach((pData, index) => {
        const palpiteDate = new Date(pData.date);
        palpiteDate.setUTCDate(palpiteDate.getUTCDate() + 1);
        const targetTime = palpiteDate.getTime();
        const dateIdSuffix = pData.date.replace(/-/g, ''); 

        const countdownDiv = document.createElement('div');
        countdownDiv.className = 'mb-3 p-3 bg-orange-50 rounded-lg shadow';
        countdownDiv.innerHTML = `
            <p class="text-sm font-medium text-orange-700">${index + 1}º Data Mais Votada: ${palpiteDate.toLocaleDateString('pt-BR')} (${pData.count} votos)</p> 
            <div id="countdown-top3-${dateIdSuffix}" class="text-xs text-orange-600 flex flex-wrap justify-start gap-x-2 gap-y-1 mt-1">
                <div class="timer-segment-small flex flex-col items-center"><span id="top3-${dateIdSuffix}-days" class="timer-value-small font-bold text-base">00</span><span class="timer-label-small text-xs">Dias</span></div>
                <div class="timer-segment-small flex flex-col items-center"><span id="top3-${dateIdSuffix}-hours" class="timer-value-small font-bold text-base">00</span><span class="timer-label-small text-xs">Horas</span></div>
                <div class="timer-segment-small flex flex-col items-center"><span id="top3-${dateIdSuffix}-minutes" class="timer-value-small font-bold text-base">00</span><span class="timer-label-small text-xs">Min</span></div>
                <div class="timer-segment-small flex flex-col items-center"><span id="top3-${dateIdSuffix}-seconds" class="timer-value-small font-bold text-base">00</span><span class="timer-label-small text-xs">Seg</span></div>
            </div>
        `;
        top3CountdownArea.appendChild(countdownDiv);
        
        const intervalId = setInterval(() => {
            updateSinglePalpiteCountdown(targetTime, `top3-${dateIdSuffix}-days`, `top3-${dateIdSuffix}-hours`, `top3-${dateIdSuffix}-minutes`, `top3-${dateIdSuffix}-seconds`, `countdown-top3-${dateIdSuffix}`);
        }, 1000);
        palpiteCountdownIntervals[`countdown-top3-${dateIdSuffix}`] = intervalId;
        updateSinglePalpiteCountdown(targetTime, `top3-${dateIdSuffix}-days`, `top3-${dateIdSuffix}-hours`, `top3-${dateIdSuffix}-minutes`, `top3-${dateIdSuffix}-seconds`, `countdown-top3-${dateIdSuffix}`); 
    });
}


function updateSinglePalpiteCountdown(targetTime, daysId, hoursId, minutesId, secondsId, containerId) {
    const now = new Date().getTime();
    const distance = targetTime - now;
    
    const elDays = document.getElementById(daysId);
    const elHours = document.getElementById(hoursId);
    const elMinutes = document.getElementById(minutesId);
    const elSeconds = document.getElementById(secondsId);
    const elContainer = document.getElementById(containerId);

    if (!elDays || !elHours || !elMinutes || !elSeconds || !elContainer) {
        if (palpiteCountdownIntervals[containerId]) {
            clearInterval(palpiteCountdownIntervals[containerId]);
            delete palpiteCountdownIntervals[containerId];
        }
        return;
    }

    if (distance < 0) {
        elContainer.innerHTML = `<span class='text-sm font-semibold text-red-500'>Prazo Atingido!</span>`;
        if (palpiteCountdownIntervals[containerId]) {
            clearInterval(palpiteCountdownIntervals[containerId]);
            delete palpiteCountdownIntervals[containerId];
        }
        return;
    }
    elDays.textContent = String(Math.floor(distance / (1000 * 60 * 60 * 24))).padStart(2, '0');
    elHours.textContent = String(Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0');
    elMinutes.textContent = String(Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
    elSeconds.textContent = String(Math.floor((distance % (1000 * 60)) / 1000)).padStart(2, '0');
}


// --- Funções de Enquete ---

async function checkIfUserVoted(userId) {
    if (!supabaseClient || userId === 0) return null; 
    try {
        const { data, error } = await supabaseClient 
            .from('enquete')
            .select('voto')
            .eq('user_id', userId)
            .order('created_at', { ascending: false }) 
            .limit(1)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error; 
        return data ? data.voto : null;

    } catch (error) {
        console.error("Erro ao verificar voto do usuário:", error.message);
        return null; 
    }
}

async function handleSubmitEnqueteVoto(voto) { 
    if (currentUser.id === 0) {
        alert('Você precisa estar identificado para votar.');
        toggleAuthModal();
        return;
    }

    try {
        const jaVotou = await checkIfUserVoted(currentUser.id);
        
        if (jaVotou === voto) { 
            return; 
        }

        if (jaVotou) { 
            const { error } = await supabaseClient
                .from('enquete')
                .update({ voto: voto })
                .eq('user_id', currentUser.id);
            if (error) throw error;
            alert('Voto atualizado com sucesso!');
        } else { 
            const { error } = await supabaseClient 
                .from('enquete')
                .insert([{ user_id: currentUser.id, voto: voto }]); 
            if (error) throw error;
            alert('Voto registrado com sucesso!');
        }
        
        // Chamar updateEnqueteSection primeiro para atualizar os botões
        await updateEnqueteSection(); 
        // Depois carregar e renderizar o gráfico
        await loadEnqueteResults(); 

    } catch (error) {
        console.error('Erro ao registrar/atualizar voto na enquete:', error.message);
        alert('Falha ao registrar/atualizar seu voto. Tente novamente.');
    }
}

async function loadEnqueteResults() {
    if (!supabaseClient) { 
        console.warn("Supabase client não inicializado ao tentar carregar resultados da enquete.");
        if (enqueteChartCanvas && !enqueteChartInstance) { // Se o gráfico não foi inicializado, mostra mensagem de erro
             const ctx = enqueteChartCanvas.getContext('2d');
             if(ctx) {
                ctx.clearRect(0, 0, enqueteChartCanvas.width, enqueteChartCanvas.height);
                ctx.font = "12px Inter"; ctx.fillStyle = "gray"; ctx.textAlign = "center";
                ctx.fillText("Carregando dados da enquete...", enqueteChartCanvas.width / 2, enqueteChartCanvas.height / 2);
             }
        }
        return;
    }
    try {
        const { data: votosComUserId, error } = await supabaseClient 
            .from('enquete')
            .select('voto, user_id, user(name)'); 

        if (error) throw error;

        const resultados = OPCOES_ENQUETE.reduce((acc, opcao) => {
            acc[opcao.value] = { count: 0, users: [] };
            return acc;
        }, {});

        votosComUserId.forEach(v => {
            if (resultados.hasOwnProperty(v.voto)) {
                resultados[v.voto].count++;
                if (v.user && v.user.name) {
                     resultados[v.voto].users.push(v.user.name);
                }
            }
        });
        renderEnqueteChart(resultados);

    } catch (error) {
        console.error('Erro ao carregar resultados da enquete:', error.message);
        if (enqueteChartCanvas) {
            const ctx = enqueteChartCanvas.getContext('2d');
            if (ctx) { 
                ctx.clearRect(0, 0, enqueteChartCanvas.width, enqueteChartCanvas.height);
                ctx.font = "14px Inter";
                ctx.fillStyle = "red";
                ctx.textAlign = "center";
                ctx.fillText("Erro ao carregar dados da enquete.", enqueteChartCanvas.width / 2, enqueteChartCanvas.height / 2);
            }
        }
    }
}

function renderEnqueteChart(resultados) {
    if (!enqueteChartCanvas) {
        console.warn("Canvas da enquete não encontrado para renderizar gráfico.");
        return;
    }
    const ctx = enqueteChartCanvas.getContext('2d');
    if (!ctx) {
        console.warn("Contexto 2D do canvas da enquete não pôde ser obtido.");
        return;
    }

    const labels = OPCOES_ENQUETE.map(opt => opt.label);
    const dataCounts = OPCOES_ENQUETE.map(opt => resultados[opt.value]?.count || 0);
    const totalVotes = dataCounts.reduce((sum, count) => sum + count, 0);

    console.log("Dados para gráfico da enquete:", labels, dataCounts, totalVotes); // Log para depuração

    const chartData = {
        labels: labels,
        datasets: [{
            label: 'Votos',
            data: dataCounts,
            backgroundColor: [
                'rgba(34, 197, 94, 0.8)',  
                'rgba(16, 185, 129, 0.7)', 
                'rgba(59, 130, 246, 0.7)', 
                'rgba(249, 115, 22, 0.7)', 
                'rgba(107, 114, 128, 0.7)' 
            ],
            borderColor: [
                'rgba(22, 163, 74, 1)',
                'rgba(5, 150, 105, 1)',
                'rgba(37, 99, 235, 1)',
                'rgba(234, 88, 12, 1)',
                'rgba(75, 85, 99, 1)'
            ],
            borderWidth: 1,
            hoverOffset: 8
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right', 
                labels: {
                    font: { family: 'Inter', size: 11 },
                    padding: 10,
                    boxWidth: 12,
                }
            },
            tooltip: {
                titleFont: { family: 'Inter' },
                bodyFont: { family: 'Inter', size: 10 },
                callbacks: {
                    label: function(context) {
                        const currentLabel = context.label || '';
                        const value = context.raw || 0;
                        const percentage = totalVotes > 0 ? ((value / totalVotes) * 100).toFixed(1) + '%' : '0%';
                        
                        const optionData = resultados[OPCOES_ENQUETE.find(o => o.label === currentLabel)?.value];
                        let userListText = '';
                        if (optionData && optionData.users.length > 0) {
                             userListText = '\n  (' + optionData.users.slice(0, 3).join(', ');
                             if (optionData.users.length > 3) userListText += ` e mais ${optionData.users.length - 3}`;
                             userListText += ')';
                        }
                        return `${currentLabel}: ${value} (${percentage})${userListText}`;
                    }
                }
            },
            datalabels: { 
                display: true,
                formatter: (value, ctx) => {
                    let sum = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                    let percentage = sum > 0 ? (value * 100 / sum).toFixed(0) + "%" : "0%"; 
                    if (value === 0 && sum > 0) return ''; // Não mostrar se for 0, a menos que todos sejam 0
                    if (sum === 0) return '0 (0%)'; // Se não houver votos
                    return `${value}\n(${percentage})`;
                },
                color: '#fff',
                textAlign: 'center',
                font: {
                    weight: 'bold',
                    family: 'Inter',
                    size: 10
                },
                textStrokeColor: 'rgba(0,0,0,0.6)',
                textStrokeWidth: 2,
                align: 'center',
                anchor: 'center'
            }
        }
    };


    if (enqueteChartInstance) {
        enqueteChartInstance.data = chartData;
        enqueteChartInstance.options.plugins.tooltip.callbacks.label = chartOptions.plugins.tooltip.callbacks.label;
        enqueteChartInstance.options.plugins.datalabels = chartOptions.plugins.datalabels;
        enqueteChartInstance.update();
    } else {
        const pluginsToUse = typeof ChartDataLabels !== 'undefined' ? [ChartDataLabels] : [];
        enqueteChartInstance = new Chart(ctx, {
            type: 'doughnut', 
            data: chartData,
            options: chartOptions,
            plugins: pluginsToUse 
        });
    }
}


// --- Funções de Mensagens ---

async function handleDeleteMessage(messageId) {
    if (currentUser.id === 0) {
        return;
    }
    if (!confirm("Tem certeza que deseja apagar esta mensagem?")) {
        return;
    }
    try {
        const { error } = await supabaseClient
            .from('messages')
            .delete()
            .eq('id', messageId)
            .eq('user_id', currentUser.id); 

        if (error) throw error;
        alert("Mensagem apagada com sucesso!");
        loadMensagens();
    } catch (error) {
        console.error("Erro ao apagar mensagem:", error.message);
        alert("Falha ao apagar mensagem.");
    }
}

async function handleMessageReaction(messageId, reactionType) {
    if (currentUser.id === 0) {
        alert("Você precisa estar logado para reagir às mensagens.");
        toggleAuthModal();
        return;
    }
    
    try {
        const { data: messageData, error: fetchError } = await supabaseClient
            .from('messages')
            .select('likes, dislikes') // Assegure que estas colunas existem
            .eq('id', messageId)
            .single();

        if (fetchError) {
            if (fetchError.message.includes("column") && (fetchError.message.includes("likes") || fetchError.message.includes("dislikes"))) {
                 console.warn("Colunas 'likes' ou 'dislikes' não encontradas na tabela 'messages'. Reações não podem ser salvas.");
                 alert("Funcionalidade de reação indisponível no momento (erro de configuração do banco de dados).");
            } else {
                throw fetchError;
            }
            return;
        }


        let updateData = {};
        if (reactionType === 'like') {
            updateData.likes = (messageData.likes || 0) + 1;
        } else if (reactionType === 'dislike') {
            updateData.dislikes = (messageData.dislikes || 0) + 1;
        }

        const { error: updateError } = await supabaseClient
            .from('messages')
            .update(updateData)
            .eq('id', messageId);

        if (updateError) throw updateError;
        
        loadMensagens(); 

    } catch (error) {
        console.error(`Erro ao registrar ${reactionType}:`, error.message);
    }
}


async function handleSubmitMuralMessage() {
    const messageInput = document.getElementById('mural-message-input');
    if (!messageInput) return;
    const messageText = messageInput.value.trim();

    if (!messageText) {
        alert('Por favor, escreva uma mensagem.');
        return;
    }

    try {
        const insertPayload = { user_id: currentUser.id, message: messageText };
        // Tenta adicionar likes/dislikes se as colunas existirem, caso contrário, omite.
        // Isso é uma suposição; o ideal é que o schema seja consistente.
        // Para este caso, vamos assumir que o usuário foi instruído a adicionar as colunas.
        insertPayload.likes = 0;
        insertPayload.dislikes = 0;

        const { error } = await supabaseClient 
            .from('messages') 
            .insert([insertPayload]); 
        
        if (error) {
            if (error.message.includes("column") && (error.message.includes("likes") || error.message.includes("dislikes"))) {
                console.warn("Falha ao inserir mensagem com likes/dislikes. Tentando sem...");
                const { error: fallbackError } = await supabaseClient
                    .from('messages')
                    .insert([{ user_id: currentUser.id, message: messageText }]);
                if (fallbackError) throw fallbackError;
            } else {
                throw error;
            }
        }

        messageInput.value = ''; 
        alert('Mensagem enviada com sucesso!');
        loadMensagens(); 

    } catch (error) {
        console.error('Erro ao enviar mensagem:', error.message);
        alert('Falha ao enviar mensagem.');
    }
}

async function loadMensagens() {
    if (!supabaseClient) { 
        console.warn("Supabase client não inicializado ao tentar carregar mensagens.");
        if (muralMensagensDisplay) muralMensagensDisplay.innerHTML = '<p class="text-sm text-red-500">Erro ao carregar mural.</p>';
        return;
    }
    try {
        let selectQuery = 'id, created_at, message, user_id, user(name)';
        // Tenta adicionar likes/dislikes à query se as colunas provavelmente existem
        // (Esta é uma heurística baseada no erro anterior, não ideal para produção)
        if (! (await checkMissingReactionColumns()) ) {
            selectQuery += ', likes, dislikes';
        }


        const { data: messages, error } = await supabaseClient 
            .from('messages') 
            .select(selectQuery) 
            .order('created_at', { ascending: false })
            .limit(50); 

        if (error) throw error;
        renderMensagens(messages, await checkMissingReactionColumns());


    } catch (error) {
        console.error('Erro ao carregar mensagens:', error.message);
        if (muralMensagensDisplay) muralMensagensDisplay.innerHTML = '<p class="text-sm text-red-500">Erro ao carregar mensagens do mural.</p>';
    }
}

// Função auxiliar para verificar (de forma simplificada) se as colunas de reação estão faltando
// Isso é para evitar quebrar a UI se o usuário não adicionou as colunas.
let missingReactionColsChecked = false;
let areReactionColsMissing = false;
async function checkMissingReactionColumns() {
    if (missingReactionColsChecked) return areReactionColsMissing;
    try {
        // Tenta fazer uma query que falharia se as colunas não existissem
        await supabaseClient.from('messages').select('id, likes, dislikes').limit(1);
        areReactionColsMissing = false;
    } catch (e) {
        if (e.message.includes("column") && (e.message.includes("likes") || e.message.includes("dislikes"))) {
            areReactionColsMissing = true;
        } else {
            // Outro erro, não relacionado a colunas faltando
            areReactionColsMissing = false; 
        }
    }
    missingReactionColsChecked = true;
    return areReactionColsMissing;
}


function renderMensagens(messages, hideReactions = false) {
    if (!muralMensagensDisplay) return;
    muralMensagensDisplay.innerHTML = ''; 

    if (!messages || messages.length === 0) {
        muralMensagensDisplay.innerHTML = '<p class="text-sm text-gray-500 italic">Nenhuma mensagem no mural ainda. Seja o primeiro!</p>';
        return;
    }

    messages.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'p-3 rounded-md shadow-sm text-sm mb-3'; 
        
        const authorName = (msg.user && msg.user.name) ? msg.user.name : 'Anônimo'; 
        const messageDate = new Date(msg.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

        let deleteButtonHTML = '';
        if (currentUser.id !== 0 && msg.user_id === currentUser.id) { 
            deleteButtonHTML = `<button class="delete-message-btn text-red-500 hover:text-red-700 text-xs ml-2" data-message-id="${msg.id}">🗑️ Apagar</button>`;
        }
        
        let reactionsHTML = '';
        if (!hideReactions) {
            reactionsHTML = `
                <div class="mt-2 pt-2 border-t border-gray-200 flex items-center space-x-3">
                    <button class="reaction-btn text-gray-500 hover:text-green-500 text-xs flex items-center" data-message-id="${msg.id}" data-reaction="like">
                        👍 <span class="ml-1">${msg.likes || 0}</span>
                    </button>
                    <button class="reaction-btn text-gray-500 hover:text-red-500 text-xs flex items-center" data-message-id="${msg.id}" data-reaction="dislike">
                        👎 <span class="ml-1">${msg.dislikes || 0}</span>
                    </button>
                </div>
            `;
        }


        messageDiv.innerHTML = `
            <div class="flex justify-between items-start">
                <p class="break-words whitespace-pre-wrap flex-grow">${msg.message}</p>
                ${deleteButtonHTML}
            </div>
            <p class="text-xs text-gray-500 mt-1">
                – <span class="font-medium">${authorName}</span> em ${messageDate}
            </p>
            ${reactionsHTML} 
        `;

        if (msg.user_id === currentUser.id && currentUser.id !== 0) { 
            messageDiv.classList.add('bg-teal-50', 'border-l-4', 'border-teal-500');
        } else {
            messageDiv.classList.add('bg-gray-50');
        }
        muralMensagensDisplay.appendChild(messageDiv);
    });

    document.querySelectorAll('.delete-message-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const messageId = e.target.closest('button').dataset.messageId;
            handleDeleteMessage(messageId);
        });
    });
    if (!hideReactions) {
        document.querySelectorAll('.reaction-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const btn = e.target.closest('button');
                const messageId = btn.dataset.messageId;
                const reactionType = btn.dataset.reaction;
                handleMessageReaction(messageId, reactionType);
            });
        });
    }
}


// --- Funções de UI (Ranking, Gráficos, etc.) ---
// (Serão implementadas aqui)

// --- Funções Utilitárias (Contagem Regressiva, etc.) ---
// (Serão implementadas aqui)
