# 🐛 Debug: Cambio de Idioma No Funciona

**Fecha**: 4 de noviembre de 2025  
**Problema**: Al cambiar de idioma en Settings, los textos NO se actualizan

---

## 🔍 **Diagnóstico**

### ✅ **Lo que SÍ está funcionando:**

1. **i18n inicializa correctamente**
   ```
   [i18n] Initializing i18n...
   [i18n] Device language detected: en
   [i18n] i18n initialized successfully
   ```

2. **AppSettingsContext guarda el idioma**
   - `setLanguage()` ejecuta correctamente
   - Guarda en AsyncStorage: `@goveling_language` y `app.lang`

3. **i18n.changeLanguage() se llama**
   - Conexión establecida en `AppSettingsContext.tsx` línea 151

### ❌ **Lo que NO funciona:**

1. **Los componentes no se re-renderízan** después de cambiar idioma
2. **useTranslation() no detecta el cambio** de idioma en i18n
3. **Los textos traducidos permanecen en el idioma original**

---

## 🔧 **Cambios Realizados**

### 1. **app/_layout.tsx** (Líneas 110-127)

Agregado listener para forzar re-mount del I18nextProvider:

```typescript
const [i18nKey, setI18nKey] = React.useState(0);

React.useEffect(() => {
  const handleLanguageChange = () => {
    logger.debug('🌐 Language changed, forcing re-mount...');
    setI18nKey(prev => prev + 1);
  };
  
  i18n.on('languageChanged', handleLanguageChange);
  
  return () => {
    i18n.off('languageChanged', handleLanguageChange);
  };
}, []);

// Provider con key dinámica
<I18nextProvider i18n={i18n} key={i18nKey}>
```

**Efecto esperado**: Cuando i18n emita el evento `languageChanged`, el Provider se re-montará con una nueva key, forzando que todos los componentes hijos se re-renderizen.

### 2. **src/contexts/AppSettingsContext.tsx**

**Líneas 109-125**: Agregado listener para forzar re-render:
```typescript
const [, forceUpdate] = useState(0);

useEffect(() => {
  const handleLanguageChange = (lng: string) => {
    console.log('🌐 i18n language changed to:', lng);
    forceUpdate((prev) => prev + 1);
  };

  i18n.on('languageChanged', handleLanguageChange);
  return () => {
    i18n.off('languageChanged', handleLanguageChange);
  };
}, []);
```

**Líneas 148-155**: Modificado setLanguage():
```typescript
const setLanguage = async (lang: Language) => {
  await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
  await AsyncStorage.setItem('app.lang', lang);
  
  // ✅ Cambiar idioma en i18n PRIMERO
  await i18n.changeLanguage(lang);
  
  // LUEGO actualizar el estado
  setSettings((prev) => ({ ...prev, language: lang }));
  
  console.log('✅ Language changed to:', lang);
};
```

### 3. **src/components/SettingsModal.tsx**

**Líneas 65-83**: Agregado console.logs para debug:
```typescript
const handleLanguageChange = async (lang: Language) => {
  console.log('🔄 Cambiando idioma a:', lang);
  await setLanguage(lang);
  console.log('✅ Idioma cambiado exitosamente a:', lang);
  // ...
};
```

---

## 🧪 **Cómo Probar**

### **Prueba 1: Verificar que el evento se emite**

1. Abre la consola del navegador (F12)
2. Inicia la app en `localhost:8081`
3. Ve a **Perfil** → **Configuración** → **Idioma**
4. Selecciona **Español**

**Busca en la consola**:
```
🔄 Cambiando idioma a: es
✅ Language changed to: es
✅ Idioma cambiado exitosamente a: es
🌐 i18n language changed to: es
🌐 Language changed, forcing re-mount...
```

Si ves estos logs, significa que el evento SE está emitiendo correctamente.

### **Prueba 2: Verificar que el idioma cambia en i18n**

Abre la consola del navegador y ejecuta:
```javascript
window.i18n = require('./src/i18n/index.ts').default;
console.log('Current language:', window.i18n.language);
console.log('Translation of home.title:', window.i18n.t('home.title'));

// Cambiar idioma manualmente
window.i18n.changeLanguage('es').then(() => {
  console.log('New language:', window.i18n.language);
  console.log('Translation of home.title:', window.i18n.t('home.title'));
});
```

**Resultado esperado**:
```
Current language: en
Translation of home.title: Home
New language: es
Translation of home.title: Inicio
```

### **Prueba 3: Verificar re-render del Provider**

Agregar log temporal en `_layout.tsx`:

```typescript
<I18nextProvider i18n={i18n} key={i18nKey}>
  {console.log('🔄 I18nextProvider rendering with key:', i18nKey)}
  <ThemeProvider>
```

**Resultado esperado**: Cada vez que cambies idioma, deberías ver:
```
🔄 I18nextProvider rendering with key: 0
🔄 I18nextProvider rendering with key: 1  ← Después de cambiar idioma
🔄 I18nextProvider rendering with key: 2  ← Después de cambiar otro idioma
```

---

## 🚨 **Posibles Causas del Problema**

### 1. **El evento `languageChanged` no se emite**

**Solución**:  
Verifica que i18n esté configurado correctamente en `src/i18n/index.ts`:

```typescript
i18n
  .use(initReactI18next)
  .init({
    // ... configuración
  })
```

El plugin `initReactI18next` es necesario para que los eventos funcionen.

### 2. **Los componentes usan textos hard-coded en lugar de traducciones**

**Verificar**: 
```bash
grep -r "Home" app/(tabs)/_layout.tsx
grep -r "Inicio" app/(tabs)/_layout.tsx
```

Si encuentras textos directos sin usar `t()`, ese es el problema.

**Ejemplo de uso correcto**:
```typescript
// ❌ MAL
<Text>Home</Text>

// ✅ BIEN
<Text>{t('home.title')}</Text>
```

### 3. **useTranslation() no está suscritto a cambios**

**Solución**: Asegúrate de que `useTranslation()` viene de `react-i18next`:

```typescript
import { useTranslation } from 'react-i18next';

function Component() {
  const { t, i18n } = useTranslation();
  
  // NO uses i18n.t() directamente
  // USA el hook t() que sí re-renderiza
  return <Text>{t('home.title')}</Text>;
}
```

### 4. **El Provider no está re-montando**

Si el key del Provider NO cambia, los componentes no se re-renderizan.

**Verificación manual**:
```typescript
// En app/_layout.tsx
console.log('🔑 Current i18n key:', i18nKey);
```

Debería incrementarse cada vez que cambia el idioma.

---

## 🔨 **Solución Alternativa: Usar Context para forzar re-render**

Si el approach de cambiar la `key` del Provider no funciona, podemos usar un Context que fuerce re-render:

```typescript
// src/contexts/LanguageContext.tsx (NUEVO)
import React, { createContext, useContext, useState, useEffect } from 'react';
import i18n from '~/i18n';

const LanguageContext = createContext({ language: 'en', version: 0 });

export function LanguageProvider({ children }) {
  const [state, setState] = useState({ 
    language: i18n.language, 
    version: 0 
  });

  useEffect(() => {
    const handler = (lng) => {
      setState(prev => ({ 
        language: lng, 
        version: prev.version + 1 
      }));
    };
    i18n.on('languageChanged', handler);
    return () => i18n.off('languageChanged', handler);
  }, []);

  return (
    <LanguageContext.Provider value={state}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
```

Luego en cada componente:
```typescript
function Component() {
  const { version } = useLanguage(); // Esto fuerza re-render
  const { t } = useTranslation();
  
  return <Text key={version}>{t('home.title')}</Text>;
}
```

---

## 📊 **Estado Actual de Archivos Modificados**

| Archivo | Estado | Cambios |
|---------|--------|---------|
| `app/_layout.tsx` | ✅ Modificado | Agregado listener + key dinámica |
| `src/contexts/AppSettingsContext.tsx` | ✅ Modificado | Listener + orden de ejecución |
| `src/components/SettingsModal.tsx` | ✅ Modificado | Console.logs para debug |
| `src/i18n/index.ts` | ✅ Funcional | Tiene 8 idiomas + Hindi |
| `src/i18n/locales/hi.json` | ✅ Creado | Traducciones completas |

---

## 🎯 **Próximos Pasos**

1. **Ejecutar las pruebas** de arriba para diagnosticar exactamente dónde falla
2. **Revisar console.logs** al cambiar idioma
3. **Verificar que los componentes usen `t()`** y no textos hardcoded
4. Si el problema persiste, **implementar LanguageContext** como fallback

---

## 📝 **Comandos Útiles**

```bash
# Verificar que las traducciones existen
cat src/i18n/locales/es.json | grep "home.title"
cat src/i18n/locales/en.json | grep "home.title"
cat src/i18n/locales/hi.json | grep "home.title"

# Buscar componentes que usan useTranslation
grep -r "useTranslation" app/

# Buscar componentes que usan t()
grep -r "{t(" app/

# Verificar imports de i18n
grep -r "from 'react-i18next'" app/
```

---

## 💡 **Nota Importante**

El problema más común es que **los componentes NO están usando las traducciones**. Antes de continuar debugging, verifica que los componentes que quieres que cambien realmente están usando `t()` de `useTranslation()`.

Por ejemplo, en `app/(tabs)/_layout.tsx`:
- Línea 65: ✅ `title: t('home.title') || 'Home'`
- Línea 77: ✅ `title: t('explore.title') || 'Explore'`

Pero los **labels de los iconos** (`label="Home"`, `label="Explore"`) están hardcoded y NO cambiarán.

---

**¿Siguiente acción?** Ejecuta las pruebas de arriba y comparte los console.logs para diagnosticar el problema exacto.
