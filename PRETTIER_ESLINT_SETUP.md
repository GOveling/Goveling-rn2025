# 🎨 Guía de Configuración: Prettier + ESLint

## 📋 Resumen

Se ha implementado una configuración profesional de **Prettier** y **ESLint** para mejorar significativamente:

- ✅ **Calidad del código**: Reglas consistentes y mejores prácticas
- ✅ **Mantenibilidad**: Código uniforme y fácil de leer
- ✅ **Escalabilidad**: Estructura clara para proyectos grandes
- ✅ **Productividad**: Formateo automático al guardar

---

## 📦 Archivos Creados

### 1. **`.prettierrc.json`** - Configuración de Prettier
Formato automático del código con reglas consistentes:
- Comillas simples para JS/TS
- Semi-colons activados
- 100 caracteres por línea
- Ordenamiento automático de imports

### 2. **`.eslintrc.json`** - Configuración de ESLint
Linting avanzado con reglas para React Native:
- TypeScript strict mode
- React Hooks validation
- Import ordering
- Detección de malas prácticas

### 3. **`.editorconfig`** - Configuración del editor
Consistencia entre diferentes editores:
- Indentación de 2 espacios
- Charset UTF-8
- Fin de línea LF (Unix)

### 4. **`.vscode/settings.json`** - Actualizado
Configuración optimizada de VSCode:
- Formateo automático al guardar
- ESLint fix al guardar
- Prettier como formateador por defecto

---

## 🚀 Instalación de Dependencias

Ejecuta el siguiente comando para instalar todas las dependencias necesarias:

```bash
npm install
```

Esto instalará:
- `prettier` - Formateador de código
- `eslint` - Linter de JavaScript/TypeScript
- `@typescript-eslint/*` - Plugins de TypeScript
- `eslint-plugin-react*` - Plugins de React/React Native
- `husky` - Git hooks para pre-commit
- `lint-staged` - Linting solo de archivos en stage

---

## 🔧 Scripts Disponibles

### Formateo
```bash
npm run format              # Formatea todo el código
npm run format:check        # Verifica el formato sin modificar
```

### Linting
```bash
npm run lint                # Revisa errores de linting
npm run lint:fix            # Corrige errores automáticamente
```

### Type Checking
```bash
npm run type-check          # Verifica tipos de TypeScript
```

### Validación completa
```bash
npm run validate            # Ejecuta type-check, lint y format:check
```

---

## 💡 Uso Diario

### 1. **Formateo Automático**
El código se formateará automáticamente al guardar archivos (Cmd/Ctrl + S)

### 2. **Revisión Manual**
Antes de hacer commit, ejecuta:
```bash
npm run validate
```

### 3. **Fix Rápido**
Si hay errores de ESLint, ejecuta:
```bash
npm run lint:fix
```

---

## 🎯 Beneficios Inmediatos

### ✨ Calidad de Código
- **Consistencia**: Todo el equipo usa el mismo estilo
- **Legibilidad**: Código más fácil de entender
- **Mantenibilidad**: Estructura clara y predecible

### 🐛 Detección de Errores
- **Early Detection**: Errores encontrados al escribir
- **Best Practices**: Sugerencias de mejores prácticas
- **Type Safety**: Verificación de tipos de TypeScript

### 🚀 Productividad
- **Formateo Automático**: Sin perder tiempo formateando manualmente
- **Auto-fix**: Muchos errores se corrigen automáticamente
- **IntelliSense**: Mejor autocompletado y sugerencias

---

## 🔍 Reglas Importantes Configuradas

### React Native Specific
```javascript
"react-native/no-inline-styles": "warn"      // Evita estilos inline
"react-native/no-color-literals": "warn"     // Usa constantes para colores
```

### React Hooks
```javascript
"react-hooks/rules-of-hooks": "error"        // Valida reglas de hooks
"react-hooks/exhaustive-deps": "warn"        // Valida dependencias
```

### TypeScript
```javascript
"@typescript-eslint/no-explicit-any": "warn" // Evita usar 'any'
"@typescript-eslint/no-unused-vars": "warn"  // Variables sin usar
```

### Import Ordering
Los imports se ordenarán automáticamente en este orden:
1. React
2. React Native
3. Expo packages
4. Third-party libraries
5. Internal imports (~/@)
6. Relative imports

---

## 🛠️ Comandos Útiles

### Formatear archivo específico
```bash
npx prettier --write src/components/MyComponent.tsx
```

### Lint archivo específico
```bash
npx eslint src/components/MyComponent.tsx --fix
```

### Ignorar regla en línea específica
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = {};
```

### Ignorar formateo en bloque
```typescript
// prettier-ignore
const matrix = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1]
];
```

---

## 📊 Próximos Pasos Recomendados

### 1. **Configurar Git Hooks (Opcional)**
```bash
npx husky-init
npx husky set .husky/pre-commit "npx lint-staged"
```

### 2. **Integración con CI/CD**
Agrega en tu pipeline:
```yaml
- run: npm run validate
```

### 3. **Revisar Código Existente**
Ejecuta para ver qué archivos necesitan actualización:
```bash
npm run lint
npm run format:check
```

### 4. **Formatear Todo el Proyecto**
⚠️ Esto modificará muchos archivos:
```bash
npm run format
```

---

## 🎓 Recursos Adicionales

- [Prettier Documentation](https://prettier.io/docs/en/index.html)
- [ESLint Rules](https://eslint.org/docs/latest/rules/)
- [TypeScript ESLint](https://typescript-eslint.io/)
- [React Native ESLint Plugin](https://github.com/intellicode/eslint-plugin-react-native)

---

## ⚙️ Personalización

Puedes ajustar las reglas editando:
- **`.prettierrc.json`** - Reglas de formateo
- **`.eslintrc.json`** - Reglas de linting

Ejemplo de cambios comunes:
```json
// .prettierrc.json
{
  "printWidth": 120,        // Líneas más largas
  "singleQuote": false,     // Comillas dobles
  "semi": false             // Sin punto y coma
}
```

---

## 🤝 Trabajo en Equipo

### Recomendaciones
1. ✅ Todos deben usar las mismas versiones de extensiones
2. ✅ Ejecutar `npm run validate` antes de hacer commit
3. ✅ Revisar warnings de ESLint en Pull Requests
4. ✅ No deshabilitar reglas sin discutir con el equipo

---

**¡Tu proyecto ahora está configurado con las mejores prácticas de la industria!** 🎉
