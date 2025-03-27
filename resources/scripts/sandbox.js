// file deepcode ignore InsufficientPostmessageValidation: <please specify a reason of ignoring this>
const vscode = acquireVsCodeApi();

const previousState = vscode.getState();
const sPanelStatus = document.getElementById('sandboxPanelStatus');

if (previousState) {
    sPanelStatus.innerHTML = previousState;
}

// Manejar mensajes entrantes desde VS Code
window.addEventListener('message', ({ data: message }) => {
    const handlers = {
        sandboxConnectionStatus: () => {
            updateSandboxPanelStatus(message.data);
            saveState(message.data);
        },
        ping: () => {
            sendMessage(message.data);
        },
        destroyingStatus: () => {
            toggleButtonState('destroySandbox', true, 'DESTRUYENDO WORKSPACE...');
        },
        deployingStatus: () => {
            toggleButtonState('deploySandbox', true, 'DEPLOYANDO WORKSPACE...');
        },
        revertStatus: () => {
            revertSandboxPanelStatus();
        }
    };

    const handler = handlers[message.command];
    if (handler) {
        handler();
    }
});

function toggleButtonState(idPrefix, disabled, text) {
    const button = document.getElementById(`${idPrefix}Button`);
    const spinner = document.getElementById(`${idPrefix}Spinner`);
    const buttonText = document.getElementById(`${idPrefix}ButtonText`);

    if (button && spinner && buttonText) {
        button.disabled = disabled;
        spinner.style.display = disabled ? 'block' : 'none';
        buttonText.textContent = text;
    }
}

/* window.addEventListener('message', ({ data: message }) => {
    if (message.command === 'sandboxConnectionStatus') {
        updateSandboxPanelStatus(message.data);
        saveState(message.data);
    }
    if (message.command === 'ping') {
        console.log("PING");
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
}); */

window.addEventListener('click', (event) => {
    // ACCESOS A HERRAMIENTAS
    const buttonElement = event.target.closest('.apps-button[data-link]');
    if (buttonElement) {
        vscode.postMessage({
            command: 'openLink',
            link: buttonElement.dataset.link
        });
    }
});

// Guarda el estado en el Webview
function saveState(data) {
    vscode.setState(data);
}

// Actualizar el estado del panel sandbox
function updateSandboxPanelStatus(statusHtml) {
    sPanelStatus.innerHTML = statusHtml;
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
setInterval(updateSandboxData, 3000);
