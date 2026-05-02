# Cráneo — Anatomía 3D Interactiva

Experiencia web 3D de un cráneo anatómico humano. Dark, editorial, con iluminación de fuego y anotaciones latinas flotantes.

## Stack

- HTML / CSS / JS vanilla (sin frameworks, sin bundler)
- Three.js `0.134.0` via CDN global (no ES modules)
- GLTFLoader + DRACOLoader + OrbitControls
- Deploy estático en Vercel

---

## Setup local

### Requisitos
Solo necesitás un servidor HTTP local (los navegadores bloquean `fetch` en `file://`).

**Opción A — npx serve**
```bash
cd ~/Documents/skull-anatomy
npx serve .
# → http://localhost:3000
```

**Opción B — Python**
```bash
cd ~/Documents/skull-anatomy
python3 -m http.server 8080
# → http://localhost:8080
```

---

## Agregar el modelo 3D

Copiá tu archivo `Craneo.glb` a:
```
skull-anatomy/assets/Craneo.glb
```

El loader lo centra y escala automáticamente. Si no está presente, se muestra una esfera de placeholder.

---

## Controles de la UI

| Botón | Acción |
|-------|--------|
| 🔥 Modo Lava | Enciende las point lights de fuego con flickering |
| 💀 Modo Oscuro | Apaga las luces de fuego |
| ⟳ Auto-rotar | Toggle de rotación automática |
| ◎ Anotaciones | Muestra/oculta los labels anatómicos |

**Mouse:**
- Arrastrar → rotar el modelo
- Scroll → zoom (min 2.2, max 9)
- Mover → parallax suave del cráneo

---

## Deploy en Vercel

### Primera vez
```bash
npm i -g vercel   # si no lo tenés
vercel login
vercel            # desde la raíz del proyecto
```

### Re-deploy
```bash
vercel --prod
```

El `vercel.json` ya está configurado para deploy estático sin build steps.

---

## Git + GitHub

```bash
# En la carpeta del proyecto
git init
git add .
git commit -m "feat: initial skull anatomy viewer"

# Crear un repo nuevo en github.com, luego:
git remote add origin https://github.com/TU_USUARIO/skull-anatomy.git
git branch -M main
git push -u origin main
```
