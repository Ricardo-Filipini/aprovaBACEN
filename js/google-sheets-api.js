// URL do seu Google Apps Script Web App
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz6qXq4Q2Qo2r1F_z0MrhenPcxJsWdr24Mt3LuJLCdjbXG9hAgGMugzTFjjN_x5f87xQA/exec';

/**
 * Busca todos os dados de uma planilha específica.
 * @param {string} sheetName - O nome da aba da planilha (ex: "cadastro", "enquete", "mensagens").
 * @returns {Promise<Array<Object>>} Uma promessa que resolve com um array de objetos representando as linhas.
 */
async function fetchSheetData(sheetName) {
    const url = `${SCRIPT_URL}?action=readAll&sheetName=${encodeURIComponent(sheetName)}`;
    try {
        const response = await fetch(url, { method: 'GET', redirect: 'follow' });
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Erro HTTP ${response.status} ao buscar dados de ${sheetName}: ${errorText}`);
            throw new Error(`Erro ao buscar dados de ${sheetName}: ${response.status}`);
        }
        const result = await response.json();
        if (result.success && result.data) {
            return result.data;
        } else {
            console.error(`Erro na resposta da API ao buscar dados de ${sheetName}:`, result.error || 'Erro desconhecido');
            throw new Error(result.error || `Falha ao buscar dados de ${sheetName}.`);
        }
    } catch (error) {
        console.error(`Erro de rede ou parsing ao buscar dados de ${sheetName}:`, error);
        throw error; // Re-throw para que a função chamadora possa tratar
    }
}

/**
 * Envia dados para uma planilha específica usando o método POST.
 * @param {string} sheetName - O nome da aba da planilha.
 * @param {string} action - A ação a ser executada pelo Apps Script (ex: "checkOrAddUser", "appendRow").
 * @param {Object} payload - Os dados a serem enviados para o Apps Script.
 * @returns {Promise<Object>} Uma promessa que resolve com a resposta do Apps Script.
 */
async function postDataToSheet(sheetName, action, payload) {
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'cors', // Necessário para requisições cross-origin para Apps Script
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sheetName, action, payload }),
            redirect: 'follow'
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Erro HTTP ${response.status} ao enviar dados para ${sheetName} (ação ${action}): ${errorText}`);
            throw new Error(`Erro ao enviar dados para ${sheetName}: ${response.status}`);
        }
        const result = await response.json();
        if (result.success) {
            return result.data;
        } else {
            console.error(`Erro na resposta da API ao enviar dados para ${sheetName} (ação ${action}):`, result.error || 'Erro desconhecido', result.details);
            throw new Error(result.error || `Falha ao enviar dados para ${sheetName}.`);
        }
    } catch (error) {
        console.error(`Erro de rede ou parsing ao enviar dados para ${sheetName} (ação ${action}):`, error);
        throw error; // Re-throw para que a função chamadora possa tratar
    }
}

// --- Funções específicas para cada tipo de interação ---

// CADASTRO
async function checkOrAddUser(nome) {
    return postDataToSheet(SHEET_NAMES.CADASTRO, 'checkOrAddUser', { nome });
}

async function updateUserPalpite(userId, palpite) {
    return postDataToSheet(SHEET_NAMES.CADASTRO, 'updateUserPalpite', { id: userId, palpite });
}

async function getAllUsers() {
    return fetchSheetData(SHEET_NAMES.CADASTRO);
}


// ENQUETE
async function addEnqueteVote(idUsuario, voto) {
    const timestampz = new Date().toISOString();
    // Payload deve ser um array na ordem das colunas da planilha 'enquete': id, voto, timestampz
    const payload = [idUsuario, voto, timestampz];
    return postDataToSheet(SHEET_NAMES.ENQUETE, 'appendRow', payload);
}

async function getAllEnqueteVotes() {
    return fetchSheetData(SHEET_NAMES.ENQUETE);
}

// MENSAGENS
async function addMensagem(idUsuario, mensagem) {
    const timestampz = new Date().toISOString();
    // Payload deve ser um array na ordem das colunas da planilha 'mensagens': id, mensagem, timestampz
    const payload = [idUsuario, mensagem, timestampz];
    return postDataToSheet(SHEET_NAMES.MENSAGENS, 'appendRow', payload);
}

async function getAllMensagens() {
    return fetchSheetData(SHEET_NAMES.MENSAGENS);
}

// Nomes das planilhas (para evitar erros de digitação)
const SHEET_NAMES = {
    CADASTRO: 'cadastro',
    ENQUETE: 'enquete',
    MENSAGENS: 'mensagens'
};

// Exemplo de como usar (para teste no console do navegador, por exemplo):
// (async () => {
//     try {
//         console.log("Buscando todos os usuários...");
//         const users = await getAllUsers();
//         console.log("Usuários:", users);

//         console.log("Tentando cadastrar/checar usuário 'Teste API JS'...");
//         const userResult = await checkOrAddUser("Teste API JS");
//         console.log("Resultado Cadastro/Check:", userResult);
//         const userId = userResult.user.id;

//         if (userId !== undefined) {
//             console.log(`Atualizando palpite para usuário ID ${userId}...`);
//             const palpiteResult = await updateUserPalpite(userId, new Date().toISOString().split('T')[0]);
//             console.log("Resultado Palpite:", palpiteResult);

//             console.log("Adicionando voto na enquete...");
//             const enqueteResult = await addEnqueteVote(userId, "Super Otimista");
//             console.log("Resultado Enquete:", enqueteResult);

//             console.log("Adicionando mensagem...");
//             const mensagemResult = await addMensagem(userId, "Olá do script google-sheets-api.js!");
//             console.log("Resultado Mensagem:", mensagemResult);
//         }

//         console.log("Buscando todos os votos da enquete...");
//         const enquetes = await getAllEnqueteVotes();
//         console.log("Enquetes:", enquetes);

//         console.log("Buscando todas as mensagens...");
//         const mensagens = await getAllMensagens();
//         console.log("Mensagens:", mensagens);

//     } catch (error) {
//         console.error("Erro nos testes da API Google Sheets:", error);
//     }
// })();
