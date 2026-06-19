

# 📄 DOKUMENTASI PERBAIKAN MOVIEHUB (TARGET: CODEX)

**Aturan Utama (Strict Rule):** JANGAN MENAMBAHKAN ENDPOINT BARU. Modifikasi dan optimalkan endpoint yang sudah ada di `app.py`.

## TUGAS 1: PERBAIKAN SISTEM REKOMENDASI (HOME PAGE)

**Tujuan:** Rekomendasi harus akurat berdasarkan interaksi User (Rating, Watchlist, Watched List), bebas dari bug duplikat, dan memiliki section baru "Karena kamu menonton [Film A]".

### A. Modifikasi Backend (`app.py`) - Endpoint `POST /recommend`

Konteks: Karena dilarang membuat endpoint baru, kita akan memperluas *response* dari endpoint ini.

1. **Ambil Data Interaksi Lengkap:** Di dalam fungsi `recommend()`, ambil data dari 3 koleksi: `ratings`, `watchlist_collection`, dan `watched_collection` milik `user_id`.
2. **Cegah Duplikat (Strict Set):** Buat variabel `seen_tmdb_ids = set()`. Masukkan semua `movie_id` yang sudah ada di history/watchlist/watched user ke dalam set ini agar TIDAK direkomendasikan ulang.
3. **Logika "Karena kamu menonton X":**

   * Cari 1 film terakhir yang baru saja ditonton (dari `watched_collection`) atau diberi rating tinggi (dari `ratings`).
   * Simpan judul film tersebut (misal: "Film A").
   * Filter sebagian hasil model ML (SVD/RF) yang memiliki *genre* atau *fitur* paling mirip dengan "Film A".
4. **Format Response:** Ubah balasan JSON menjadi:
   **JSON**

   ```
   {
     "status": "ok",
     "recommendations": [...], // Daftar rekomendasi hybrid (anti-duplikat)
     "based_on_recent": {
       "reference_movie": "Inception", // Nama film A
       "movies": [...] // Daftar 4-6 film yang mirip
     }
   }
   ```

### B. Modifikasi Frontend (`frontend/src/pages/Home.jsx`)

1. **Pencegahan Duplikat di UI Virtual DOM:** * Pada fungsi `mergeRecommendationBuckets`, pastikan ID dikonversi mutlak ke String: `const key = String(movie.movieId || movie.movie_id || movie.tmdb_id).trim();`.

   * Pada saat mapping (perulangan) `<MovieCard />`, berikan key yang menggabungkan ID dan Index: `key={`${movie.movieId}-${index}`}`.
2. **Penambahan State Baru:** Tambahkan state `[recentRecs, setRecentRecs]` dan `[referenceMovie, setReferenceMovie]`. Ekstrak dari response `data.based_on_recent`.
3. **Render Section Baru:** Buat section khusus di atas/bawah rekomendasi AI:
   **JavaScript**

   ```
   {referenceMovie && recentRecs.length > 0 && (
     <MovieSection 
       title={`Karena kamu menonton "${referenceMovie}"`} 
       movies={recentRecs} 
       // ... props lainnya
     />
   )}
   ```

## TUGAS 2: PENGHAPUSAN SECTION "SOROTAN HARI INI" (CLEANUP)

**Tujuan:** Menghapus fitur banner secara bersih tanpa menyisakan bug state di `Home.jsx`.

### Modifikasi Frontend (`frontend/src/pages/Home.jsx`)

1. **Hapus State:** Cari dan hapus deklarasi `const [featuredMovie, setFeaturedMovie] = useState(null);`.
2. **Hapus Set Data:** Di dalam `useEffect` statis, hapus baris `setFeaturedMovie(trendingMoviesList[0] ?? null);`.
3. **Hapus Komponen & Import:** * Hapus baris `import AmbientBanner from '../components/AmbientBanner';` di bagian atas file.
   * Cari blok kode rendering JSX berikut dan  **HAPUS SECARA KESELURUHAN** :
     **JavaScript**

     ```
     {/* ── Hero Banner ── */}
     <section>
       <SectionHeading icon="fas fa-fire" iconColor="text-orange-400" title="Sorotan Hari Ini" />
       {featuredMovie ? ( ... ) : ( ... )}
     </section>
     ```

## TUGAS 3: SINKRONISASI LEADERBOARD & AKTIVITAS TERBARU

**Tujuan:** Sidebar kanan di `Home.jsx` harus menampilkan data yang benar-benar sinkron dengan aktivitas backend komunitas dan ulasan.

### A. Modifikasi Backend (`app.py`) - Endpoint `GET /stats/home`

1. **Aktivitas Terbaru (`recent_activity`):** Pastikan query mengambil 5 data terbaru dari koleksi `ratings` (yang memiliki review) ATAU `community_posts`. Gunakan `$lookup` ke koleksi `users` untuk mendapatkan `username` dan `profile_picture`.
2. **Leaderboard (`top_contributors`):** Lakukan agregasi untuk menghitung jumlah interaksi (posts + komentar + rating) tiap user. Limit 5 teratas. Kirim response sesuai format yang diharapkan `Home.jsx`.

### B. Modifikasi Frontend (`frontend/src/pages/Home.jsx`)

1. Pastikan logika pada `useEffect` yang melakukan `fetchWithTimeout('${API_BASE_URL}/stats/home')` memetakan array ke `setLeaderboard` dan `setRecentActivity` tanpa error  *undefined* .
2. Gunakan *optional chaining* `?.` secara defensif pada saat *mapping* rendering UI sidebar kanan.

## TUGAS 4: PERBAIKAN BUG JUDUL FILM PADA PROFILE

**Tujuan:** Memperbaiki teks "Judul Tidak Diketahui" pada Riwayat Rating di halaman Profile.

### A. Modifikasi Backend (`app.py`) - Endpoint `GET /api/user/<int:user_id>/history`

1. **Masalah Saat Ini:** Tabel `ratings` hanya berisi `movie_id`, tidak ada `title` atau `poster_path`.
2. **Solusi (Wajib Gunakan Agregasi Lookup):**
   Gunakan agregasi dengan konversi `$toString` agar `movie_id` (string) bisa match dengan `movie_id` di koleksi `movies` (int/string).
   **Python**

   ```
   pipeline = [
       {"$match": {"user_id": user_id}},
       {"$sort": {"created_at": -1}},
       {"$limit": limit},
       {
           "$lookup": {
               "from": "movies",
               "let": {"mid": "$movie_id"},
               "pipeline": [
                   {"$expr": {"$eq": [{"$toString": "$movie_id"}, {"$toString": "$$mid"}]}}
               ],
               "as": "movie_details"
           }
       },
       {
           "$project": {
               "rating": 1, "review": 1, "created_at": 1,
               "title": {"$cond": [{"$gt": [{"$size": "$movie_details"}, 0]}, {"$arrayElemAt": ["$movie_details.title", 0]}, "Judul Tidak Diketahui"]},
               "poster_path": {"$cond": [{"$gt": [{"$size": "$movie_details"}, 0]}, {"$arrayElemAt": ["$movie_details.poster_path", 0]}, None]}
           }
       }
   ]
   ```

### B. Modifikasi Frontend (`frontend/src/pages/Profile.jsx`)

1. Pastikan URL endpoint saat *fetch* di frontend sudah benar (menambahkan prefix `/api/` jika di `app.py` menggunakan `@app.route('/api/...`)`.
2. Pastikan mapping menggunakan field hasil dari agregasi: `<h4 className="text-white">{item.title}</h4>`.
