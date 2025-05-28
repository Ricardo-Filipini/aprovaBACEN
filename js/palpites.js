// js/palpites.js
// Gerenciamento de palpites, ranking e contagem regressiva

(function(app) {
    'use strict';

    // app.palpiteCountdownIntervals é inicializado em config.js

    app.palpites = {
        init: function() {
            // Adicionar listener ao widget de palpite que foi criado em auth.js
            const palpiteWidget = document.getElementById('user-palpite-widget');
            if (palpiteWidget) {
                palpiteWidget.addEventListener('click', app.palpites.togglePalpiteModal);
            }
            
            // Adicionar listeners aos elementos do modal de palpite
             const closePalpiteModalButton = document.getElementById('close-palpite-modal');
             if (closePalpiteModalButton) {
                 closePalpiteModalButton.addEventListener('click', app.palpites.togglePalpiteModal);
             }
             // O listener de clique fora do modal de palpite
             if (app.uiElements.palpiteModal) {
                app.uiElements.palpiteModal.addEventListener('click', (e) => { 
                    if (e.target.id === 'palpite-modal') app.palpites.togglePalpiteModal(); 
                });
             }

            console.log("Módulo Palpites inicializado.");
            // Carregar palpites iniciais
            this.loadPalpites();
            this.updateUserPalpiteWidget();
        },

        updateUserPalpiteWidget: function() {
            const palpiteWidget = document.getElementById('user-palpite-widget');
            const palpiteDateDisplay = document.getElementById('user-palpite-date-display');

            if (!palpiteWidget || !palpiteDateDisplay) return;

            if (app.currentUser.id !== 0 && app.currentUser.palpite) {
                const date = new Date(app.currentUser.palpite);
                // Ajuste para UTC para evitar problemas de fuso horário na exibição
                date.setUTCDate(date.getUTCDate() + 1); 
                palpiteDateDisplay.textContent = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year:'2-digit' });
                palpiteWidget.style.display = 'flex';
            } else if (app.currentUser.id !== 0 && !app.currentUser.palpite) {
                palpiteDateDisplay.textContent = 'Palpite?';
                palpiteWidget.style.display = 'flex';
            } else {
                palpiteWidget.style.display = 'none';
            }
        },

        togglePalpiteModal: function() {
            if (app.currentUser.id === 0) {
                alert("Identifique-se para gerenciar seu palpite.");
                if (app.auth && typeof app.auth.toggleAuthModal === 'function') {
                    app.auth.toggleAuthModal();
                }
                return;
            }
            const modal = app.uiElements.palpiteModal; // Usa referência cacheada
            if (modal) {
                modal.classList.toggle('hidden');
                if (!modal.classList.contains('hidden')) {
                    const palpiteDateInput = document.getElementById('palpite-date-input');
                    if (app.currentUser.palpite) {
                        const date = new Date(app.currentUser.palpite);
                        // Formato YYYY-MM-DD para input type="date"
                        const year = date.getUTCFullYear();
                        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                        const day = String(date.getUTCDate()).padStart(2, '0'); // Use getUTCDate
                        palpiteDateInput.value = `${year}-${month}-${day}`;
                    } else {
                        palpiteDateInput.value = '';
                    }
                    app.palpites.renderPalpiteModalActions();
                }
            }
        },

        renderPalpiteModalActions: function() {
            const actionsContainer = document.getElementById('palpite-modal-actions');
            if (!actionsContainer) return;
            actionsContainer.innerHTML = '';

            const saveButton = document.createElement('button');
            saveButton.id = 'save-palpite-btn';
            saveButton.className = 'bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md text-sm';
            saveButton.textContent = app.currentUser.palpite ? 'Atualizar Palpite' : 'Salvar Palpite';
            saveButton.addEventListener('click', app.palpites.handleSubmitPalpite);
            actionsContainer.appendChild(saveButton);

            if (app.currentUser.palpite) {
                const removeButton = document.createElement('button');
                removeButton.id = 'remove-palpite-modal-btn';
                removeButton.className = 'bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-md text-sm';
                removeButton.textContent = 'Remover';
                removeButton.addEventListener('click', app.palpites.handleRemovePalpite);
                actionsContainer.appendChild(removeButton);
            }
        },

        handleSubmitPalpite: async function() {
            if (app.currentUser.id === 0) {
                alert('Você precisa estar identificado para registrar um palpite.');
                app.palpites.togglePalpiteModal();
                if (app.auth && typeof app.auth.toggleAuthModal === 'function') app.auth.toggleAuthModal();
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
                    .eq('id', app.currentUser.id)
                    .select()
                    .single();

                if (error) throw error;

                if (data) {
                    app.currentUser.palpite = data.palpite;
                    alert('Palpite registrado/atualizado com sucesso!');
                    app.palpites.updateUserPalpiteWidget();
                    app.palpites.loadPalpites();
                    app.palpites.togglePalpiteModal();
                }
            } catch (error) {
                console.error('Erro ao registrar palpite:', error.message);
                alert('Falha ao registrar o palpite. Tente novamente.');
            }
        },

        handleRemovePalpite: async function() {
            if (app.currentUser.id === 0 || !app.currentUser.palpite) return;

            if (!confirm('Tem certeza que deseja remover seu palpite?')) {
                return;
            }

            try {
                const { data, error } = await supabaseClient
                    .from('user')
                    .update({ palpite: null })
                    .eq('id', app.currentUser.id)
                    .select()
                    .single();

                if (error) throw error;

                app.currentUser.palpite = null;
                alert('Palpite removido com sucesso.');
                app.palpites.updateUserPalpiteWidget();
                app.palpites.loadPalpites();
                app.palpites.togglePalpiteModal();
            } catch (error) {
                console.error('Erro ao remover palpite:', error.message);
                alert('Falha ao remover o palpite. Tente novamente.');
            }
        },

        loadPalpites: async function() {
            if (!supabaseClient) {
                console.warn("Supabase client não inicializado ao tentar carregar palpites (palpites.js).");
                if(app.uiElements.rankingDisplayArea) app.uiElements.rankingDisplayArea.innerHTML = '<p class="text-sm text-orange-500">Conexão com ranking indisponível.</p>';
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

                app.palpites.renderRanking(sortedDates);
                app.palpites.renderTop3Countdowns(sortedDates.slice(0, 3));

            } catch (error) {
                console.error('Erro ao carregar palpites:', error.message);
                if(app.uiElements.rankingDisplayArea) app.uiElements.rankingDisplayArea.innerHTML = '<p class="text-sm text-red-500">Erro ao carregar ranking de palpites.</p>';
            }
        },

        renderRanking: function(sortedPalpiteDates) {
            if(!app.uiElements.rankingDisplayArea) return;
            app.uiElements.rankingDisplayArea.innerHTML = '';
            if (!sortedPalpiteDates || sortedPalpiteDates.length === 0) {
                app.uiElements.rankingDisplayArea.innerHTML = '<p class="text-sm text-gray-600">Ainda não há palpites registrados.</p>';
                return;
            }

            const list = document.createElement('ul');
            list.className = 'space-y-2';

            sortedPalpiteDates.slice(0, 10).forEach((pData, index) => {
                const listItem = document.createElement('li');
                listItem.className = 'p-3 rounded-md flex justify-between items-center text-sm bg-gray-50 hover:bg-gray-100 cursor-pointer relative group';
                
                const palpiteDate = new Date(pData.date);
                palpiteDate.setUTCDate(palpiteDate.getUTCDate() + 1); // Ajuste UTC

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
            app.uiElements.rankingDisplayArea.appendChild(list);
        },

        renderTop3Countdowns: function(top3PalpiteDates) {
            if(!app.uiElements.top3CountdownArea) return;
            Object.values(app.palpiteCountdownIntervals).forEach(clearInterval);
            for (const key in app.palpiteCountdownIntervals) {
                delete app.palpiteCountdownIntervals[key];
            }

            app.uiElements.top3CountdownArea.innerHTML = '<h4 class="text-md font-semibold text-orange-600 mb-2">Contagem Regressiva (Top 3 Datas):</h4>';
            if (!top3PalpiteDates || top3PalpiteDates.length === 0) {
                app.uiElements.top3CountdownArea.innerHTML += '<p class="text-sm text-gray-500">Sem palpites no Top 3 para contagem.</p>';
                return;
            }

            top3PalpiteDates.forEach((pData, index) => {
                const palpiteDate = new Date(pData.date);
                palpiteDate.setUTCDate(palpiteDate.getUTCDate() + 1); // Ajuste UTC
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
                app.uiElements.top3CountdownArea.appendChild(countdownDiv);
                
                const intervalId = setInterval(() => {
                    app.palpites.updateSinglePalpiteCountdown(targetTime, `top3-${dateIdSuffix}-days`, `top3-${dateIdSuffix}-hours`, `top3-${dateIdSuffix}-minutes`, `top3-${dateIdSuffix}-seconds`, `countdown-top3-${dateIdSuffix}`);
                }, 1000);
                app.palpiteCountdownIntervals[`countdown-top3-${dateIdSuffix}`] = intervalId;
                app.palpites.updateSinglePalpiteCountdown(targetTime, `top3-${dateIdSuffix}-days`, `top3-${dateIdSuffix}-hours`, `top3-${dateIdSuffix}-minutes`, `top3-${dateIdSuffix}-seconds`, `countdown-top3-${dateIdSuffix}`);
            });
        },

        updateSinglePalpiteCountdown: function(targetTime, daysId, hoursId, minutesId, secondsId, containerId) {
            const now = new Date().getTime();
            const distance = targetTime - now;
            
            const elDays = document.getElementById(daysId);
            const elHours = document.getElementById(hoursId);
            const elMinutes = document.getElementById(minutesId);
            const elSeconds = document.getElementById(secondsId);
            const elContainer = document.getElementById(containerId);

            if (!elDays || !elHours || !elMinutes || !elSeconds || !elContainer) {
                if (app.palpiteCountdownIntervals[containerId]) {
                    clearInterval(app.palpiteCountdownIntervals[containerId]);
                    delete app.palpiteCountdownIntervals[containerId];
                }
                return;
            }

            if (distance < 0) {
                elContainer.innerHTML = `<span class='text-sm font-semibold text-red-500'>Prazo Atingido!</span>`;
                if (app.palpiteCountdownIntervals[containerId]) {
                    clearInterval(app.palpiteCountdownIntervals[containerId]);
                    delete app.palpiteCountdownIntervals[containerId];
                }
                return;
            }
            elDays.textContent = String(Math.floor(distance / (1000 * 60 * 60 * 24))).padStart(2, '0');
            elHours.textContent = String(Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0');
            elMinutes.textContent = String(Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
            elSeconds.textContent = String(Math.floor((distance % (1000 * 60)) / 1000)).padStart(2, '0');
        }
    };

})(window.aprovaBACEN);
