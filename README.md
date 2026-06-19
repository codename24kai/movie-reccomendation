# 🎬 MovieHub

## Project Overview

MovieHub adalah platform forum dan sistem rekomendasi film berbasis web yang dirancang untuk membantu pengguna menemukan, mendiskusikan, dan mengeksplorasi berbagai film dari berbagai genre dan periode waktu. Platform ini menggabungkan pengalaman komunitas dengan teknologi rekomendasi berbasis Machine Learning untuk memberikan pengalaman yang lebih personal dan interaktif.

Pengguna dapat membuat akun, mengelola daftar film yang ingin ditonton (Watchlist), menandai film yang telah ditonton (Watched List), memberikan rating dan ulasan, serta berpartisipasi dalam diskusi bersama pengguna lain. Selain itu, MovieHub menyediakan berbagai informasi film seperti poster, trailer, sinopsis, genre, tahun rilis, rating, popularitas, tagline, hingga tautan IMDb untuk membantu pengguna mengenal film secara lebih mendalam.

Untuk meningkatkan pengalaman pengguna, MovieHub dilengkapi dengan sistem rekomendasi film hibrida yang menggabungkan algoritma Matrix Factorization dan Random Forest. Pendekatan ini memungkinkan sistem menghasilkan rekomendasi yang lebih relevan berdasarkan preferensi pribadi pengguna, riwayat aktivitas, serta pola perilaku pengguna lain yang memiliki minat serupa.

MovieHub dibangun menggunakan arsitektur modern yang memisahkan frontend, backend, dan komponen Machine Learning. Frontend dikembangkan menggunakan React.js untuk menghadirkan antarmuka yang responsif dan interaktif, sedangkan backend menggunakan Flask sebagai REST API yang mengelola autentikasi, pengolahan data, dan komunikasi dengan sistem rekomendasi. Komponen Machine Learning bertanggung jawab dalam melakukan proses pelatihan model dan menghasilkan rekomendasi film yang dipersonalisasi.

Sumber data utama MovieHub berasal dari dataset MovieLens yang tersedia melalui Kaggle, yang kemudian diperkaya menggunakan The Movie Database (TMDB) API untuk memperoleh informasi film terkini seperti poster, trailer, backdrop, rating, dan metadata lainnya. Integrasi ini memungkinkan MovieHub menghadirkan kombinasi antara data historis yang kaya dan informasi film terbaru secara real-time.

---

## Key Features

* **Personalized Movie Recommendations** menggunakan Hybrid Recommendation System.
* **Watchlist Management** untuk menyimpan film yang ingin ditonton.
* **Watched List Tracking** untuk mencatat riwayat tontonan pengguna.
* **Rating and Review System** untuk memberikan penilaian dan ulasan terhadap film.
* **Community Discussion Forum** untuk berdiskusi dan berbagi opini mengenai film.
* **Trailer Integration** melalui TMDB dan YouTube.
* **Detailed Movie Information** mencakup genre, sinopsis, rating, runtime, tagline, dan popularitas.
* **Trending, Top Rated, Latest Release, dan Now Playing Movies**.
* **Responsive User Interface** yang mendukung berbagai ukuran perangkat.
* **User Authentication** dan Profile Management.

---

## Technology Stack

### Frontend
* React.js
* Tailwind CSS
* Font Awesome

### Backend
* Flask
* REST API

### Database
* MongoDB Atlas

### Machine Learning
* Matrix Factorization (Collaborative Filtering)
* Random Forest
* Hybrid Recommendation Engine

### External Services
* TMDB API
* IMDb
* MovieLens Dataset (Kaggle)

---

## Project Goals

MovieHub bertujuan untuk mengatasi kesulitan pengguna dalam menemukan film yang sesuai dengan preferensi mereka di tengah banyaknya pilihan yang tersedia saat ini. Dengan menggabungkan sistem rekomendasi berbasis kecerdasan buatan dan fitur komunitas yang interaktif, MovieHub berupaya menjadi platform yang tidak hanya membantu pengguna menemukan film yang tepat, tetapi juga menjadi ruang diskusi dan berbagi pengalaman bagi para pecinta film.

---
---

# Panduan Arsitektur & Pencegahan Error — MovieHub

> Dokumen ini merangkum arsitektur sistem MovieHub dan checklist pencegahan
> error berdasarkan masalah-masalah nyata yang ditemukan selama development.
> Simpan file ini di root project sebagai referensi tim.

---

## 1. Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React.js)                         │
│  Vite + React Router + Tailwind CSS                                  │
│  Port: localhost:5173                                                │
└───────────────────────────────┬───────────────────────────────────--┘
                                  │ fetch() — HTTP/JSON
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Flask + Python)                     │
│  app.py — Port: localhost:5000                                       │
│  flask_cors untuk izinkan request dari :5173                          │
│                                                                        │
│  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐ │
│  │  Model ML (.pkl)  │   │   Dataset (.csv)  │   │   MongoDB Atlas  │ │
│  │  - svd_model      │   │  - movies_clean   │   │  - users         │ │
│  │  - rf_model       │   │  - ratings_val_70 │   │  - movies        │ │
│  │                    │   │  - df_master      │   │  - ratings       │ │
│  │  Sumber: skor      │   │  Sumber: title,   │   │  - reviews       │ │
│  │  prediksi (SVD,    │   │  genres, rating   │   │  Sumber: poster, │ │
│  │  RF, hybrid)       │   │  history          │   │  trailer, auth,  │ │
│  │                    │   │                    │   │  wishlist        │ │
│  └──────────────────┘   └──────────────────┘   └──────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Poin Kunci Arsitektur

MovieHub memakai **3 sumber data berbeda** yang harus digabung (joined) di backend:

1. **CSV (`movies_clean.csv`, `df_master.csv`, `ratings_val_70.csv`)** — dataset
   asal (MovieLens-style), berisi `movieId`, `title`, `genres`, histori rating.
   Field memakai **camelCase** (`movieId`, `userId`).
2. **Model `.pkl` (SVD & Random Forest)** — sudah dilatih dari notebook,
   di-load sekali saat Flask start, dipakai untuk prediksi skor.
3. **MongoDB Atlas** — data dinamis: akun user, wishlist, rating baru dari
   user, **dan metadata visual film (`poster_url`, `trailer_url`)**.
   Field memakai **snake_case** (`movie_id`, `user_id`).

> **Akar dari hampir semua bug poster yang kita temui** adalah karena
> endpoint yang hanya mengambil dari satu sumber (misal `/recommend` cuma
> dari CSV+model) tidak menyertakan data dari sumber lain (MongoDB).
> Setiap kali membuat endpoint baru yang mengembalikan data film ke
> frontend, **selalu cek**: apakah field `poster_url`, `trailer_url`
> sudah ikut di-join dari `movies_collection`?

---

## 2. Konvensi Penamaan Field (Sumber Bug #1)

| Sumber             | Field ID Film | Field ID User | Style       |
|--------------------|---------------|----------------|-------------|
| CSV / model ML     | `movieId`     | `userId`       | camelCase   |
| MongoDB Atlas      | `movie_id`    | `user_id`      | snake_case  |

**Rekomendasi:**
- Idealnya, **normalisasi di backend** sebelum dikirim ke frontend — pilih
  satu konvensi (disarankan `snake_case` karena MongoDB sudah begitu) dan
  pastikan **setiap endpoint** mengembalikan field dengan nama yang konsisten.
- Kalau belum sempat refactor semua endpoint, di **frontend** selalu pakai
  fallback ganda:
  ```js
  const movieId = movie.movieId ?? movie.movie_id;
  const userId  = user.user_id  ?? user.id;
  ```
- **Saat query MongoDB dengan `$in` menggunakan ID dari pandas/numpy**,
  selalu cast eksplisit ke `int()` Python murni:
  ```python
  # SALAH — numpy.int64 tidak match dengan int di MongoDB BSON
  movie_ids = [r['movieId'] for r in results]

  # BENAR
  movie_ids = [int(r['movieId']) for r in results]
  ```

---

## 3. Checklist Pencegahan Error — Backend (Flask)

### 3.1 Saat Membuat Endpoint Baru yang Mengembalikan Data Film
- [ ] Apakah frontend butuh `poster_url`? Kalau iya, dan sumber data
      utamamu adalah CSV/model, **wajib enrich dari `movies_collection`**.
- [ ] Lakukan enrich dengan **satu query `$in`**, bukan query per-item di
      dalam loop (round-trip ke MongoDB Atlas itu mahal, bisa membuat
      response sangat lambat untuk 10-50 item).
- [ ] Cast semua ID ke `int()` Python murni sebelum dipakai di query Mongo.
- [ ] Bungkus query Mongo dengan `try/except` dan fallback `mongo_map = {}`
      — kalau Mongo down, endpoint tetap mengembalikan data (tanpa poster)
      bukannya error 500 total.

### 3.2 Konsistensi Response JSON
- [ ] Semua endpoint sukses mengembalikan `{"status": "ok", ...}`.
- [ ] Semua endpoint gagal mengembalikan `{"status": "error", "message": "..."}`
      dengan HTTP status code yang sesuai (400/404/500/503).
- [ ] Field array data selalu konsisten — kalau `/recommend` pakai key
      `"recommendations"`, dokumentasikan itu di docstring endpoint, JANGAN
      diam-diam ganti jadi `"movies"` di endpoint lain tanpa menyamakan.

### 3.3 Validasi Sebelum Query
- [ ] `check_model()` (atau sejenisnya) dipanggil di awal setiap endpoint
      yang butuh model ML — kembalikan 503 informatif kalau model belum
      ter-load.
- [ ] Validasi `request.get_json()` tidak `None` sebelum `.get(...)`.

### 3.4 Logging
- [ ] Setiap proses penting (load model, koneksi Mongo, generate
      rekomendasi) punya `logger.info`/`logger.warning` — ini yang paling
      menyelamatkan saat debugging "request tidak muncul" / "data kosong".

---

## 4. Checklist Pencegahan Error — Frontend (React)

### 4.1 `useEffect` Dependency — Hindari Infinite Loop
Masalah yang kita temui: `activeUser` dihitung ulang setiap render
(`JSON.parse(localStorage.getItem(...))` menghasilkan objek baru tiap kali),
lalu dipakai sebagai dependency `useEffect` → infinite loop → `isLoading`
selalu `true` → konten tidak pernah dirender.

**Aturan:**
- [ ] **Jangan** pakai object/array literal sebagai dependency `useEffect`
      kalau object itu dibuat ulang setiap render. Gunakan:
  - `useState(() => {...})` (lazy initializer, jalan sekali), atau
  - `useMemo`, atau
  - dependency berupa **primitive** (string/number) hasil ekstraksi dari
    object tersebut, misal `user?.user_id` bukan `user`.
- [ ] Untuk fetch yang hanya perlu jalan sekali saat mount, pakai
      `useEffect(() => {...}, [])` — titik.

### 4.2 Field Mapping dari Backend yang Berbeda-beda
Masalah yang kita temui: `/recommend` mengembalikan `recommendations`,
endpoint lain mengembalikan `movies`; field poster kadang ada kadang tidak.

**Aturan:**
- [ ] Saat menerima data dari API baru, **selalu `console.log` 1 contoh
      object mentahnya dulu** sebelum menulis kode yang mengasumsikan
      struktur tertentu.
- [ ] Tulis fungsi mapping/normalisasi kecil di titik fetch:
  ```js
  const recList = dataRec.recommendations ?? dataRec.movies ?? [];
  const normalized = recList.map(m => ({
    movieId: m.movieId ?? m.movie_id,
    poster_url: m.poster_url ?? null,
    // ...
  }));
  ```
- [ ] Selalu cek `Array.isArray(x)` sebelum `.length`/`.map`/`.slice` —
      mencegah crash kalau backend mengembalikan struktur tak terduga
      (misal halaman error HTML ter-parse jadi object aneh).

### 4.3 Gambar (`<img>`) & CORS
Masalah yang kita temui: `<img crossOrigin="anonymous">` pada poster yang
ditampilkan membuat gambar **gagal tampil total** kalau server gambar
(TMDB, dsb.) tidak mengirim header `Access-Control-Allow-Origin`.

**Aturan:**
- [ ] `crossOrigin="anonymous"` **HANYA** dipasang pada `<img>`/`Image()`
      yang dipakai untuk operasi `<canvas>` (misal ekstraksi warna dominan,
      `fast-average-color`). **JANGAN** dipasang pada `<img>` yang
      ditampilkan langsung ke user.
- [ ] Untuk operasi `<canvas>` semacam itu, gunakan objek `Image()`
      **terpisah** (tidak dirender ke DOM), dan selalu pasang `onerror`
      dengan fallback graceful (warna default, dll) — jangan biarkan
      fitur "bonus" (ambient color) mematahkan fitur utama (tampilan poster).

### 4.4 Selalu Sediakan Fallback UI
- [ ] Setiap fetch punya 3 state: `loading`, `error`, `empty`/`success`.
      Jangan biarkan halaman "diam" tanpa indikasi apapun saat data kosong
      atau fetch gagal — ini menyulitkan debugging dan membingungkan user.
- [ ] Komponen kartu film (`MovieCard`) sudah punya fallback poster
      (`ui-avatars`) — pertahankan ini untuk film yang memang belum
      memiliki `poster_url` di database.

---

## 5. Workflow Debugging "Data Tidak Muncul"

Ketika sebuah list/film/poster tidak muncul di halaman tertentu, ikuti
urutan ini (urutan paling efisien berdasarkan pengalaman debugging project ini):

1. **Bandingkan dengan halaman yang BERHASIL.** Kalau Trending/Catalog
   bekerja tapi Home tidak, cari **perbedaan kode** di antara mereka —
   biasanya endpoint berbeda, dependency `useEffect` berbeda, atau ada
   logic tambahan (fallback session, dsb.) yang justru jadi sumber bug.

2. **Tambahkan `console.log` di titik-titik kritis**, bukan cuma
   `console.error` di `catch`:
   - Sebelum fetch: log parameter yang dikirim (`userId`, dst.)
   - Setelah fetch: log `response.status` dan `response.ok`
   - Setelah `.json()`: log body lengkap
   - Setelah mapping/normalisasi: log hasil akhir array

3. **Cek Network tab dengan "Preserve log" aktif** — request yang sudah
   selesai sebelum DevTools dibuka tidak akan tercatat tanpa opsi ini.

4. **Cek terminal Flask**, bukan cuma browser console — error 500 atau
   exception Python hanya muncul di sana, bukan di response JSON
   (kecuali sudah ditangani `try/except`).

5. **Kalau data ada tapi field kosong/null** → masalah ada di **proses
   join/enrich antar sumber data** (CSV ↔ MongoDB) — cek tipe data ID
   (`int` vs `numpy.int64` vs `string`) dan nama field (camelCase vs
   snake_case).

---

## 6. Quick Reference — Daftar Endpoint Saat Ini

| Endpoint                     | Method | Sumber Data Utama        | Catatan |
|-------------------------------|--------|---------------------------|---------|
| `/`                            | GET    | -                          | Health check |
| `/register`                    | POST   | MongoDB (`users`)          | |
| `/login`                        | POST   | MongoDB (`users`)          | Return JWT |
| `/recommend`                    | POST   | CSV + model `.pkl` + MongoDB (enrich poster) | Field: `recommendations` |
| `/movies`                       | GET    | CSV (`movies_df`)          | Paginated, **tidak ada poster_url** |
| `/movies/search`                | GET    | CSV (`movies_df`)          | |
| `/movies/trending`              | GET    | MongoDB (`movies`)         | Field: `movies`, sudah ada poster |
| `/movies/preview`               | GET    | MongoDB (`movies`)         | Field: `movies`, sudah ada poster |
| `/user/<id>/history`            | GET    | CSV (`ratings_df` + `movies_df`) | Field: `ratings` |
| `/wishlist`                      | POST   | MongoDB (`users`)          | Toggle |
| `/wishlist/<id>`                 | GET    | MongoDB (`users` + `movies`) | |
| `/rate`                          | POST   | MongoDB (`ratings`)        | |

> **Catatan:** `/movies` (dari CSV) tidak memiliki `poster_url`, sedangkan
> `/movies/trending` dan `/movies/preview` (dari MongoDB) memilikinya.
> Kalau membuat fitur baru yang butuh poster + data CSV (genre lengkap,
> histori rating, dll), ikuti pola enrich seperti di `/recommend`.

---

## 7. Saran Perbaikan Jangka Panjang (Opsional)

1. **Migrasi penuh ke MongoDB** — import seluruh `movies_clean.csv` ke
   `movies_collection` (dengan `poster_url` sudah terisi via scraping
   TMDB sekali di awal). Setelah itu, `/movies`, `/recommend`, dan semua
   endpoint lain query dari satu sumber yang sama → menghilangkan masalah
   join/mismatch field secara permanen.
2. **Buat helper function** `enrich_with_poster(movie_ids: list[int]) -> dict`
   di backend, dipakai ulang di semua endpoint yang butuh poster — hindari
   duplikasi logic enrich seperti yang sekarang ada di `/recommend`.
3. **Standarkan field naming** di seluruh response API (pilih satu:
   `movie_id` atau `movieId`) dan dokumentasikan di docstring tiap endpoint.
4. **Tulis test sederhana** (pytest) untuk tiap endpoint yang mengecek:
   status code 200, `status: "ok"`, dan field wajib (`poster_url`,
   `title`, dll) ada di setiap item array.

---

*Dokumen ini dibuat berdasarkan sesi debugging project MovieHub —
update sesuai perkembangan arsitektur project.*















