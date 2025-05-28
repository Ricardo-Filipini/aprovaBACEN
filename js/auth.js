// js/auth.js
// Gerenciamento de autenticação e usuário

(function(app) {
    'use strict';

    // currentUser é inicializado em config.js e acessado via app.currentUser
    // let currentUser = app.currentUser; // Referência local para conveniência

    app.auth = {
        init: function() {
            // A inicialização dos elementos do auth (botão, modal) é feita em setupAuthElements
            // que será chamado pelo app.js principal.
            // Se houver listeners globais de autenticação ou verificações iniciais, coloque aqui.
            console.log("Módulo Auth inicializado.");
        },

        setupAuthElements: function() {
            if (!app.uiElements.authWidgetContainer) {
                console.error("Elemento auth-widget-container não encontrado em auth.js.");
                return;
            }
            app.uiElements.authWidgetContainer.innerHTML = '';

            const mainButtonContainer = document.createElement('div');
            mainButtonContainer.className = 'flex flex-col items-end space-y-2';

            const authButton = document.createElement('button');
            authButton.className = 'bg-white text-blue-700 py-2 px-4 rounded-full shadow-lg hover:bg-blue-100 transition-all duration-300 flex items-center text-base';
            
            const userIcon = document.createElement('span');
            userIcon.className = 'mr-2 text-xl';
            userIcon.textContent = '👤';

            const userNameSpan = document.createElement('span');
            userNameSpan.id = 'auth-username';
            userNameSpan.textContent = app.currentUser.name;

            authButton.appendChild(userIcon);
            authButton.appendChild(userNameSpan);
            authButton.addEventListener('click', app.auth.toggleAuthModal);
            mainButtonContainer.appendChild(authButton);

            // O widget de palpite será configurado em palpites.js, mas o container é parte do auth
            const palpiteWidget = document.createElement('div');
            palpiteWidget.id = 'user-palpite-widget';
            palpiteWidget.className = 'text-sm text-gray-800 bg-white py-2 px-3 rounded-full shadow-lg hover:bg-gray-100 cursor-pointer flex items-center';
            palpiteWidget.style.display = 'none';
            palpiteWidget.innerHTML = `
                <span class="mr-2 text-lg">📅</span> 
                <span id="user-palpite-date-display" class="font-medium"></span>
            `;
            // O event listener para palpiteWidget será adicionado em palpites.js
            mainButtonContainer.appendChild(palpiteWidget);
            
            app.uiElements.authWidgetContainer.appendChild(mainButtonContainer);

            // Criação do Modal de Autenticação
            let authModal = document.getElementById('auth-modal');
            if (!authModal) {
                authModal = document.createElement('div');
                authModal.id = 'auth-modal';
                authModal.className = 'fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 hidden p-4';
                document.body.appendChild(authModal);
            }
            app.uiElements.authModal = authModal; // Armazena a referência

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
            document.getElementById('close-auth-modal').addEventListener('click', app.auth.toggleAuthModal);
            document.getElementById('login-button').addEventListener('click', app.auth.handleLoginRegister);
            authModal.addEventListener('click', (e) => { if (e.target.id === 'auth-modal') app.auth.toggleAuthModal(); });

            // Criação do Modal de Palpite (aqui para garantir que exista no DOM, gerenciado por palpites.js)
            let palpiteModal = document.getElementById('palpite-modal');
            if(!palpiteModal) {
                palpiteModal = document.createElement('div');
                palpiteModal.id = 'palpite-modal';
                palpiteModal.className = 'fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 hidden p-4';
                document.body.appendChild(palpiteModal);
            }
            app.uiElements.palpiteModal = palpiteModal; // Armazena a referência
            
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
            // Event listeners de 'close-palpite-modal' e 'palpite-modal' click serão adicionados em palpites.js
            
            // Atualiza o widget de palpite (que está dentro do authWidgetContainer)
            // Esta função será movida para palpites.js, mas chamada após login/logout
            if (app.palpites && typeof app.palpites.updateUserPalpiteWidget === 'function') {
                 app.palpites.updateUserPalpiteWidget();
            } else {
                // Fallback ou log se palpites.js ainda não carregou/definiu a função
                console.warn("app.palpites.updateUserPalpiteWidget não disponível durante setupAuthElements.");
            }
        },

        toggleAuthModal: function() {
            const modal = app.uiElements.authModal; // Usa a referência cacheada
            if (modal) {
                modal.classList.toggle('hidden');
                if (!modal.classList.contains('hidden')) {
                    app.auth.loadUsersForDropdown();
                    const newUserInput = document.getElementById('new-user-name');
                    if (newUserInput) newUserInput.value = '';
                }
            }
        },

        loadUsersForDropdown: async function() {
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

                if (app.currentUser.id !== 0 && Array.from(userSelect.options).some(opt => opt.value == app.currentUser.id)) {
                     userSelect.value = app.currentUser.id;
                } else if (previouslySelectedUserId && Array.from(userSelect.options).some(opt => opt.value == previouslySelectedUserId)) {
                    userSelect.value = previouslySelectedUserId;
                } else {
                    userSelect.value = "0";
                }

            } catch (error) {
                console.error('Erro ao carregar usuários:', error.message);
            }
        },

        handleLoginRegister: async function() {
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
                        app.currentUser = { id: data.id, name: data.name, palpite: data.palpite, voto: data.voto || null };
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
                        .select('id, name, palpite, voto')
                        .eq('id', selectedUserId)
                        .single();

                    if (error) throw error;
                    if (data) {
                        app.currentUser = { id: data.id, name: data.name, palpite: data.palpite, voto: data.voto };
                    } else if (selectedUserId === "0") {
                         app.currentUser = { id: 0, name: 'Anônimo', palpite: null, voto: null };
                    }
                } catch (error) {
                    console.error('Erro ao buscar usuário:', error.message);
                    app.currentUser = { id: 0, name: 'Anônimo', palpite: null, voto: null };
                }
            }

            const authUsernameSpan = document.getElementById('auth-username');
            if (authUsernameSpan) authUsernameSpan.textContent = app.currentUser.name;
            
            app.auth.toggleAuthModal();
            console.log('Usuário atual (auth.js):', app.currentUser);

            // Chamar atualizações de UI de outros módulos
            if (app.palpites && typeof app.palpites.updateUserPalpiteWidget === 'function') app.palpites.updateUserPalpiteWidget();
            if (app.enquete && typeof app.enquete.updateEnqueteSection === 'function') app.enquete.updateEnqueteSection();
            if (app.mural && typeof app.mural.updateMuralSection === 'function') app.mural.updateMuralSection();
            
            // Recarregar dados que dependem do usuário
            if (app.palpites && typeof app.palpites.loadPalpites === 'function') app.palpites.loadPalpites();
            if (app.mural && typeof app.mural.loadMensagens === 'function') app.mural.loadMensagens();
            // A enquete é atualizada por updateEnqueteSection e loadEnqueteResults (chamado por updateEnqueteSection)

            // Salvar no localStorage ou remover se anônimo
            if (app.currentUser && app.currentUser.id !== 0) {
                localStorage.setItem('lastUserId', app.currentUser.id);
                localStorage.setItem('lastUserName', app.currentUser.name);
            } else {
                localStorage.removeItem('lastUserId');
                localStorage.removeItem('lastUserName');
            }
        }
    };

})(window.aprovaBACEN);
