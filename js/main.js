document.addEventListener('DOMContentLoaded', () => {
    const contentArea = document.getElementById('content-area');
    const mainNavLinks = document.querySelectorAll('#main-nav a');
    const initialSection = 'inicio.html'; // Seção a ser carregada inicialmente

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
            console.log(`HTML recebido para ${sectionUrl}:`, html.substring(0, 500) + (html.length > 500 ? "..." : "")); // Log do HTML recebido (primeiros 500 chars)
            
            if (contentArea) {
                console.log("Elemento contentArea encontrado. Inserindo HTML...");
                contentArea.innerHTML = html;
            } else {
                console.error("Elemento contentArea (com ID 'content-area') NÃO foi encontrado no DOM. Não é possível carregar a seção.");
                return; // Interrompe se a área de conteúdo não existe
            }
            
            setActiveLink(sectionUrl);
            // Após carregar o HTML, inicializa os scripts específicos da seção, se houver
            initializeSectionScripts(sectionUrl);
            // Reativa os ícones Lucide se a nova seção os utilizar
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } catch (error) {
            console.error('Erro ao carregar a seção:', error);
            contentArea.innerHTML = `<p class="text-red-500 text-center">Erro ao carregar o conteúdo. Tente novamente mais tarde.</p>`;
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
        // Remove listeners antigos para evitar duplicidade, se necessário (mais complexo)
        // Por ora, chamaremos as funções de inicialização diretamente
        switch (sectionUrl) {
            case 'inicio.html':
                if (typeof initInicioSection === 'function') initInicioSection();
                break;
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
    loadSection(hashSection || initialSection);
});

// Funções de inicialização de seção (serão definidas em interactive.js ou outros arquivos)
// Exemplo:
// function initInicioSection() { console.log('Seção Início Carregada e Scripts Inicializados'); }
// function initPalpitesSection() { console.log('Seção Palpites Carregada e Scripts Inicializados'); }
// etc.

// Funções globais que podem ser usadas por várias seções (ex: manipulação de datas, UI)
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
