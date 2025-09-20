
// src/i18n/index.ts
// Import polyfill for Intl.PluralRules if not available
import 'intl-pluralrules';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import es from './locales/es.json';
import pt from './locales/pt.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import zh from './locales/zh.json';
import ja from './locales/ja.json';

const resources = { en:{translation:en}, es:{translation:es}, pt:{translation:pt}, fr:{translation:fr}, it:{translation:it}, zh:{translation:zh}, ja:{translation:ja} };

const STORAGE_KEY = 'app.lang';

export async function getSavedLanguage(){
  try{ const v = await AsyncStorage.getItem(STORAGE_KEY); return v || null; }catch{ return null; }
}

export async function setLanguage(lang:string){
  await AsyncStorage.setItem(STORAGE_KEY, lang);
  await i18n.changeLanguage(lang);
}

const fallback = 'en';
const deviceLang = (Localization.getLocales()?.[0]?.languageTag || 'en').split('-')[0];

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: fallback,
    fallbackLng: fallback,
    interpolation: { escapeValue: false },
    // Add compatibility for older environments
    compatibilityJSON: 'v3'
  });

getSavedLanguage().then(saved => {
  const target = saved || (resources[deviceLang] ? deviceLang : fallback);
  i18n.changeLanguage(target);
});


// AUTO_TRANSLATE: runtime fallback with tiny dictionaries + pseudo-localization.
// If EXPO_PUBLIC_I18N_EDGE is set, it will try to call a Supabase Edge function to get real translations and cache them.
import { NativeModules, Platform } from 'react-native';

const miniDict:any = {
  es: { "OK":"OK","Cancel":"Cancelar","Save":"Guardar","Delete":"Eliminar","Search":"Buscar","Filters":"Filtros","Booking":"Booking","Flights":"Vuelos","Hotels":"Hoteles","eSIM":"eSIM","Home":"Inicio","Explore":"Explorar","Profile":"Perfil","My Trips":"Mis viajes","No results":"Sin resultados","Near me":"Cerca de mí" },
  pt: { "Cancel":"Cancelar","Save":"Salvar","Delete":"Excluir","Search":"Buscar","Filters":"Filtros","Flights":"Voos","Hotels":"Hotéis","Home":"Início","Explore":"Explorar","Profile":"Perfil","My Trips":"Minhas viagens","No results":"Sem resultados","Near me":"Perto de mim" },
  fr: { "Cancel":"Annuler","Save":"Enregistrer","Delete":"Supprimer","Search":"Rechercher","Filters":"Filtres","Flights":"Vols","Hotels":"Hôtels","Home":"Accueil","Explore":"Explorer","Profile":"Profil","My Trips":"Mes voyages","No results":"Aucun résultat","Near me":"Près de moi" },
  it: { "Cancel":"Annulla","Save":"Salva","Delete":"Elimina","Search":"Cerca","Filters":"Filtri","Flights":"Voli","Hotels":"Hotel","Home":"Home","Explore":"Esplora","Profile":"Profilo","My Trips":"I miei viaggi","No results":"Nessun risultato","Near me":"Vicino a me" },
  zh: { "Cancel":"取消","Save":"保存","Delete":"删除","Search":"搜索","Filters":"筛选","Flights":"机票","Hotels":"酒店","Home":"首页","Explore":"探索","Profile":"个人资料","My Trips":"我的行程","No results":"没有结果","Near me":"离我最近" },
  ja: { "Cancel":"キャンセル","Save":"保存","Delete":"削除","Search":"検索","Filters":"フィルター","Flights":"フライト","Hotels":"ホテル","Home":"ホーム","Explore":"探索","Profile":"プロフィール","My Trips":"マイトリップ","No results":"結果なし","Near me":"現在地付近" },
};

function pseudo(str:string){
  // simple pseudos: wrap + extend characters
  const map:any = { a:'á', e:'é', i:'í', o:'ó', u:'ú', A:'Á', E:'É', I:'Í', O:'Ó', U:'Ú' };
  return '⟪ ' + str.replace(/[aeiouAEIOU]/g, (m)=> map[m] || m) + ' ⟫';
}

async function edgeTranslate(text:string, lang:string){
  try{
    const base = process.env.EXPO_PUBLIC_I18N_EDGE;
    if(!base) return null;
    const res = await fetch(base, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ q:text, target:lang }) });
    if(!res.ok) return null;
    const j = await res.json();
    return (j && j.translated) || null;
  }catch{ return null; }
}

// Patch i18n to try runtime translation for missing keys under "auto"
const _t = i18n.t.bind(i18n);
i18n.t = function(key:string, opts?:any){
  const lang = i18n.language || 'en';
  let val = _t(key, opts);
  // when key is auto.<Original Text> and result equals the original text, try runtime translate
  if (key.startsWith('auto.') && typeof val === 'string'){
    const original = key.slice(5);
    // already translated?
    if (val === original || (val && val.trim() === original.trim())){
      const d = miniDict[lang]?.[original];
      if (d) return d;
      // trigger async translation (best-effort, not blocking UI)
      edgeTranslate(original, lang).then(tr => {
        if(tr){
          // set into resources cache
          const res:any = (i18n as any).services.resourceStore.data;
          res[lang] = res[lang] || {}; res[lang].translation = res[lang].translation || {}; res[lang].translation.auto = res[lang].translation.auto || {};
          res[lang].translation.auto[original] = tr;
        }
      });
      // fallback pseudo so each locale shows something
      if (lang==='en') return original;
      return pseudo(original);
    }
  }
  return val;
} as any;

export default i18n;
