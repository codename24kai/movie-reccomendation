# Dokumentasi Proyek MovieHub

## 1. Project Overview (Gambaran Umum Proyek)

**MovieHub** (atau Sistem Rekomendasi Film Hybrid) adalah sebuah platform aplikasi web komprehensif yang dirancang untuk memberikan rekomendasi film yang dikustomisasi untuk pengguna sekaligus menyediakan ruang interaksi sosial (forum komunitas).


Memberikan rekomendasi film yang akurat dan personal kepada pengguna dengan menggabungkan teknik _Collaborative Filtering_ dan _Content-Based/Machine Learning_ untuk mengatasi masalah umum seperti _cold-start_ (pengguna baru) dan memberikan hasil yang relevan.


Selain sebagai direktori film yang kaya akan informasi (bersumber dari TMDB), proyek ini berfungsi sebagai media sosial khusus bagi pecinta film. Pengguna dapat melacak film yang sudah ditonton, menambahkannya ke _watchlist_, memberikan rating, ulasan, hingga berdiskusi pada forum komunitas interaktif (membuat post, thread, komentar, dan _upvote/downvote_).


Dikembangkan oleh Tim PJK-GM050, MovieHub menghadirkan perpaduan antara kecerdasan buatan dalam kurasi konten dan kehangatan komunitas. Saat pengguna pertama kali mendaftar, mereka akan disuguhkan film-film populer. Seiring berjalannya interaksi pengguna dengan platform, sistem (SVD + Random Forest) akan mempelajari preferensi mereka dan menyesuaikan rekomendasinya secara dinamis.

---

## 2. Architecture & Tools (Arsitektur dan Alat)

Proyek ini mengadopsi arsitektur _Client-Server_ modern dengan menggunakan berbagai teknologi _stack_ terkini.

### **Backend:**

- **Python 3:** Bahasa pemrograman utama.
- **Flask & Flask-CORS:** Framework web ringan untuk membangun RESTful API.
- **Machine Learning & Data Processing:**
  - `pandas`, `numpy`: Pemrosesan dan manipulasi data.
  - `scikit-learn`: Digunakan untuk model **Random Forest** (RF).
  - `scikit-surprise`: Digunakan untuk model **SVD** (Singular Value Decomposition).
- **Autentikasi & Keamanan:** `PyJWT` (JSON Web Tokens), `werkzeug.security` (Hashing Password), dan integrasi Google OAuth.
- **Concurrency:** `concurrent.futures.ThreadPoolExecutor` untuk paralelisasi _fetching_ data dari API eksternal agar respons lebih cepat.
- **Deployment & Environment:** `gunicorn`, `python-dotenv`.

### **Frontend:**

- **React (Vite):** Digunakan sebagai _library_ utama antarmuka pengguna berbasis komponen.
- **React Router:** Manajemen rute halaman (Single Page Application).
- **CSS:** _Styling_ custom (`App.css`, `index.css`) dan desain antarmuka modern.

### **Database & External APIs:**

- **MongoDB Atlas:** Database NoSQL berbasis cloud untuk menyimpan data pengguna, status film (_watchlist_, riwayat), forum (thread, post, komentar), dan sistem _voting_.
- **TMDB API (The Movie Database):** Sumber utama data eksternal untuk detail film, poster, _trailer_ YouTube resmi, daftar popularitas, _trending_, pencarian, dan _now playing_.

---

## 3. Fitur yang Disediakan Proyek

### **Fitur Utama (Core Features):**

1. **Hybrid Recommendation Engine:** Sistem rekomendasi cerdas yang menggabungkan pembobotan dinamis dari model SVD (melihat pola user lain) dan Random Forest (melihat fitur film). Mendukung mitigasi _cold-start_ dengan merekomendasikan film populer dari TMDB bagi pengguna baru.
2. **Community Forum:** Sistem forum komprehensif layaknya media sosial. Pengguna bisa membuat _thread_ diskusi, ulasan, _polling_, memberikan komentar, serta melakukan _upvote/downvote_ (atau _like/dislike_).
3. **Movie Catalog & Discovery:** Penjelajahan katalog film lengkap meliputi: Sedang Tayang (_Now Playing_), Sedang Tren (_Trending_), Nilai Tertinggi (_Top Rated_), Rilis Terbaru (_Latest_), dan penyaringan berdasarkan Genre.
4. **Detail & Trailer Film:** Menampilkan sinopsis lengkap, genre, durasi, _rating_ IMDB, serta memutar _trailer_ YouTube resmi langsung di dalam platform.

### **Fitur Pendukung:**

1. **Autentikasi Fleksibel:** Mendukung registrasi/login menggunakan email/password lokal serta **Google Login (OAuth)**.
2. **Manajemen Koleksi Pribadi:** Fitur _Watchlist_ (daftar tontonan) dan _Watched List_ (film yang sudah ditonton).
3. **Rating & Review System:** Pengguna bisa memberikan skor/rating dan ulasan teks untuk film yang sudah ditonton.
4. **User Profile & History:** Halaman profil yang melacak rekam jejak aktivitas pengguna, riwayat rating, dan preferensi mereka.
5. **Real-time Search:** Fitur pencarian judul film terintegrasi langsung dengan _engine_ TMDB API.

---

## 4. Struktur Halaman & Komponen (Frontend)

Proyek memisahkan _User Interface_ ke dalam Halaman (_Pages_) dan Komponen (_Components_) yang _reusable_.

### **Halaman Utama (Pages):**

- **`LandingPages.jsx`:** Halaman awal (_landing page_) untuk pengguna yang belum _login_, berisi informasi platform dan statistik hitungan _live_ (pengguna, film, dsb).
- **`Login.jsx` & `Register.jsx`:** Halaman autentikasi pengguna.
- **`Home.jsx`:** Dasbor utama pengguna setelah _login_. Menampilkan film rekomendasi khusus, film populer, dan navigasi cepat.
- **`Catalog.jsx`:** Halaman eksplorasi penuh untuk menjelajahi berbagai kategori film (Trending, Top Rated, Genre).
- **`MovieDetailPage.jsx`:** Halaman spesifik yang memuat rincian mendalam mengenai satu film tertentu.
- **`Community.jsx`:** Halaman khusus Forum Diskusi, tempat pengguna berinteraksi melalui postingan, _thread_, dan komentar.
- **`Profile.jsx`:** Halaman profil pribadi pengguna untuk melihat info akun dan aktivitas komunitas.
- **`Watchlist.jsx`:** Halaman manajemen daftar tontonan dan film yang sudah ditonton.

### **Komponen Pendukung (Components):**

- **Navigasi & Layout:** `Sidebar.jsx`, `TopBar.jsx`, `AmbientBanner.jsx`.
- **Display Film:** `MovieCard.jsx`, `HeroCarousel.jsx`, `RecommendedSection.jsx`, `CategoryFilter.jsx`, `SearchResults.jsx`.
- **Modal & Pop-ups:** `MovieDetailModal.jsx`, `TrailerModal.jsx`, `RatingModal.jsx`, `ConfirmDialog.jsx`, `FriendlistModal.jsx`, `UserProfileModal.jsx`, `Notification.jsx`.
- **Komunitas:** `Postcard.jsx`, `PostDetailModal.jsx`, `ThreadDetailModal.jsx`, `CommentThread.jsx`.
- **Fungsi Khusus:** `ProtectedRoute.jsx` (Keamanan _Route_ React), `UserHistory.jsx`.

---

## 5. Cara Kerja Backend & Penjelasan Endpoint API

Backend beroperasi sebagai perantara antara Frontend, model Machine Learning, MongoDB, dan API TMDB. Pada startup, server memuat dataset `csv` dan model ML yang telah diserialisasi (`.pkl`), lalu melakukan _caching lookup table_ untuk sinkronisasi ID Film lokal (MovieLens) ke TMDB ID.

### **Daftar Endpoint API:**

#### **1. General & Authentication**

- `GET /` : Endpoint pengecekan status (_health check_) server.
- `POST /register` : Mendaftarkan pengguna baru dengan melakukan _hashing_ password dan menyimpannya di MongoDB.
- `POST /login` : Autentikasi pengguna menggunakan email dan password, mengembalikan token JWT.
- `POST /auth/google` : Menangani login dan auto-registrasi melalui token akses dari Google OAuth.
- `GET /stats` : Mengembalikan jumlah statistik platform (total user, film, thread, dsb) untuk UI _Landing Page_.

#### **2. User & Interactions**

- `GET /user/<user_id>` : Mengambil profil informasi dasar pengguna.
- `GET /user/<user_id>/history` : Menarik gabungan riwayat rating pengguna dari file CSV (data _training_) dan MongoDB (interaksi baru).
- `POST /rate` : Menyimpan/memperbarui rating dan teks ulasan pengguna terhadap sebuah film.
- `POST /watchlist` : Menambah atau menghapus film dari daftar tontonan pengguna (_toggle_).
- `GET /watchlist/<user_id>` : Mengambil daftar lengkap _watchlist_ beserta detail meta-nya dari TMDB.
- `POST /watched` : Mengatur status film menjadi sudah/belum ditonton (_toggle_).
- `GET /watched/<user_id>` : Mengambil daftar film yang telah ditonton oleh pengguna.

#### **3. Movie Engine & Recommendation**

- `POST /recommend` : **(Endpoint Inti)** Menghasilkan daftar film rekomendasi. Proses:
  1. Cek film yang belum ditonton user.
  2. Kalkulasi bobot (jika _cold-start_, fallback ke popularitas TMDB).
  3. Memilah ratusan film kandidat dengan skor RF tertinggi, lalu dievaluasi skor personalisasinya dengan SVD.
  4. Penggabungan skor akhir (_Hybrid Score_).
  5. _Fetch_ secara paralel (multithreading) meta data ke TMDB dan mengembalikan *Top N* rekomendasi.
- `GET /movies/search?q=<query>` : Meneruskan _query_ pencarian langsung ke TMDB.
- `GET /movies/<movie_id>` : Mengambil detail film komprehensif, merangkai informasi trailer, durasi, rating secara spesifik.
- `GET /movie/<movie_id>/status/<user_id>` : Cek _state_ UI interaksi (apakah user sudah rate/watch film ini).

#### **4. Catalog Browsing (TMDB Wrapper)**

- `GET /movies` & `GET /movies/popular-tmdb` : Daftar film populer secara umum.
- `GET /movies/now-playing` : Film yang sedang tayang di bioskop saat ini.
- `GET /movies/trending` : Film yang sedang naik daun minggu ini.
- `GET /movies/top-rated` : Film terbaik sepanjang masa versi TMDB.
- `GET /movies/latest` : Rilis terbaru harian.
- `GET /movies/genre/<genre_name>` : Pencarian daftar film difilter berdasarkan nama genre spesifik.
- `GET /movies/preview` : Cuplikan data untuk _loading state_ halaman Catalog.
- `GET /movies/<movie_id>/trailer` : Mengekstrak _key_ YouTube trailer resmi dan _Teaser_ sebagai fallback.

#### **5. Community Forum**

- `GET /community/threads` : Mengambil daftar _thread_ diskusi terbaru beserta profil _author_ dan jumlah komentar.
- `POST /community/threads` : Membuat _thread_ diskusi baru dengan dukungan _tag_.
- `POST /community/posts` : Membuat variasi postingan (Diskusi, Ulasan, Polling).
- `PUT & DELETE /community/posts/<post_id>` : Mengedit konten postingan atau menghapusnya (beserta komentar turunan).
- `GET & POST /community/comments` : Membaca atau menambahkan komentar balasan ke sebuah _thread_.
- `POST /community/vote` : Memberikan skor _Upvote_ atau _Downvote_ pada thread atau komentar (_toggle_ mechanism).
- `POST /community/react` : Mekanisme _Like/Dislike_ pada _posts_.

---

## 6. Analisis SWOT dari Proyek

### **Strengths (Kekuatan):**

- **Akurasi Hybrid:** Penggabungan SVD (_Collaborative Filtering_) dan Random Forest memastikan kualitas rekomendasi yang lebih baik dan kebal terhadap berbagai bias, dibandingkan menggunakan metode tunggal.
- **Cold-Start Resilience:** Penanganan cerdas terhadap pengguna baru menggunakan mekanisme bobot dinamis dan fallback tren TMDB API.
- **Performa Responsif:** Implementasi _Thread Pooling_ (`concurrent.futures`) di backend mencegah _bottleneck_ pada pemrosesan _fetching_ API berantai.
- **Fitur Ekosistem Penuh:** Memiliki integrasi forum (komunitas media sosial) yang dapat meningkatkan retensi pengguna.

### **Weaknesses (Kelemahan):**

- **Ketergantungan Eksternal:** Sangat bergantung pada TMDB API. Jika API _down_, lambat, atau _rate limit_ tercapai, fungsi katalog akan mati total.
- **Beban Memori Startup:** Memuat DataFrame Pandas dan beberapa model Pickle `.pkl` langsung ke dalam memori RAM server bisa sangat membebani server saat dilakukan _scaling_.
- **Sistem Model Statis:** Model SVD dan RF tidak otomatis beradaptasi (retrain) dengan interaksi data baru secara _real-time_, membutuhkan _pipeline retraining_ berkala (melalui notebook).

### **Opportunities (Peluang):**

- **Ekspansi ke Serial TV:** Sistem dapat direplikasi untuk menangani tipe tontonan TV Shows.
- **Sistem Pertemanan & Gamifikasi:** Menambahkan lencana/skor kontribusi aktif dalam forum atau _Friend Request_ antar pengguna.
- **Caching Layer (Redis):** Integrasi sistem _Cache_ untuk endpoint `/movies/popular`, dll., akan drastis menurunkan waktu tunggu respons dan beban pemanggilan TMDB API.

### **Threats (Ancaman):**

- **Perubahan Kebijakan API TMDB:** Perubahan batasan penggunaan gratis TMDB dapat menjadi masalah kritis secara teknis dan finansial.
- **Skalabilitas Model:** Ketika skala mencapai puluhan ribu pengguna bersamaan, inferensi SVD dengan memori statis di satu _node_ Flask tidak akan sanggup bertahan tanpa orkestrasi _Microservices_ atau _Distributed Computing_.

---

## 7. Kesimpulan & Penutupan

MovieHub adalah representasi arsitektur perangkat lunak yang andal dengan menggabungkan _Machine Learning_ (_Data Science_) ke dalam aplikasi Web _Full-Stack_. Dengan memanfaatkan kekuatan MongoDB sebagai sistem _storage_ yang dinamis dan fleksibilitas React untuk _user experience_ yang interaktif, proyek ini secara efektif menyelesaikan dua masalah utama: apa yang harus ditonton (_recommendation_) dan dengan siapa harus membahasnya (_community forum_).

Adanya fondasi model hibrid, ekosistem _social-network_, dan pemisahan logika komponen dengan _best-practices_ membuka jalan lebar bagi platform ini untuk dikembangkan pada tahap produksi secara komersial di masa depan.
