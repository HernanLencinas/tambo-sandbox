/* const vscode = acquireVsCodeApi();

window.addEventListener('message', (event) => {
    const message = event.data;
    if (message.command === 'sandboxConnectionStatus') {

        const sPanelStatus = document.getElementById('sandboxPanelStatus');
        sPanelStatus.innerHTML = message.data;

        const buttons = sPanelStatus.querySelectorAll('.apps-button[data-link]');
        buttons.forEach(button => {
            button.addEventListener('click', (event) => {
                const link = button.getAttribute('data-link');
                if (link) {
                    vscode.postMessage({ command: 'openLink', link });
                }
            });
        });

    }
});

function createSandbox() {
    vscode.postMessage({ command: 'sandboxCreate' });
}

function destroySandbox() {
    vscode.postMessage({ command: 'sandboxDestroy' });
}

function updateSandboxData() {
    vscode.postMessage({ command: 'sandboxStatus' });
}

function cloneRepository() {
    vscode.postMessage({ command: 'cloneRepository' });
}

function sandboxChangeGroup(event, commit) {
    const selectedOption = event.target.options[event.target.selectedIndex];
    vscode.postMessage({
        command: 'sandboxChangeGroup',
        data: {
            name: selectedOption.dataset.name,
            path: selectedOption.value,
            repoid: selectedOption.dataset.repoid,
            commit: commit
        }
    });
}

//updateSandboxData();
setInterval(updateSandboxData, 3000);
 */

const vscode = acquireVsCodeApi();

// Manejar mensajes entrantes desde VS Code
window.addEventListener('message', ({ data: message }) => {
    if (message.command === 'sandboxConnectionStatus') {
        updateSandboxPanelStatus(message.data);
    }
});

// Actualizar el estado del panel sandbox
function updateSandboxPanelStatus(statusHtml) {
    const sPanelStatus = document.getElementById('sandboxPanelStatus');
    sPanelStatus.innerHTML = statusHtml;

    // Delegación de eventos para manejar clicks en botones con 'data-link'
    sPanelStatus.addEventListener('click', (event) => {
        const button = event.target.closest('.apps-button[data-link]');
        if (button) {
            const link = button.getAttribute('data-link');
            if (link) {
                vscode.postMessage({ command: 'openLink', link });
            }
        }
    });
}

// Enviar mensajes a VS Code
function sendMessage(command, data = {}) {
    vscode.postMessage({ command, ...data });
}

// Métodos para operaciones específicas
function createSandbox() {
    sendMessage('sandboxCreate');
}

function destroySandbox() {
    sendMessage('sandboxDestroy');
}

function updateSandboxData() {
    sendMessage('sandboxStatus');
}

function cloneRepository() {
    sendMessage('cloneRepository');
}

function sandboxChangeGroup(event, commit) {
    const { dataset, value } = event.target.options[event.target.selectedIndex];
    sendMessage('sandboxChangeGroup', {
        data: {
            name: dataset.name,
            path: value,
            repoid: dataset.repoid,
            commit
        }
    });
}

// Actualizar datos del sandbox periódicamente
setInterval(updateSandboxData, 3000);
