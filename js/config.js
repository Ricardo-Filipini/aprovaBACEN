// Arquivo de Configuração Global

// Constantes do Supabase
const SUPABASE_URL = "https://nrmkbqbuuytwiuweedfy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ybWticWJ1dXl0d2l1d2VlZGZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0MzgwODAsImV4cCI6MjA2NDAxNDA4MH0.r-J894pdUHE3uqwhBJIj5_jRR1ZKHwTDIfLWS7VNYK8";

// Inicialização do Cliente Supabase (será acessado globalmente)
let supabaseClient;
if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase client instance inicializada em config.js.');
} else {
    console.error('Supabase SDK não encontrado ou createClient não é uma função em config.js.');
    // Adiciona um aviso visual mais proeminente se o SDK falhar ao carregar
    document.addEventListener('DOMContentLoaded', () => {
        const body = document.querySelector('body');
        if (body) {
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
            errorDiv.textContent = 'Erro crítico: Não foi possível carregar o SDK do banco de dados (config.js).';
            body.prepend(errorDiv);
        }
    });
}

// Opções da Enquete (usadas em enquete.js e app.js)
const OPCOES_ENQUETE = [
    { label: 'Super Otimista', value: 'Super Otimista', icon: '😊' },
    { label: 'Otimista', value: 'Otimista', icon: '🙂' },
    { label: 'Realista', value: 'Realista', icon: '😐' },
    { label: 'Pessimista', value: 'Pessimista', icon: '😟' },
    { label: 'Mar céu lar', value: 'Mar céu lar', icon: '🌊' }
];

// Objeto global para namespace da aplicação, se necessário para organizar funções
window.aprovaBACEN = {
    // currentUser será gerenciado em auth.js, mas pode ser parte deste namespace
    currentUser: { id: 0, name: 'Anônimo', palpite: null, voto: null },
    // Elementos da UI podem ser armazenados aqui ou buscados conforme necessário
    uiElements: {},
    // Intervalos de contagem regressiva
    palpiteCountdownIntervals: {}
};
