# Portfolio — React + TypeScript + Vite

Portfolio de Stiven Colorado. React 19 + Vite 7 + Tailwind CSS v4 + MobX.

## Requisitos

Este proyecto usa **pnpm** como gestor de paquetes (ver campo `packageManager` en `package.json`).

```bash
# Instalar pnpm (si no lo tienes)
corepack enable

# Instalar dependencias
pnpm install

# La primera vez, aprobar los build scripts nativos (oxide/esbuild)
pnpm approve-builds --all   # solo si pnpm los marca como "ignored"

# Desarrollo
pnpm dev

# Build de producción
pnpm build

# Preview del build
pnpm preview

# Lint
pnpm lint
```

> Nota: `pnpm-workspace.yaml` declara `onlyBuiltDependencies` para que `@tailwindcss/oxide` y `esbuild` compilen sus binarios nativos en CI/Vercel sin intervención manual.

## Variables de entorno

Crea un archivo `.env` (ver `.env.example`):

```
VITE_WEB3FORMS_KEY=tu-access-key-de-web3forms
```

La key gratuita se obtiene en https://web3forms.com (solo pide tu correo de destino).

---

## Sobre la plantilla base (Vite)

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
