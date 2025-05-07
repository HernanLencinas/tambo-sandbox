import * as vscode from 'vscode';

export class TamboSidebarProvider implements vscode.WebviewViewProvider {
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    const extension = vscode.extensions.getExtension('HernanLencinas.tambo-sandbox');
    const version = extension?.packageJSON.version ?? 'v?';

    webviewView.webview.options = {
      enableScripts: true
    };

    webviewView.webview.html = `
      <!DOCTYPE html>
      <html lang="es">
        <body style="font-family:sans-serif; padding: 10px;">
          <h3>¡BIENVENIDO A TAMBO SANDBOX!!! <small style="color:gray;">v${version}</small></h3>
          <p>Si necesitás información adicional o asistencia, te invitamos a acceder a 
            <a href="https://tusitio/tickets" target="_blank">Tickets</a> y generar una nueva solicitud.</p>
        </body>
      </html>
    `;
  }
}