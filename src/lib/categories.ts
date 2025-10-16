// Centralized UI categories and mapping to internal categories
// Each UI category has display name (Spanish), emoji icon, group and internal category code

export interface UICategory {
  name: string; // display string used in UI (Spanish for now)
  icon: string; // emoji placeholder
  group: 'general' | 'specific';
  internal: string; // internal category code consumed by search backend
}

export const uiCategoriesGeneral: UICategory[] = [
  { name: 'Restaurantes', icon: '🍽️', group: 'general', internal: 'restaurant' },
  { name: 'Alojamiento', icon: '🏨', group: 'general', internal: 'hotel' },
  { name: 'Transporte', icon: '🚗', group: 'general', internal: 'transport' },
  { name: 'Entretenimiento', icon: '🎭', group: 'general', internal: 'entertainment' },
  { name: 'Compras', icon: '🛍️', group: 'general', internal: 'shopping' },
];

export const uiCategoriesSpecific: UICategory[] = [
  { name: 'Museos', icon: '🏛️', group: 'specific', internal: 'museum' },
  { name: 'Parques', icon: '🌳', group: 'specific', internal: 'park' },
  { name: 'Playas', icon: '🏖️', group: 'specific', internal: 'beach' },
  { name: 'Monumentos', icon: '🗿', group: 'specific', internal: 'attraction' },
  { name: 'Iglesias', icon: '⛪', group: 'specific', internal: 'attraction' },
  { name: 'Centros Comerciales', icon: '🏬', group: 'specific', internal: 'shopping' },
];

// Map display name -> internal category
export const categoryDisplayToInternal: Record<string, string> = [
  ...uiCategoriesGeneral,
  ...uiCategoriesSpecific,
].reduce(
  (acc, c) => {
    acc[c.name] = c.internal;
    return acc;
  },
  {} as Record<string, string>
);

export const allUICategories: UICategory[] = [...uiCategoriesGeneral, ...uiCategoriesSpecific];
