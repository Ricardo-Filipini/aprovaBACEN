// js/mural.js
// Gerenciamento do mural de mensagens

(function(app) {
    'use strict';

    // Variáveis de estado para checagem de colunas de reação (movidas do escopo global)
    let missingReactionColsChecked = false;
    let areReactionColsMissing = false;

    app.mural = {
        init: function() {
            // muralPostArea e muralMensagensDisplay são buscados em ui.js
            console.log("Módulo Mural inicializado.");
            this.updateMuralSection(); // Configura a área de postagem
            this.loadMensagens();      // Carrega as mensagens existentes
        },

        updateMuralSection: function() {
            if (!app.uiElements.muralPostArea) {
                console.warn("Elemento muralPostArea não encontrado ao tentar atualizar (mural.js).");
                return;
            }
            app.uiElements.muralPostArea.innerHTML = '';
            app.uiElements.muralPostArea.innerHTML = `
                <textarea id="mural-message-input" rows="3" placeholder="Sua mensagem de otimismo (ou não)..." class="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 text-sm"></textarea>
                <button id="submit-mural-message-btn" class="mt-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-4 rounded-md text-sm">Enviar Mensagem</button>
            `;
            const submitMsgBtn = document.getElementById('submit-mural-message-btn');
            if(submitMsgBtn) submitMsgBtn.addEventListener('click', app.mural.handleSubmitMuralMessage);
        },

        handleSubmitMuralMessage: async function() {
            const messageInput = document.getElementById('mural-message-input');
            if (!messageInput) return;
            const messageText = messageInput.value.trim();

            if (!messageText) {
                alert('Por favor, escreva uma mensagem.');
                return;
            }
            
            if (app.currentUser.id === 0) {
                alert('Você precisa estar identificado para enviar mensagens.');
                 if (app.auth && typeof app.auth.toggleAuthModal === 'function') app.auth.toggleAuthModal();
                return;
            }

            try {
                const insertPayload = { user_id: app.currentUser.id, message: messageText };
                
                // Verifica se as colunas de reação existem antes de tentar incluí-las
                if (!await app.mural.checkMissingReactionColumnsInternal()) {
                    insertPayload.likes = 0;
                    insertPayload.dislikes = 0;
                }

                const { error } = await supabaseClient
                    .from('messages')
                    .insert([insertPayload]);
                
                if (error) {
                    // Se o erro for sobre as colunas de like/dislike e elas não foram checadas como ausentes antes,
                    // tenta inserir sem elas como fallback.
                    if (error.message.includes("column") && (error.message.includes("likes") || error.message.includes("dislikes")) && insertPayload.hasOwnProperty('likes')) {
                        console.warn("Falha ao inserir mensagem com likes/dislikes. Tentando sem...");
                        delete insertPayload.likes;
                        delete insertPayload.dislikes;
                        const { error: fallbackError } = await supabaseClient
                            .from('messages')
                            .insert([insertPayload]);
                        if (fallbackError) throw fallbackError; // Se o fallback também falhar, lança o erro do fallback
                    } else {
                        throw error; // Lança o erro original se não for sobre likes/dislikes ou se já tentou sem
                    }
                }

                messageInput.value = '';
                alert('Mensagem enviada com sucesso!');
                app.mural.loadMensagens();

            } catch (error) {
                console.error('Erro ao enviar mensagem:', error.message);
                alert('Falha ao enviar mensagem.');
            }
        },

        loadMensagens: async function() {
            if (!supabaseClient) {
                console.warn("Supabase client não inicializado ao tentar carregar mensagens (mural.js).");
                if (app.uiElements.muralMensagensDisplay) app.uiElements.muralMensagensDisplay.innerHTML = '<p class="text-sm text-red-500">Erro ao carregar mural.</p>';
                return;
            }
            try {
                let selectQuery = 'id, created_at, message, user_id, user(name)';
                
                const hideReactions = await app.mural.checkMissingReactionColumnsInternal();
                if (!hideReactions) {
                    selectQuery += ', likes, dislikes';
                }

                const { data: messages, error } = await supabaseClient
                    .from('messages')
                    .select(selectQuery)
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (error) throw error;
                app.mural.renderMensagens(messages, hideReactions);

            } catch (error) {
                console.error('Erro ao carregar mensagens:', error.message);
                if (app.uiElements.muralMensagensDisplay) app.uiElements.muralMensagensDisplay.innerHTML = '<p class="text-sm text-red-500">Erro ao carregar mensagens do mural.</p>';
            }
        },
        
        // Renomeada para _checkMissingReactionColumns para indicar uso interno e evitar conflito de nome
        // com a versão global que existia antes.
        checkMissingReactionColumnsInternal: async function() {
            if (missingReactionColsChecked) return areReactionColsMissing;
            try {
                await supabaseClient.from('messages').select('id, likes, dislikes').limit(1);
                areReactionColsMissing = false;
            } catch (e) {
                if (e.message.includes("column") && (e.message.includes("likes") || e.message.includes("dislikes"))) {
                    console.warn("Colunas 'likes' ou 'dislikes' parecem estar faltando na tabela 'messages'. Reações serão desabilitadas.");
                    areReactionColsMissing = true;
                } else {
                    // Outro erro, não relacionado a colunas faltando, assume que existem por segurança
                    // ou loga o erro inesperado.
                    console.error("Erro inesperado ao verificar colunas de reação:", e.message);
                    areReactionColsMissing = false; 
                }
            }
            missingReactionColsChecked = true;
            return areReactionColsMissing;
        },

        renderMensagens: function(messages, hideReactions = false) {
            if (!app.uiElements.muralMensagensDisplay) return;
            app.uiElements.muralMensagensDisplay.innerHTML = '';

            if (!messages || messages.length === 0) {
                app.uiElements.muralMensagensDisplay.innerHTML = '<p class="text-sm text-gray-500 italic">Nenhuma mensagem no mural ainda. Seja o primeiro!</p>';
                return;
            }

            messages.forEach(msg => {
                const messageDiv = document.createElement('div');
                messageDiv.className = 'p-3 rounded-md shadow-sm text-sm mb-3';
                
                const authorName = (msg.user && msg.user.name) ? msg.user.name : 'Anônimo';
                const messageDate = new Date(msg.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

                let deleteButtonHTML = '';
                if (app.currentUser.id !== 0 && msg.user_id === app.currentUser.id) {
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

                if (msg.user_id === app.currentUser.id && app.currentUser.id !== 0) {
                    messageDiv.classList.add('bg-teal-50', 'border-l-4', 'border-teal-500');
                } else {
                    messageDiv.classList.add('bg-gray-50');
                }
                app.uiElements.muralMensagensDisplay.appendChild(messageDiv);
            });

            document.querySelectorAll('.delete-message-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const messageId = e.target.closest('button').dataset.messageId;
                    app.mural.handleDeleteMessage(messageId);
                });
            });

            if (!hideReactions) {
                document.querySelectorAll('.reaction-btn').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const btn = e.target.closest('button');
                        const messageId = btn.dataset.messageId;
                        const reactionType = btn.dataset.reaction;
                        app.mural.handleMessageReaction(messageId, reactionType);
                    });
                });
            }
        },

        handleDeleteMessage: async function(messageId) {
            if (app.currentUser.id === 0) return; // Não deveria acontecer se o botão só aparece para o dono
            if (!confirm("Tem certeza que deseja apagar esta mensagem?")) return;

            try {
                const { error } = await supabaseClient
                    .from('messages')
                    .delete()
                    .eq('id', messageId)
                    .eq('user_id', app.currentUser.id); // Segurança extra

                if (error) throw error;
                alert("Mensagem apagada com sucesso!");
                app.mural.loadMensagens();
            } catch (error) {
                console.error("Erro ao apagar mensagem:", error.message);
                alert("Falha ao apagar mensagem.");
            }
        },

        handleMessageReaction: async function(messageId, reactionType) {
            if (app.currentUser.id === 0) {
                alert("Você precisa estar logado para reagir às mensagens.");
                if (app.auth && typeof app.auth.toggleAuthModal === 'function') app.auth.toggleAuthModal();
                return;
            }
            
            // Se as colunas de reação estiverem faltando, não faz nada.
            if (await app.mural.checkMissingReactionColumnsInternal()) {
                alert("Funcionalidade de reação indisponível no momento.");
                return;
            }

            try {
                // Primeiro, busca os contadores atuais. Isso é propenso a race conditions
                // em um ambiente de alta concorrência, mas para este app deve ser aceitável.
                // O ideal seria usar funções RPC do Supabase para incrementos atômicos.
                const { data: messageData, error: fetchError } = await supabaseClient
                    .from('messages')
                    .select('likes, dislikes')
                    .eq('id', messageId)
                    .single();

                if (fetchError) throw fetchError;

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
                
                app.mural.loadMensagens(); // Recarrega para mostrar a atualização

            } catch (error) {
                console.error(`Erro ao registrar ${reactionType}:`, error.message);
                // Não mostra alert para o usuário para reações, para não ser intrusivo.
            }
        }
    };

})(window.aprovaBACEN);
