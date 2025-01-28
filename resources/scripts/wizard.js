const vscode = acquireVsCodeApi();

function invokeWizard() {
    vscode.postMessage({ command: "sandboxWizard" });
}