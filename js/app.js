// js/app.js

const SUPABASE_URL = "https://nrmkbqbuuytwiuweedfy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ybWticWJ1dXl0d2l1d2VlZGZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0MzgwODAsImV4cCI6MjA2NDAxNDA4MH0.r-J894pdUHE3uqwhBJIj5_jRR1ZKHwTDIfLWS7VNYK8";

let supabaseClient; // Renomeado para evitar conflito com o objeto global do SDK
let currentUser = { id: 0, nome: 'Anônimo', palpite: null }; 

document.addEventListener('DOMContentLoaded', () => {
    // O objeto global do SDK é window.supabase
    if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); // Usar window.supabase e atribuir a supabaseClient
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
    loadEnqueteResults(); 
    loadMensagens(); 
    updatePalpiteSection(); 
    updateEnqueteSection(); 
    updateMuralSection(); 
}

// --- Funções de Autenticação e Usuário ---
const authWidgetContainer = document.getElementById('auth-widget-container');
const palpiteInputArea = document.getElementById('palpite-input-area');
const userPalpiteDisplay = document.getElementById('user-palpite-display');
const enqueteOptionsArea = document.getElementById('enquete-options-area');
const muralPostArea = document.getElementById('mural-post-area');


function setupAuthElements() {
    if (!authWidgetContainer) {
        console.error("Elemento auth-widget-container não encontrado.");
        return;
    }
    authWidgetContainer.innerHTML = ''; 

    const authButton = document.createElement('button');
    authButton.className = 'bg-white text-blue-700 py-2 px-4 rounded-full shadow-lg hover:bg-blue-100 transition-all duration-300 flex items-center text-sm';
    
    const userIcon = document.createElement('span');
    userIcon.className = 'mr-2 text-lg'; 
    userIcon.textContent = '👤'; 

    const userNameSpan = document.createElement('span');
    userNameSpan.id = 'auth-username';
    userNameSpan.textContent = currentUser.nome;

    authButton.appendChild(userIcon);
    authButton.appendChild(userNameSpan);

    authButton.addEventListener('click', toggleAuthModal);
    authWidgetContainer.appendChild(authButton);

    let modal = document.getElementById('auth-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'auth-modal';
        modal.className = 'fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 hidden p-4';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
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
    modal.addEventListener('click', (e) => { 
        if (e.target.id === 'auth-modal') {
            toggleAuthModal();
        }
    });
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

async function loadUsersForDropdown() {
    if (!supabaseClient) return; // Usar supabaseClient
    try {
        const { data: users, error } = await supabaseClient.from('user').select('id, nome').order('nome', { ascending: true }); // Usar supabaseClient
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
                option.textContent = user.nome;
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
            const { data: existingUser, error: checkError } = await supabaseClient // Usar supabaseClient
                .from('user')
                .select('id, nome')
                .eq('nome', newUserName)
                .single();

            if (checkError && checkError.code !== 'PGRST116') { 
                throw checkError;
            }

            if (existingUser) {
                alert('Este nome de usuário já existe. Por favor, escolha outro ou selecione na lista.');
                return;
            }

            const { data, error } = await supabaseClient // Usar supabaseClient
                .from('user')
                .insert([{ nome: newUserName }])
                .select()
                .single();
            
            if (error) throw error;

            if (data) {
                currentUser = { id: data.id, nome: data.nome, palpite: data.palpite };
                alert(`Usuário ${data.nome} cadastrado com sucesso!`);
            }
        } catch (error) {
            console.error('Erro ao registrar novo usuário:', error.message);
            alert('Falha ao registrar. Tente novamente.');
            return;
        }
    } else if (selectedUserId) { 
        try {
            const { data, error } = await supabaseClient // Usar supabaseClient
                .from('user')
                .select('id, nome, palpite')
                .eq('id', selectedUserId)
                .single();

            if (error) throw error;
            if (data) {
                currentUser = { id: data.id, nome: data.nome, palpite: data.palpite };
            } else if (selectedUserId === "0") { 
                 currentUser = { id: 0, nome: 'Anônimo', palpite: null };
                 console.warn("Usuário anônimo (ID 0) não encontrado no banco. Usando default local.");
            }
        } catch (error) {
            console.error('Erro ao buscar usuário:', error.message);
            currentUser = { id: 0, nome: 'Anônimo', palpite: null }; 
        }
    }

    const authUsernameSpan = document.getElementById('auth-username');
    if (authUsernameSpan) authUsernameSpan.textContent = currentUser.nome;
    
    toggleAuthModal();
    console.log('Usuário atual:', currentUser);

    updatePalpiteSection();
    updateEnqueteSection(); 
    updateMuralSection();
    loadPalpites(); 
    loadMensagens(); 
}

function updatePalpiteSection() {
    if (!palpiteInputArea || !userPalpiteDisplay) return;
    palpiteInputArea.innerHTML = '';
    userPalpiteDisplay.innerHTML = '';

    if (currentUser.id === 0) { 
        palpiteInputArea.innerHTML = '<p class="text-sm text-gray-600">Identifique-se para registrar um palpite.</p>';
        return;
    }

    if (currentUser.palpite) {
        const palpiteDate = new Date(currentUser.palpite);
        userPalpiteDisplay.innerHTML = `
            <p class="text-sm text-gray-700">Seu palpite: <strong class="text-indigo-600">${palpiteDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</strong></p>
            <button id="remove-palpite-btn" class="text-xs text-red-500 hover:text-red-700 mt-1">Remover palpite</button>
        `;
        const removeBtn = document.getElementById('remove-palpite-btn');
        if (removeBtn) removeBtn.addEventListener('click', handleRemovePalpite);
    } else {
        palpiteInputArea.innerHTML = `
            <label for="palpite-date" class="block text-sm font-medium text-gray-700 mb-1">Data da divulgação (palpite):</label>
            <div class="flex items-center space-x-2">
                <input type="date" id="palpite-date" class="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
                <button id="submit-palpite-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-3 rounded-md text-sm">🎯</button>
            </div>
            <p class="text-xs text-gray-500 mt-1">Um palpite por usuário.</p>
        `;
        const submitBtn = document.getElementById('submit-palpite-btn');
        if (submitBtn) submitBtn.addEventListener('click', handleSubmitPalpite);
    }
}

function updateEnqueteSection() {
    if (!enqueteOptionsArea) return;
    enqueteOptionsArea.innerHTML = '';
    
    (async () => { 
        const userVote = currentUser.id !== 0 ? await checkIfUserVoted(currentUser.id) : null;

        if (userVote && currentUser.id !== 0) { 
            enqueteOptionsArea.innerHTML = `<p class="text-sm text-gray-700">Você já votou: <strong class="text-purple-600">${userVote}</strong>.</p>`;
        } else { 
            const form = document.createElement('form');
            form.id = 'enquete-form';
            form.className = 'space-y-2';
            OPCOES_ENQUETE.forEach(opcao => { 
                const div = document.createElement('div');
                div.className = 'flex items-center';
                const input = document.createElement('input');
                input.type = 'radio';
                input.id = `enquete-${opcao.toLowerCase().replace(/\s+/g, '-')}`;
                input.name = 'enquete-voto';
                input.value = opcao;
                input.className = 'h-4 w-4 text-purple-600 border-gray-300 focus:ring-purple-500';
                const label = document.createElement('label');
                label.htmlFor = input.id;
                label.textContent = opcao;
                label.className = 'ml-2 block text-sm text-gray-900';
                div.appendChild(input);
                div.appendChild(label);
                form.appendChild(div);
            });
            const submitButton = document.createElement('button');
            submitButton.type = 'button'; 
            submitButton.id = 'submit-enquete-btn';
            submitButton.className = 'mt-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-md text-sm';
            submitButton.textContent = 'Votar';
            submitButton.addEventListener('click', handleSubmitEnqueteVoto); 
            form.appendChild(submitButton);
            enqueteOptionsArea.appendChild(form);
        }
        loadEnqueteResults(); 
    })();
}

function updateMuralSection() {
    if (!muralPostArea) return;
    muralPostArea.innerHTML = '';
    muralPostArea.innerHTML = `
        <textarea id="mural-message-input" rows="3" placeholder="Sua mensagem de otimismo (ou não)..." class="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 text-sm"></textarea>
        <button id="submit-mural-message-btn" class="mt-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-4 rounded-md text-sm">Enviar Mensagem</button>
    `;
    const submitMsgBtn = document.getElementById('submit-mural-message-btn');
    if(submitMsgBtn) submitMsgBtn.addEventListener('click', handleSubmitMuralMessage);
}


// --- Funções de Palpites ---
const rankingDisplayArea = document.getElementById('ranking-display-area');
const top3CountdownArea = document.getElementById('top3-countdown-area');

async function handleSubmitPalpite() {
    if (currentUser.id === 0) {
        alert('Você precisa estar identificado para registrar um palpite.');
        toggleAuthModal();
        return;
    }

    const palpiteDateInput = document.getElementById('palpite-date');
    if (!palpiteDateInput || !palpiteDateInput.value) {
        alert('Por favor, selecione uma data para o seu palpite.');
        return;
    }
    const palpiteDate = palpiteDateInput.value; 

    try {
        const { data, error } = await supabaseClient // Usar supabaseClient
            .from('user')
            .update({ palpite: palpiteDate })
            .eq('id', currentUser.id)
            .select()
            .single();

        if (error) throw error;

        if (data) {
            currentUser.palpite = data.palpite;
            alert('Palpite registrado com sucesso!');
            updatePalpiteSection();
            loadPalpites(); 
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
        const { data, error } = await supabaseClient // Usar supabaseClient
            .from('user')
            .update({ palpite: null })
            .eq('id', currentUser.id)
            .select()
            .single();

        if (error) throw error;

        currentUser.palpite = null;
        alert('Palpite removido com sucesso.');
        updatePalpiteSection();
        loadPalpites(); 
    } catch (error) {
        console.error('Erro ao remover palpite:', error.message);
        alert('Falha ao remover o palpite. Tente novamente.');
    }
}

async function loadPalpites() {
    if (!supabaseClient) { // Usar supabaseClient
        console.warn("Supabase client não inicializado ao tentar carregar palpites.");
        if(rankingDisplayArea) rankingDisplayArea.innerHTML = '<p class="text-sm text-orange-500">Conexão com ranking indisponível.</p>';
        return;
    }
    try {
        const { data: palpites, error } = await supabaseClient // Usar supabaseClient
            .from('user')
            .select('id, nome, palpite')
            .not('palpite', 'is', null) 
            .order('palpite', { ascending: true }); 

        if (error) throw error;

        renderRanking(palpites);
        renderTop3Countdowns(palpites.slice(0, 3));

    } catch (error) {
        console.error('Erro ao carregar palpites:', error.message);
        if(rankingDisplayArea) rankingDisplayArea.innerHTML = '<p class="text-sm text-red-500">Erro ao carregar ranking de palpites.</p>';
    }
}

function renderRanking(palpites) {
    if(!rankingDisplayArea) return;
    rankingDisplayArea.innerHTML = ''; 
    if (!palpites || palpites.length === 0) {
        rankingDisplayArea.innerHTML = '<p class="text-sm text-gray-600">Ainda não há palpites registrados.</p>';
        return;
    }

    const list = document.createElement('ul');
    list.className = 'space-y-2';

    palpites.forEach((p, index) => {
        const listItem = document.createElement('li');
        listItem.className = 'p-2 rounded-md flex justify-between items-center text-sm';
        
        const palpiteDate = new Date(p.palpite);
        palpiteDate.setUTCDate(palpiteDate.getUTCDate() + 1);


        let medal = '';
        if (index === 0) medal = '🥇 ';
        else if (index === 1) medal = '🥈 ';
        else if (index === 2) medal = '🥉 ';

        listItem.innerHTML = `
            <div>
                <span class="font-semibold">${medal}${p.nome}</span>
            </div>
            <span class="text-gray-700">${palpiteDate.toLocaleDateString('pt-BR')}</span>
        `;
        if (p.id === currentUser.id) {
            listItem.classList.add('bg-indigo-100', 'border-l-4', 'border-indigo-500');
        } else {
            listItem.classList.add('bg-gray-50');
        }
        list.appendChild(listItem);
    });
    rankingDisplayArea.appendChild(list);
}

const palpiteCountdownIntervals = {}; // Mover para escopo global ou de módulo se necessário

function renderTop3Countdowns(top3Palpites) {
    if(!top3CountdownArea) return;
    Object.values(palpiteCountdownIntervals).forEach(clearInterval);
    for (const key in palpiteCountdownIntervals) {
        delete palpiteCountdownIntervals[key];
    }

    top3CountdownArea.innerHTML = '<h4 class="text-md font-semibold text-orange-600 mb-2">Contagem Regressiva Top 3:</h4>';
    if (!top3Palpites || top3Palpites.length === 0) {
        top3CountdownArea.innerHTML += '<p class="text-sm text-gray-500">Sem palpites no Top 3 para contagem.</p>';
        return;
    }

    top3Palpites.forEach((p, index) => {
        const palpiteDate = new Date(p.palpite);
        palpiteDate.setUTCDate(palpiteDate.getUTCDate() + 1);
        const targetTime = palpiteDate.getTime();

        const countdownDiv = document.createElement('div');
        countdownDiv.className = 'mb-3 p-3 bg-orange-50 rounded-lg shadow';
        countdownDiv.innerHTML = `
            <p class="text-sm font-medium text-orange-700">${index + 1}º: ${p.nome} (${palpiteDate.toLocaleDateString('pt-BR')})</p>
            <div id="countdown-top3-${p.id}" class="text-xs text-orange-600 flex flex-wrap justify-start gap-x-2 gap-y-1 mt-1">
                <div class="timer-segment-small flex flex-col items-center"><span id="top3-${p.id}-days" class="timer-value-small font-bold text-base">00</span><span class="timer-label-small text-xs">Dias</span></div>
                <div class="timer-segment-small flex flex-col items-center"><span id="top3-${p.id}-hours" class="timer-value-small font-bold text-base">00</span><span class="timer-label-small text-xs">Horas</span></div>
                <div class="timer-segment-small flex flex-col items-center"><span id="top3-${p.id}-minutes" class="timer-value-small font-bold text-base">00</span><span class="timer-label-small text-xs">Min</span></div>
                <div class="timer-segment-small flex flex-col items-center"><span id="top3-${p.id}-seconds" class="timer-value-small font-bold text-base">00</span><span class="timer-label-small text-xs">Seg</span></div>
            </div>
        `;
        top3CountdownArea.appendChild(countdownDiv);
        
        const intervalId = setInterval(() => {
            updateSinglePalpiteCountdown(targetTime, `top3-${p.id}-days`, `top3-${p.id}-hours`, `top3-${p.id}-minutes`, `top3-${p.id}-seconds`, `countdown-top3-${p.id}`);
        }, 1000);
        palpiteCountdownIntervals[`countdown-top3-${p.id}`] = intervalId;
        updateSinglePalpiteCountdown(targetTime, `top3-${p.id}-days`, `top3-${p.id}-hours`, `top3-${p.id}-minutes`, `top3-${p.id}-seconds`, `countdown-top3-${p.id}`); 
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
const enqueteChartCanvas = document.getElementById('enqueteChart');
let enqueteChartInstance = null;
const OPCOES_ENQUETE = ['Super Otimista', 'Otimista', 'Realista', 'Pessimista', 'Mar céu lar'];

async function checkIfUserVoted(userId) {
    if (!supabaseClient || userId === 0) return null; // Usar supabaseClient
    try {
        const { data, error } = await supabaseClient // Usar supabaseClient
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

async function handleSubmitEnqueteVoto() {
    const form = document.getElementById('enquete-form');
    if (!form) return;
    const selectedOption = form.querySelector('input[name="enquete-voto"]:checked');

    if (!selectedOption) {
        alert('Por favor, selecione uma opção para votar.');
        return;
    }
    const voto = selectedOption.value;

    try {
        if (currentUser.id !== 0) { 
            const jaVotou = await checkIfUserVoted(currentUser.id);
            if (jaVotou) {
                alert(`Você já votou: ${jaVotou}. Não é possível votar novamente.`);
                updateEnqueteSection(); 
                return;
            }
        }

        const { error } = await supabaseClient // Usar supabaseClient
            .from('enquete')
            .insert([{ user_id: currentUser.id, voto: voto }]); 
        
        if (error) throw error;

        alert('Voto registrado com sucesso!');
        updateEnqueteSection(); 
        loadEnqueteResults(); 

    } catch (error) {
        console.error('Erro ao registrar voto na enquete:', error.message);
        alert('Falha ao registrar seu voto. Tente novamente.');
    }
}

async function loadEnqueteResults() {
    if (!supabaseClient) { // Usar supabaseClient
        console.warn("Supabase client não inicializado ao tentar carregar resultados da enquete.");
        return;
    }
    try {
        const { data: votos, error } = await supabaseClient // Usar supabaseClient
            .from('enquete')
            .select('voto, user_id'); 

        if (error) throw error;

        const resultados = OPCOES_ENQUETE.reduce((acc, opcao) => {
            acc[opcao] = 0;
            return acc;
        }, {});

        votos.forEach(v => {
            if (resultados.hasOwnProperty(v.voto)) {
                resultados[v.voto]++;
            }
        });
        renderEnqueteChart(resultados);

    } catch (error) {
        console.error('Erro ao carregar resultados da enquete:', error.message);
        if (enqueteChartCanvas) {
            const ctx = enqueteChartCanvas.getContext('2d');
            ctx.clearRect(0, 0, enqueteChartCanvas.width, enqueteChartCanvas.height);
            ctx.font = "14px Inter";
            ctx.fillStyle = "red";
            ctx.textAlign = "center";
            ctx.fillText("Erro ao carregar dados da enquete.", enqueteChartCanvas.width / 2, enqueteChartCanvas.height / 2);
        }
    }
}

function renderEnqueteChart(resultados) {
    if (!enqueteChartCanvas) return;
    const ctx = enqueteChartCanvas.getContext('2d');

    const data = {
        labels: OPCOES_ENQUETE,
        datasets: [{
            label: 'Votos',
            data: OPCOES_ENQUETE.map(opcao => resultados[opcao] || 0),
            backgroundColor: [
                'rgba(34, 197, 94, 0.7)',  
                'rgba(139, 92, 246, 0.7)', 
                'rgba(59, 130, 246, 0.7)', 
                'rgba(249, 115, 22, 0.7)', 
                'rgba(107, 114, 128, 0.7)' 
            ],
            borderColor: [
                'rgba(22, 163, 74, 1)',
                'rgba(124, 58, 237, 1)',
                'rgba(37, 99, 235, 1)',
                'rgba(234, 88, 12, 1)',
                'rgba(75, 85, 99, 1)'
            ],
            borderWidth: 1
        }]
    };

    if (enqueteChartInstance) {
        enqueteChartInstance.data = data;
        enqueteChartInstance.update();
    } else {
        enqueteChartInstance = new Chart(ctx, {
            type: 'doughnut', 
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: { family: 'Inter', size: 10 },
                            padding: 10,
                            boxWidth: 12,
                        }
                    },
                    tooltip: {
                        titleFont: { family: 'Inter' },
                        bodyFont: { family: 'Inter' },
                    }
                }
            }
        });
    }
}


// --- Funções de Mensagens ---
const muralMensagensDisplay = document.getElementById('mural-mensagens-display');

async function handleSubmitMuralMessage() {
    const messageInput = document.getElementById('mural-message-input');
    if (!messageInput) return;
    const messageText = messageInput.value.trim();

    if (!messageText) {
        alert('Por favor, escreva uma mensagem.');
        return;
    }

    try {
        const { error } = await supabaseClient // Usar supabaseClient
            .from('message') 
            .insert([{ user_id: currentUser.id, menssage: messageText }]); 
        
        if (error) throw error;

        messageInput.value = ''; 
        alert('Mensagem enviada com sucesso!');
        loadMensagens(); 

    } catch (error) {
        console.error('Erro ao enviar mensagem:', error.message);
        alert('Falha ao enviar mensagem. Tente novamente.');
    }
}

async function loadMensagens() {
    if (!supabaseClient) { // Usar supabaseClient
        console.warn("Supabase client não inicializado ao tentar carregar mensagens.");
        if (muralMensagensDisplay) muralMensagensDisplay.innerHTML = '<p class="text-sm text-red-500">Erro ao carregar mural.</p>';
        return;
    }
    try {
        const { data: messages, error } = await supabaseClient // Usar supabaseClient
            .from('message')
            .select(`
                id,
                created_at,
                menssage, 
                user_id,
                user (nome)
            `)
            .order('created_at', { ascending: false })
            .limit(50); 

        if (error) throw error;
        renderMensagens(messages);

    } catch (error) {
        console.error('Erro ao carregar mensagens:', error.message);
        if (muralMensagensDisplay) muralMensagensDisplay.innerHTML = '<p class="text-sm text-red-500">Erro ao carregar mensagens do mural.</p>';
    }
}

function renderMensagens(messages) {
    if (!muralMensagensDisplay) return;
    muralMensagensDisplay.innerHTML = ''; 

    if (!messages || messages.length === 0) {
        muralMensagensDisplay.innerHTML = '<p class="text-sm text-gray-500 italic">Nenhuma mensagem no mural ainda. Seja o primeiro!</p>';
        return;
    }

    messages.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'p-3 rounded-md shadow-sm text-sm';
        
        const authorName = (msg.user && msg.user.nome) ? msg.user.nome : 'Anônimo';
        const messageDate = new Date(msg.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

        messageDiv.innerHTML = `
            <p class="break-words whitespace-pre-wrap">${msg.menssage}</p>
            <p class="text-xs text-gray-500 mt-1 text-right">
                – <span class="font-medium">${authorName}</span> em ${messageDate}
            </p>
        `;

        if (msg.user_id === currentUser.id && currentUser.id !== 0) { 
            messageDiv.classList.add('bg-teal-50', 'border-l-4', 'border-teal-500');
        } else {
            messageDiv.classList.add('bg-gray-50');
        }
        muralMensagensDisplay.appendChild(messageDiv);
    });
}


// --- Funções de UI (Ranking, Gráficos, etc.) ---
// (Serão implementadas aqui)

// --- Funções Utilitárias (Contagem Regressiva, etc.) ---
// (Serão implementadas aqui)
