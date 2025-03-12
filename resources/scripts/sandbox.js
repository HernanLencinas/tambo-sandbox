// file deepcode ignore InsufficientPostmessageValidation: <please specify a reason of ignoring this>
const vscode = acquireVsCodeApi();

const previousState = vscode.getState();
const sPanelStatus = document.getElementById('sandboxPanelStatus');

if (previousState) {
    sPanelStatus.innerHTML = previousState;
}

// Manejar mensajes entrantes desde VS Code
window.addEventListener('message', ({ data: message }) => {
    if (message.command === 'sandboxConnectionStatus') {
        updateSandboxPanelStatus(message.data);
        saveState(message.data);
    }
    if (message.command === 'destroyingStatus') {
        const button = document.getElementById('destroySandboxButton');
        const spinner = document.getElementById('destroySandboxSpinner');
        const buttonText = document.getElementById('destroySandboxButtonText');
        button.disabled = true;
        spinner.style.display = 'block';
        buttonText.textContent = 'DESTRUYENDO WORKSPACE...';
    }
    if (message.command === 'deployingStatus') {
        const button = document.getElementById('deploySandboxButton');
        const spinner = document.getElementById('deploySandboxSpinner');
        const buttonText = document.getElementById('deploySandboxButtonText');
        button.disabled = true;
        spinner.style.display = 'block';
        buttonText.textContent = 'DEPLOYANDO WORKSPACE...';
    }
    if (message.command === 'revertStatus') {
        revertSandboxPanelStatus();
    }
});

// Guarda el estado en el Webview
function saveState(data) {
    vscode.setState(data);
}

// Actualizar el estado del panel sandbox
function updateSandboxPanelStatus(statusHtml) {

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

function revertSandboxPanelStatus() {
    sPanelStatus.innerHTML = previousState;
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
setInterval(updateSandboxData, 5000);
