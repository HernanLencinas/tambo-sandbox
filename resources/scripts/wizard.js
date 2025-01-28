const vscode = acquireVsCodeApi();

// Función genérica para enviar mensajes a VS Code
function sendMessage(command, data = {}) {
    vscode.postMessage({ command, ...data });
}

// Función para invocar el asistente
function invokeWizard() {
    sendMessage("sandboxWizard");
}