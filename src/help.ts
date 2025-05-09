import * as vscode from 'vscode';
import { globalConfig } from './globals';

export class TamboSidebarProvider implements vscode.WebviewViewProvider {
  resolveWebviewView(
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
        <head>
          <meta charset="UTF-8">
          <title>Ayuda</title>
        </head>
        <body style="font-family:sans-serif">

          <h3 style="color:orange;">¡BIENVENIDO A TAMBO SANDBOX!</h3>

          <p style="font-size:14px;color:#ccc;line-height:1.4;">
          Si necesitás ayuda adicional, soporte técnico o tenés alguna consulta, podés acceder a la plataforma <a href="${globalConfig.iTicketUrl}" onclick1="vscode.postMessage({ command: 'openItickets' })" style="font-weight:1000;color:orange;">iTickets</a> para generar una nueva solicitud. Nuestro equipo estará disponible para ayudarte a resolver cualquier inconveniente o responder tus preguntas a la brevedad.
          </p>

          <p style="font-size:12px;color:#777;">Version: ${version}</p>

          <script>
            const vscode = acquireVsCodeApi();
          </script>
        </body>
      </html>
    `;
  }
}