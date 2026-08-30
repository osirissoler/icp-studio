# Conversor de presentaciones de ICP Studio

Esta carpeta contiene localmente el motor LibreOffice que ICP Studio utiliza para convertir
archivos PowerPoint (`.pptx`) a PDF sin depender de Microsoft Office ni de internet.

Ubicaciones esperadas:

- macOS: `LibreOffice.app/Contents/MacOS/soffice`
- Windows: `program/soffice.exe`
- Linux: `program/soffice`

## Instaladores soportados

Cada instalador se genera en el mismo sistema operativo y arquitectura para el que será entregado:

- macOS Apple Silicon: copiar la aplicación ARM64 completa como `LibreOffice.app`.
- macOS Intel: copiar la aplicación Intel completa como `LibreOffice.app`.
- Windows x64: copiar **todo** el contenido instalado de LibreOffice dentro de esta carpeta. No es
  suficiente copiar solamente `soffice.exe`, porque también necesita sus DLL, archivos de programa,
  fuentes, filtros y recursos.

El comando `npm run converter:check` detecta la plataforma actual, comprueba la ubicación esperada
y ejecuta `soffice --headless --version`. Si falla, se bloquea la creación del instalador para evitar
entregar una versión de ICP Studio sin conversión de PowerPoint.

Para generar una versión distribuible se utiliza:

```bash
npm run build:electron
```

Quasar copia esta carpeta completa dentro de los recursos del instalador. El usuario final instala
solamente ICP Studio y no necesita internet ni una instalación independiente de LibreOffice.

Los binarios se excluyen de Git por su tamaño y por ser diferentes para cada plataforma. Solo se
versionan este documento y `manifest.json`.

Durante el desarrollo también se puede definir `ICP_STUDIO_SOFFICE_PATH` con la ruta absoluta al
ejecutable. El usuario final no tendrá que configurar esta variable: el conversor se incluirá como
recurso del instalador de ICP Studio.
