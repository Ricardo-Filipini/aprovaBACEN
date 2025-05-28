document.addEventListener('DOMContentLoaded', () => {
    const contentArea = document.getElementById('content-area');
    const mainNavLinks = document.querySelectorAll('#main-nav a');
    const initialSection = 'palpites_contagem.html'; // Nova seção inicial

    // Função para carregar o conteúdo da seção
    async function loadSection(sectionUrl) {
        try {
            // Adiciona um timestamp para evitar cache em alguns navegadores/cenários
            const response = await fetch(`sections/${sectionUrl}?v=${new Date().getTime()}`);
            if (!response.ok) {
                console.error(`Falha ao buscar ${sectionUrl}. Status: ${response.status}`);
                throw new Error(`HTTP error! status: ${response.status} ao carregar ${sectionUrl}`);
            }
            const html = await response.text();
            // console.log(`HTML recebido para ${sectionUrl}:`, html.substring(0, 200) + "..."); // Log de depuração reduzido ou removido
            
            if (contentArea) {
                // console.log("Elemento contentArea encontrado. Inserindo HTML..."); // Log de depuração removido
                contentArea.innerHTML = html;
            } else {
                console.error("CRITICAL: Elemento #content-area NÃO foi encontrado no DOM. Não é possível carregar seções.");
                return; 
            }
            
            setActiveLink(sectionUrl);
            initializeSectionScripts(sectionUrl);
            
            if (typeof lucide !== 'undefined') {
                lucide.createIcons(); // Garante que ícones em novo conteúdo sejam renderizados
            }
        } catch (error) {
            console.error(`Erro ao carregar a seção ${sectionUrl}:`, error);
            if (contentArea) { // Verifica se contentArea existe antes de tentar usá-lo
                contentArea.innerHTML = `<p class="text-red-500 text-center p-4">Erro ao carregar a seção '${sectionUrl}'. Verifique o console para mais detalhes.</p>`;
            }
        }
    }

    // Define o link ativo na navegação
    function setActiveLink(sectionUrl) {
        mainNavLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').substring(1) === sectionUrl) {
                link.classList.add('active');
            }
        });
    }

    // Lógica de navegação
    mainNavLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const sectionUrl = link.getAttribute('href').substring(1); // Remove o '#'
            loadSection(sectionUrl);
            // Atualiza a URL na barra de endereço (opcional, para melhor UX e bookmarking)
            history.pushState({ section: sectionUrl }, "", `#${sectionUrl}`);
        });
    });

    // Lida com o botão Voltar/Avançar do navegador
    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.section) {
            loadSection(event.state.section);
        } else {
            // Se não houver estado, carrega a seção inicial ou a que estiver no hash
            const hashSection = window.location.hash.substring(1);
            loadSection(hashSection || initialSection);
        }
    });

    // Função para inicializar scripts específicos de cada seção
    function initializeSectionScripts(sectionUrl) {
        // console.log(`Tentando inicializar scripts para: ${sectionUrl}`); // Log de depuração removido
        switch (sectionUrl) {
            // case 'inicio.html': // Removido pois sections/inicio.html será removida
            // if (typeof initInicioSection === 'function') initInicioSection();
            // break;
            case 'palpites_contagem.html':
                if (typeof initPalpitesSection === 'function') initPalpitesSection();
                break;
            case 'enquete_otimismo.html':
                if (typeof initEnqueteSection === 'function') initEnqueteSection();
                break;
            case 'mural_mensagens.html':
                if (typeof initMuralSection === 'function') initMuralSection();
                break;
            case 'motivos_autorizacao.html':
                // Se houver scripts específicos para esta seção adaptada
                if (typeof initMotivosSection === 'function') initMotivosSection();
                break;
            case 'metodologia_estimativa.html':
                 // Se houver scripts específicos para esta seção adaptada
                if (typeof initMetodologiaSection === 'function') initMetodologiaSection();
                break;
            // Adicionar outros casos conforme necessário
        }
    }

    // Carrega a seção inicial ou a definida pelo hash na URL
    const hashSection = window.location.hash.substring(1);
    // Garante que setupGlobalUserIdentification seja chamado uma vez que o DOM principal está pronto.
    // Isso já é feito no script inline do Index.html, mas podemos garantir aqui também se necessário,
    // embora o DOMContentLoaded do Index.html seja o local mais apropriado.
    if (typeof setupGlobalUserIdentification === 'function' && !document.body.dataset.globalIdentSetup) {
         // setupGlobalUserIdentification(); // Chamado no Index.html
         document.body.dataset.globalIdentSetup = 'true'; // Evita múltiplas chamadas
    }

    loadSection(hashSection || initialSection);
});

// Funções globais que podem ser usadas por várias seções
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// Botão Voltar ao Topo (se for mantido do código original)
const toTopBtn = document.getElementById("toTopBtn");
if (toTopBtn) {
    window.onscroll = function() { scrollFunction() };
    function scrollFunction() {
      if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
        toTopBtn.style.display = "block";
      } else {
        toTopBtn.style.display = "none";
      }
    }
    toTopBtn.addEventListener('click', () => {
        window.scrollTo({top: 0, behavior: 'smooth'});
    });
}
