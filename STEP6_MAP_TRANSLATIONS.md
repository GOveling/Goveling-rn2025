# Paso 6 - Traducciones de Mapas

## Traducciones a Agregar

### Italiano (it.json)
Buscar después de `"share": { ... },` y agregar:

```json
"maps": {
  "view_on_map": "Visualizza sulla mappa",
  "add_to_trip": "Aggiungi al viaggio",
  "select_trip": "Seleziona viaggio",
  "added_to_trip_success": "Aggiunto con successo a {{trip}}",
  "error_adding_to_trip": "Impossibile aggiungere il luogo al viaggio",
  "error_loading_trips": "Impossibile caricare i viaggi",
  "no_trips": "Non hai viaggi",
  "create_trip_first": "Crea prima un viaggio per aggiungere luoghi",
  "already_added_title": "Già aggiunto",
  "already_added_message": "Questo luogo è già nel viaggio selezionato"
},
```

### Portugués (pt.json)
```json
"maps": {
  "view_on_map": "Ver no mapa",
  "add_to_trip": "Adicionar à viagem",
  "select_trip": "Selecionar viagem",
  "added_to_trip_success": "Adicionado com sucesso a {{trip}}",
  "error_adding_to_trip": "Não foi possível adicionar o local à viagem",
  "error_loading_trips": "Não foi possível carregar as viagens",
  "no_trips": "Você não tem viagens",
  "create_trip_first": "Crie primeiro uma viagem para adicionar locais",
  "already_added_title": "Já adicionado",
  "already_added_message": "Este local já está na viagem selecionada"
},
```

### Hindi (hi.json)
```json
"maps": {
  "view_on_map": "मानचित्र पर देखें",
  "add_to_trip": "यात्रा में जोड़ें",
  "select_trip": "यात्रा चुनें",
  "added_to_trip_success": "{{trip}} में सफलतापूर्वक जोड़ा गया",
  "error_adding_to_trip": "स्थान को यात्रा में नहीं जोड़ा जा सका",
  "error_loading_trips": "यात्राएं लोड नहीं की जा सकीं",
  "no_trips": "आपकी कोई यात्रा नहीं है",
  "create_trip_first": "स्थान जोड़ने के लिए पहले एक यात्रा बनाएं",
  "already_added_title": "पहले से जोड़ा गया",
  "already_added_message": "यह स्थान पहले से चयनित यात्रा में है"
},
```

### Japonés (ja.json)
```json
"maps": {
  "view_on_map": "地図で見る",
  "add_to_trip": "旅行に追加",
  "select_trip": "旅行を選択",
  "added_to_trip_success": "{{trip}}に正常に追加されました",
  "error_adding_to_trip": "場所を旅行に追加できませんでした",
  "error_loading_trips": "旅行を読み込めませんでした",
  "no_trips": "旅行がありません",
  "create_trip_first": "場所を追加するには、まず旅行を作成してください",
  "already_added_title": "すでに追加済み",
  "already_added_message": "この場所は選択した旅行にすでにあります"
},
```

### Chino (zh.json)
```json
"maps": {
  "view_on_map": "在地图上查看",
  "add_to_trip": "添加到行程",
  "select_trip": "选择行程",
  "added_to_trip_success": "已成功添加到 {{trip}}",
  "error_adding_to_trip": "无法将地点添加到行程",
  "error_loading_trips": "无法加载行程",
  "no_trips": "您没有行程",
  "create_trip_first": "请先创建行程以添加地点",
  "already_added_title": "已添加",
  "already_added_message": "此地点已在所选行程中"
},
```

## Ubicación
Todas estas traducciones deben agregarse en la sección `"social": { ... }` después del bloque `"share": { ... },` en cada archivo de idioma correspondiente.
