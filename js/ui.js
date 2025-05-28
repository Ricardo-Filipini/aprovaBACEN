// js/ui.js
// Funções e elementos de UI reutilizáveis

(function(app) {
    'use strict';

    // Cache de elementos da UI para evitar múltiplas buscas no DOM
    // Estes serão preenchidos em app.initUI() ou conforme necessário
    app.uiElements = {
        authWidgetContainer: null,
        enqueteOptionsArea: null,
        muralPostArea: null,
        rankingDisplayArea: null,
        top3CountdownArea: null,
        enqueteChartCanvas: null,
        muralMensagensDisplay: null,
        authModal: null,
        palpiteModal: null,
        // Adicione outros elementos conforme necessário
    };

    // Função para inicializar/buscar os elementos da UI
    // Chamada em app.js no DOMContentLoaded
    app.initUIElements = function() {
        app.uiElements.authWidgetContainer = document.getElementById('auth-widget-container');
        app.uiElements.enqueteOptionsArea = document.getElementById('enquete-options-area');
        app.uiElements.muralPostArea = document.getElementById('mural-post-area');
        app.uiElements.rankingDisplayArea = document.getElementById('ranking-display-area');
        app.uiElements.top3CountdownArea = document.getElementById('top3-countdown-area');
        app.uiElements.enqueteChartCanvas = document.getElementById('enqueteChart');
        app.uiElements.muralMensagensDisplay = document.getElementById('mural-mensagens-display');
        
        // Modais são criados dinamicamente em auth.js, mas podemos referenciá-los aqui se necessário após criação
        // app.uiElements.authModal = document.getElementById('auth-modal');
        // app.uiElements.palpiteModal = document.getElementById('palpite-modal');
        console.log("Elementos da UI referenciados em ui.js");
    };
    
    // Exemplo de uma função de UI genérica (se houver)
    // app.utils.showLoadingSpinner = function(elementId) { ... };
    // app.utils.hideLoadingSpinner = function(elementId) { ... };

    // Funções de toggle para modais (podem ser movidas para cá se forem usadas por múltiplos módulos)
    // Por enquanto, toggleAuthModal e togglePalpiteModal estão em auth.js e palpites.js respectivamente,
    // pois são mais específicas. Se precisarmos de um toggle genérico, podemos adicioná-lo aqui.

})(window.aprovaBACEN);
