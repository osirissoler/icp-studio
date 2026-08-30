# Conversor de presentaciones de ICP Studio

Esta carpeta contendrá el motor LibreOffice que ICP Studio utilizará internamente para convertir
archivos PowerPoint (`.pptx`) a PDF sin depender de Microsoft Office ni de internet.

Ubicaciones esperadas:

- macOS: `LibreOffice.app/Contents/MacOS/soffice`
- Windows: `program/soffice.exe`
- Linux: `program/soffice` o `bin/soffice`

Durante el desarrollo también se puede definir `ICP_STUDIO_SOFFICE_PATH` con la ruta absoluta al
ejecutable. El usuario final no tendrá que configurar esta variable: el conversor se incluirá como
recurso del instalador de ICP Studio.
