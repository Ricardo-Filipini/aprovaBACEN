// js/enquete.js
// Gerenciamento da enquete de otimismo

(function(app) {
    'use strict';

    let enqueteChartInstance = null; // Instância do gráfico da enquete

    app.enquete = {
        init: function() {
            // A área de opções da enquete (enqueteOptionsArea) é buscada em ui.js
            // O canvas do gráfico (enqueteChartCanvas) também.
            console.log("Módulo Enquete inicializado.");
            this.updateEnqueteSection(); // Renderiza botões de voto
            this.loadEnqueteResults();   // Carrega e renderiza o gráfico
        },

        updateEnqueteSection: async function() {
            console.log('[enquete.js] updateEnqueteSection chamada. currentUser:', app.currentUser, 'OPCOES_ENQUETE:', OPCOES_ENQUETE);
            if (!app.uiElements.enqueteOptionsArea) {
                console.error("Elemento enqueteOptionsArea não encontrado (enquete.js).");
                return;
            }
            app.uiElements.enqueteOptionsArea.innerHTML = '';
            
            if (app.currentUser.id === 0) {
                app.uiElements.enqueteOptionsArea.innerHTML = `
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
                    button.addEventListener('click', () => {
                        if (app.auth && typeof app.auth.toggleAuthModal === 'function') {
                            app.auth.toggleAuthModal();
                        }
                    });
                });
                return;
            }
            
            const userVote = app.currentUser.voto;

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
                button.addEventListener('click', () => app.enquete.handleSubmitEnqueteVoto(opcao.value));
                optionsContainer.appendChild(button);
            });
            app.uiElements.enqueteOptionsArea.appendChild(optionsContainer);

            // Criar e adicionar a mensagem de status separadamente para não recriar os botões e perder listeners
            const statusMessageParagraph = document.createElement('p');
            statusMessageParagraph.className = 'text-center text-xs text-gray-600 mt-3';
            if (userVote) {
                statusMessageParagraph.innerHTML = `Seu voto: <span class="font-semibold">${userVote}</span>. Clique em outra opção para mudar.`;
            } else {
                statusMessageParagraph.innerHTML = `Escolha uma opção para registrar seu sentimento!`;
            }
            app.uiElements.enqueteOptionsArea.appendChild(statusMessageParagraph);
        },

        handleSubmitEnqueteVoto: async function(novoVoto) {
            console.log('[enquete.js] handleSubmitEnqueteVoto chamada com voto:', novoVoto, 'currentUser:', app.currentUser);
            if (app.currentUser.id === 0) {
                alert('Você precisa estar identificado para votar.');
                if (app.auth && typeof app.auth.toggleAuthModal === 'function') app.auth.toggleAuthModal();
                return;
            }

            const votoParaSalvar = (app.currentUser.voto === novoVoto) ? null : novoVoto;
            console.log('[enquete.js] Voto atual:', app.currentUser.voto, 'Novo voto:', novoVoto, 'Voto para salvar:', votoParaSalvar);

            try {
                console.log('[enquete.js] Dados para Supabase:', { voto: votoParaSalvar, userId: app.currentUser.id });
                const { data, error } = await supabaseClient
                    .from('user')
                    .update({ voto: votoParaSalvar })
                    .eq('id', app.currentUser.id)
                    .select('id, name, palpite, voto')
                    .single();

                if (error) throw error;

                if (data) {
                    app.currentUser.voto = data.voto;
                    if (votoParaSalvar === null) {
                        alert('Voto removido com sucesso!');
                    } else { // Cobre tanto o caso de novo voto quanto de atualização
                        alert('Voto registrado/atualizado com sucesso!');
                    }
                } else {
                    throw new Error("Usuário não encontrado após atualização do voto.");
                }
                
                await app.enquete.updateEnqueteSection();
                await app.enquete.loadEnqueteResults();

            } catch (error) {
                console.error('Erro ao registrar/atualizar voto na tabela user:', error.message);
                alert('Falha ao registrar/atualizar seu voto. Tente novamente.');
            }
        },

        loadEnqueteResults: async function() {
            if (!supabaseClient) {
                console.warn("Supabase client não inicializado ao tentar carregar resultados da enquete (enquete.js).");
                if (app.uiElements.enqueteChartCanvas && !enqueteChartInstance) {
                     const ctx = app.uiElements.enqueteChartCanvas.getContext('2d');
                     if(ctx) {
                        ctx.clearRect(0, 0, app.uiElements.enqueteChartCanvas.width, app.uiElements.enqueteChartCanvas.height);
                        ctx.font = "12px Inter"; ctx.fillStyle = "gray"; ctx.textAlign = "center";
                        ctx.fillText("Carregando dados da enquete...", app.uiElements.enqueteChartCanvas.width / 2, app.uiElements.enqueteChartCanvas.height / 2);
                     }
                }
                return;
            }
            try {
                const { data: usersComVotos, error } = await supabaseClient
                    .from('user')
                    .select('name, voto')
                    .not('voto', 'is', null);

                if (error) throw error;

                const resultados = OPCOES_ENQUETE.reduce((acc, opcao) => {
                    acc[opcao.value] = { count: 0, users: [] };
                    return acc;
                }, {});

                usersComVotos.forEach(user => {
                    if (user.voto && resultados.hasOwnProperty(user.voto)) {
                        resultados[user.voto].count++;
                        if (user.name) {
                             resultados[user.voto].users.push(user.name);
                        }
                    }
                });
                // app.enquete.renderEnqueteChart(resultados); // Movido para depois de buscar todos os usuários

                // Buscar todos os usuários para identificar os indecisos
                const { data: allUsers, error: allError } = await supabaseClient
                    .from('user')
                    .select('id, name, voto');

                if (allError) throw allError;

                const usuariosVotantesIds = new Set(usersComVotos.map(u => u.id)); // Supondo que usersComVotos tenha 'id'
                // Se usersComVotos não tiver ID, precisaremos ajustar a lógica de como identificar quem votou.
                // Por agora, vamos assumir que a query de usersComVotos pode ser ajustada para incluir 'id' ou que 'name' é único e suficiente.
                // Para uma melhor abordagem, a query de usersComVotos deveria ser: .select('id, name, voto')

                // Ajuste na query de usersComVotos para incluir ID, se não estiver lá:
                // Esta é uma correção conceitual, a query original já pega 'name' e 'voto'.
                // A query para usersComVotos já é: .select('name, voto').not('voto', 'is', null);
                // Para identificar indecisos corretamente, precisamos de todos os usuários e seus votos.
                // A query `allUsers` já faz isso.

                const usuariosIndecisos = allUsers.filter(user => user.voto === null || user.voto === undefined)
                                                 .map(user => user.name || 'Anônimo');


                app.enquete.renderEnqueteChart(resultados); // Renderiza o gráfico primeiro
                app.enquete.renderUserSentimentDisplay(resultados, usuariosIndecisos); // Depois renderiza a lista de usuários

            } catch (error) {
                console.error('Erro ao carregar resultados da enquete ou lista de usuários:', error.message);
                if (app.uiElements.enqueteChartCanvas) {
                    const ctx = app.uiElements.enqueteChartCanvas.getContext('2d');
                    if (ctx) {
                        ctx.clearRect(0, 0, app.uiElements.enqueteChartCanvas.width, app.uiElements.enqueteChartCanvas.height);
                        ctx.font = "14px Inter";
                        ctx.fillStyle = "red";
                        ctx.textAlign = "center";
                        ctx.fillText("Erro ao carregar dados da enquete.", app.uiElements.enqueteChartCanvas.width / 2, app.uiElements.enqueteChartCanvas.height / 2);
                    }
                }
            }
        },

        renderEnqueteChart: function(resultados) {
            if (!app.uiElements.enqueteChartCanvas) {
                console.warn("Canvas da enquete não encontrado para renderizar gráfico (enquete.js).");
                return;
            }
            const ctx = app.uiElements.enqueteChartCanvas.getContext('2d');
            if (!ctx) {
                console.warn("Contexto 2D do canvas da enquete não pôde ser obtido (enquete.js).");
                return;
            }

            const labels = OPCOES_ENQUETE.map(opt => opt.label);
            const dataCounts = OPCOES_ENQUETE.map(opt => resultados[opt.value]?.count || 0);
            const totalVotes = dataCounts.reduce((sum, count) => sum + count, 0);

            const chartData = {
                labels: labels,
                datasets: [{
                    label: 'Votos',
                    data: dataCounts,
                    backgroundColor: [
                        'rgba(34, 197, 94, 0.8)',  // Super Otimista
                        'rgba(16, 185, 129, 0.7)', // Otimista
                        'rgba(59, 130, 246, 0.7)', // Realista
                        'rgba(249, 115, 22, 0.7)', // Pessimista
                        'rgba(107, 114, 128, 0.7)' // Mar céu lar
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
                        labels: { font: { family: 'Inter', size: 11 }, padding: 10, boxWidth: 12 }
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
                    }
                    // ChartDataLabels plugin não é usado aqui, conforme original
                }
            };

            if (enqueteChartInstance) {
                enqueteChartInstance.destroy();
            }
            
            // Verifica se Chart está disponível globalmente
            if (typeof Chart === 'undefined') {
                console.error("Chart.js não está carregado. Não é possível renderizar o gráfico da enquete.");
                ctx.clearRect(0, 0, app.uiElements.enqueteChartCanvas.width, app.uiElements.enqueteChartCanvas.height);
                ctx.font = "14px Inter"; ctx.fillStyle = "red"; ctx.textAlign = "center";
                ctx.fillText("Erro: Biblioteca de gráficos (Chart.js) não encontrada.", app.uiElements.enqueteChartCanvas.width / 2, app.uiElements.enqueteChartCanvas.height / 2);
                return;
            }

            enqueteChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: chartData,
                options: chartOptions
            });
        },

        renderUserSentimentDisplay: function(sentimentosAgrupados, usuariosIndecisos) {
            const displayArea = document.getElementById('user-sentiment-breakdown');
            if (!displayArea) {
                console.error("Elemento user-sentiment-breakdown não encontrado.");
                return;
            }
            displayArea.innerHTML = ''; // Limpa a área antes de renderizar

            const gridContainer = document.createElement('div');
            gridContainer.className = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm';

            // Colunas para cada sentimento
            OPCOES_ENQUETE.forEach(opcao => {
                const columnDiv = document.createElement('div');
                columnDiv.className = 'p-3 bg-gray-50 rounded-lg shadow';
                
                const titleContainer = document.createElement('div');
                titleContainer.className = 'flex justify-between items-center mb-2';

                const title = document.createElement('h4');
                title.className = 'font-semibold text-gray-700 flex items-center';
                title.innerHTML = `<span class="mr-2 text-lg">${opcao.icon}</span> ${opcao.label}`;
                
                const expandButton = document.createElement('button');
                expandButton.className = 'text-gray-500 hover:text-gray-700 text-lg';
                expandButton.innerHTML = '➕'; // Ícone para expandir
                expandButton.setAttribute('aria-expanded', 'false');
                expandButton.setAttribute('title', 'Mostrar/Ocultar lista de usuários');

                titleContainer.appendChild(title);
                titleContainer.appendChild(expandButton);
                columnDiv.appendChild(titleContainer);

                const userList = document.createElement('ul');
                userList.className = 'list-disc list-inside text-gray-600 space-y-1 pl-1 hidden'; // Adicionado 'hidden'
                
                const usersForOption = sentimentosAgrupados[opcao.value]?.users || [];
                if (usersForOption.length > 0) {
                    usersForOption.forEach(userName => {
                        const listItem = document.createElement('li');
                        listItem.textContent = userName;
                        userList.appendChild(listItem);
                    });
                } else {
                    const listItem = document.createElement('li');
                    listItem.className = 'text-gray-400 italic';
                    listItem.textContent = 'Ninguém por enquanto.';
                    userList.appendChild(listItem);
                }
                columnDiv.appendChild(userList);

                expandButton.addEventListener('click', () => {
                    const isExpanded = userList.classList.toggle('hidden');
                    expandButton.innerHTML = isExpanded ? '➕' : '➖';
                    expandButton.setAttribute('aria-expanded', !isExpanded);
                });

                gridContainer.appendChild(columnDiv);
            });

            // Coluna para Indecisos
            const indecisosColumnDiv = document.createElement('div');
            indecisosColumnDiv.className = 'p-3 bg-gray-50 rounded-lg shadow';
            
            const indecisosTitleContainer = document.createElement('div');
            indecisosTitleContainer.className = 'flex justify-between items-center mb-2';

            const indecisosTitle = document.createElement('h4');
            indecisosTitle.className = 'font-semibold text-gray-700 flex items-center';
            indecisosTitle.innerHTML = `<span class="mr-2 text-lg">🤔</span> Indecisos`;

            const indecisosExpandButton = document.createElement('button');
            indecisosExpandButton.className = 'text-gray-500 hover:text-gray-700 text-lg';
            indecisosExpandButton.innerHTML = '➕';
            indecisosExpandButton.setAttribute('aria-expanded', 'false');
            indecisosExpandButton.setAttribute('title', 'Mostrar/Ocultar lista de usuários');

            indecisosTitleContainer.appendChild(indecisosTitle);
            indecisosTitleContainer.appendChild(indecisosExpandButton);
            indecisosColumnDiv.appendChild(indecisosTitleContainer);

            const indecisosUserList = document.createElement('ul');
            indecisosUserList.className = 'list-disc list-inside text-gray-600 space-y-1 pl-1 hidden'; // Adicionado 'hidden'

            if (usuariosIndecisos.length > 0) {
                usuariosIndecisos.forEach(userName => {
                    const listItem = document.createElement('li');
                    listItem.textContent = userName;
                    indecisosUserList.appendChild(listItem);
                });
            } else {
                const listItem = document.createElement('li');
                listItem.className = 'text-gray-400 italic';
                listItem.textContent = 'Ninguém por enquanto.';
                indecisosUserList.appendChild(listItem);
            }
            indecisosColumnDiv.appendChild(indecisosUserList);

            indecisosExpandButton.addEventListener('click', () => {
                const isExpanded = indecisosUserList.classList.toggle('hidden');
                indecisosExpandButton.innerHTML = isExpanded ? '➕' : '➖';
                indecisosExpandButton.setAttribute('aria-expanded', !isExpanded);
            });

            gridContainer.appendChild(indecisosColumnDiv);

            displayArea.appendChild(gridContainer);
        }
    };

})(window.aprovaBACEN);
