const vscode = acquireVsCodeApi();

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
