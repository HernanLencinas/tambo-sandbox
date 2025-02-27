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
$ vsce package --allow-star-activation --out ./bin/ 
```
```bash
$ vsce login HernanLencinas        

Publisher 'HernanLencinas' is already known
Do you want to overwrite its PAT? [y/N] y
https://marketplace.visualstudio.com/manage/publishers/
Personal Access Token for publisher 'HernanLencinas': ************************************************************************************

The Personal Access Token verification succeeded for the publisher 'HernanLencinas'.
```
```bash
$ vsce publish --allow-star-activation

Executing prepublish script 'npm run vscode:prepublish'...

> tambo-sandbox@1.0.3 vscode:prepublish
> npm run package


> tambo-sandbox@1.0.3 package
> webpack --mode production --devtool hidden-source-map

    [webpack-cli] Compiler starting... 
    [webpack-cli] Compiler is using config: '/Users/hernan/Desktop/tambo-sandbox/webpack.config.js'
    [webpack-cli] Compiler finished
asset extension.js 519 KiB [compared for emit] [minimized] (name: main) 2 related assets
runtime modules 670 bytes 3 modules
cacheable modules 806 KiB
  modules by path ./node_modules/ 758 KiB 33 modules
  modules by path ./src/*.ts 48 KiB
    ./src/extension.ts 3.72 KiB [built] [code generated]
    ./src/connection.ts 23.5 KiB [built] [code generated]
    ./src/sandbox.ts 10.7 KiB [built] [code generated]
    ./src/gitlab.ts 6.9 KiB [built] [code generated]
    ./src/utils.ts 2.69 KiB [built] [code generated]
    ./src/globals.ts 564 bytes [built] [code generated]
+ 16 modules
webpack 5.97.1 compiled successfully in 2639 ms
 INFO  Files included in the VSIX:
tmp-63899-rrZhN8E9wu0x
├─ [Content_Types].xml 
├─ extension.vsixmanifest 
└─ extension/
   ├─ BUILD.md [1.29 KB]
   ├─ LICENSE.md 
   ├─ changelog.md [0.15 KB]
   ├─ package.json [5.15 KB]
   ├─ readme.md [2.78 KB]
   ├─ dist/
   │  ├─ 1.extension.js [10.05 KB]
   │  ├─ extension.js [519.24 KB]
   │  └─ extension.js.LICENSE.txt [0.33 KB]
   └─ resources/
      ├─ icons/ (15 files) [18.84 KB]
      ├─ logos/ (5 files) [142.75 KB]
      ├─ scripts/ (2 files) [3.07 KB]
      └─ styles/ (2 files) [5.37 KB]

=> Run vsce ls --tree to see all included files.

 INFO  Publishing 'HernanLencinas.tambo-sandbox v1.0.3'...
 INFO  Extension URL (might take a few minutes): https://marketplace.visualstudio.com/items?itemName=HernanLencinas.tambo-sandbox
 INFO  Hub URL: https://marketplace.visualstudio.com/manage/publishers/HernanLencinas/extensions/tambo-sandbox/hub
 DONE  Published HernanLencinas.tambo-sandbox v1.0.3.
```


