# Skema Pack Alkitab Offline (Fase 2)

Struktur mengikuti pack TB/KJV yang sudah ada di `www/data/alkitab_tb/` dan `www/data/alkitab_kjv/`.

## Folder per terjemahan

```
www/data/alkitab_{version}/
  index.json          # daftar kitab + metadata
  {book_code}.json    # ayat per kitab (sama seperti TB/KJV)
```

## `index.json`

```json
{
  "version": "rvr",
  "label": "Reina-Valera 1960",
  "locale": "es",
  "books": [
    { "kode": "gen", "nama": "Génesis", "pasal": 50 }
  ]
}
```

## `{book}.json` (contoh)

```json
{
  "kode": "jua",
  "nama": "Juan",
  "pasal": {
    "3": {
      "16": "Porque de tal manera amó Dios al mundo..."
    }
  }
}
```

## Versi target

| Kode folder   | Versi              | Region   |
|---------------|--------------------|----------|
| alkitab_tb    | TB LAI             | indonesia (✓) |
| alkitab_kjv   | KJV                | global (✓) |
| alkitab_rvr   | Reina-Valera 1960  | latam    |
| alkitab_jfa   | Almeida JFA        | brazil   |
| alkitab_krv   | Korean Revised     | korea    |
| alkitab_ja1955| Colloquial 1955    | japan    |
| alkitab_cuv   | Chinese Union      | china    |

## Integrasi kode

1. Tambah loader di `alkitabClient.js` (mirip `KJV_BASE`).
2. Set `bibleOffline: true` di `worshipLocales.js` setelah pack tersedia.
3. `lookup_verse` di `voiceToolsClient.js` otomatis memakai pack sesuai `getDefaultBibleVersion()`.

Sumber teks: pastikan lisensi public domain / terbuka sebelum distribusi Play Store.
