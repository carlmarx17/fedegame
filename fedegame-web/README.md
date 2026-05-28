# FedeGame Web

Version web estatica de FedeGame. No necesita servidor ni instalar dependencias.

## Probar localmente

Abre `index.html` en el navegador.

Tambien puedes usar un servidor local:

```bash
python -m http.server 8000
```

Luego entra a:

```text
http://localhost:8000/fedegame-web/
```

## Subir a internet

Opciones gratis:

- GitHub Pages: sube esta carpeta y publica desde Pages.
- Netlify: arrastra la carpeta `fedegame-web` a Netlify Drop.
- Vercel: importa el proyecto y usa esta carpeta como sitio estatico.

Los scores se guardan en el navegador del estudiante con `localStorage`.
