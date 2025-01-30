# Publicación de la Extensiones

Para publicar una extensión en el Marketplace de Extensiones de Visual Studio Code, es necesario empacar la extensión en el formato VSIX, que es un archivo instalable. Este proceso asegura que la extensión sea fácilmente distribuible y utilizable por otros usuarios de VS Code.

## Contenido

1. [vsce](#vsce)
   - [Instalación](#instalación)
   - [Uso](#uso)

## vsce

**vsce**, abreviatura de "Visual Studio Code Extensions", es una herramienta de línea de comandos para empaquetar, publicar y gestionar extensiones de VS Code.

### Instalación

Asegúrate de tener Node.js instalado. Luego ejecuta:

```bash
npm install -g @vscode/vsce
```

### Uso

Puedes utilizar **vsce** para empaquetar y publicar fácilmente tus extensiones:

```bash
$ vsce package
# miExtension.vsix generado
```
```bash
$ vsce publish
# <id del editor>.miExtension publicado en el Marketplace de VS Code
```


