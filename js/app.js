// js/app.js (novo - Orquestrador Principal)

(function(app) {
    'use strict';

    // --- Inicialização Principal ---
    document.addEventListener('DOMContentLoaded', () => {
        // Verifica se o supabaseClient foi inicializado em config.js
        if (!supabaseClient) {
            console.error('Supabase client não foi inicializado. Verifique config.js e a inclusão do SDK do Supabase.');
            // Poderia exibir uma mensagem de erro mais proeminente para o usuário aqui, se necessário.
            // A mensagem de erro já é adicionada em config.js, então talvez não precise duplicar.
            return; // Impede a inicialização do resto do app se o Supabase não estiver pronto.
        }
        
        console.log('DOM completamente carregado e parseado. Iniciando a aplicação (app.js)...');
        initializeApp();
    });

    async function loadUserFromStorage() {
        const lastUserId = localStorage.getItem('lastUserId');
        const lastUserName = localStorage.getItem('lastUserName');

        if (lastUserId && lastUserId !== "0" && lastUserName) {
            console.log(`Tentando carregar usuário ${lastUserName} (ID: ${lastUserId}) do localStorage.`);
            try {
                const { data, error } = await supabaseClient
                    .from('user')
                    .select('id, name, palpite, voto')
                    .eq('id', lastUserId)
                    .single();

                if (error) throw error;

                if (data) {
                    app.currentUser = { id: data.id, name: data.name, palpite: data.palpite, voto: data.voto };
                    console.log('Usuário carregado do localStorage e Supabase:', app.currentUser);
                } else {
                    // Usuário não encontrado no Supabase, limpar localStorage
                    localStorage.removeItem('lastUserId');
                    localStorage.removeItem('lastUserName');
                    console.warn(`Usuário com ID ${lastUserId} não encontrado no Supabase. Removendo do localStorage.`);
                }
            } catch (error) {
                console.error('Erro ao buscar usuário do Supabase com base no localStorage:', error.message);
                // Mantém o usuário anônimo padrão
            }
        } else {
            console.log('Nenhum usuário salvo no localStorage ou usuário é Anônimo.');
        }
    }

    async function initializeApp() {
        console.log('Aplicativo sendo inicializado por app.js...');

        // 0. Tentar carregar usuário do localStorage
        await loadUserFromStorage();

        // 1. Inicializar elementos da UI (de ui.js)
        if (app.initUIElements) {
            app.initUIElements();
        } else {
            console.error("app.initUIElements não definido. Verifique se ui.js está carregado antes de app.js.");
            return;
        }

        // 2. Configurar elementos de autenticação (de auth.js)
        // setupAuthElements também cria os modais que são referenciados em ui.js
        if (app.auth && app.auth.setupAuthElements) {
            app.auth.setupAuthElements(); // Cria botões, modais de auth e palpite
        } else {
            console.error("app.auth.setupAuthElements não definido. Verifique se auth.js está carregado.");
            return;
        }
        
        // 3. Inicializar outros módulos que dependem da UI e do currentUser (que é global ou em app.currentUser)
        // A ordem aqui pode ser importante se houver interdependências nas funções init.

        if (app.palpites && app.palpites.init) {
            app.palpites.init(); // Carrega palpites, configura widget e modal de palpite
        } else {
            console.error("app.palpites.init não definido. Verifique palpites.js.");
        }

        if (app.enquete && app.enquete.init) {
            app.enquete.init(); // Configura botões de voto e carrega/renderiza gráfico da enquete
        } else {
            console.error("app.enquete.init não definido. Verifique enquete.js.");
        }

        if (app.mural && app.mural.init) {
            app.mural.init(); // Configura área de postagem e carrega mensagens do mural
        } else {
            console.error("app.mural.init não definido. Verifique mural.js.");
        }
        
        console.log('Todos os módulos principais foram inicializados por app.js.');

        // Funções de atualização da UI que dependem do estado inicial do currentUser
        // Essas chamadas podem ser redundantes se as funções init dos módulos já as fazem,
        // mas é bom garantir que a UI reflita o estado anônimo inicial.
        // A maioria dessas atualizações agora é chamada dentro de handleLoginRegister ou nas inits dos módulos.
        // Exemplo: app.palpites.updateUserPalpiteWidget(); (já chamado em palpites.init e auth.handleLoginRegister)
        // Exemplo: app.enquete.updateEnqueteSection(); (já chamado em enquete.init e auth.handleLoginRegister)
        // Exemplo: app.mural.updateMuralSection(); (já chamado em mural.init e auth.handleLoginRegister)
    }

    // Se houver funções que eram globais no app.js original e precisam permanecer acessíveis,
    // podem ser anexadas ao namespace 'app' aqui.
    // Ex: app.minhaFuncaoGlobalAntiga = function() { ... };

})(window.aprovaBACEN); // Passa o namespace global da aplicação
