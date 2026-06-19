
# MOVIEHUB PRODUCTION MAINTENANCE REVISION

## TUJUAN

Maintenance ini bertujuan untuk menyelesaikan seluruh bug yang masih ditemukan pada sistem, menghilangkan penggunaan mockup data, memperbaiki integrasi backend dan frontend, meningkatkan kualitas UI/UX, serta mempersiapkan MovieHub menuju tahap Production Ready.

---

# MAINTENANCE FITUR MINOR

## 1. Global Firefly Background

### Requirement

* Terapkan komponen FireflyBackground pada seluruh halaman aplikasi.
* FireflyBackground harus berjalan secara konsisten pada:
  * Home
  * Catalog
  * Community
  * Profile
  * UserProfile
  * Watchlist
  * Watched List
  * Landing Page
* Background harus tetap berada di layer belakang dan tidak mengganggu interaksi pengguna.

### Status Saat Ini

* Komponen sudah tersedia.
* Efek background tidak muncul pada halaman manapun.

### Prioritas

Medium

---

## 2. Confirm Dialog

### Requirement

Gunakan komponen ConfirmDialog pada seluruh aksi destruktif:

* Logout
* Hapus Postingan
* Hapus Komentar
* Hapus Review
* Hapus Watchlist
* Hapus Watched List

### Target

Tidak ada lagi aksi yang langsung dieksekusi tanpa konfirmasi pengguna.

---

## 3. Perbaikan Sidebar

### Requirement

* Avatar pengguna pada sidebar harus menggunakan data user yang sedang login.
* Hilangkan seluruh avatar mockup.
* Sinkronisasi dengan:
  * Login biasa
  * Login Google Authentication

### Prioritas

Medium

---

## 4. Sorotan Hari Ini

### Requirement

Redesign section "Sorotan Hari Ini":

* Bentuk visual menyerupai Movie Card.
* Ukuran tetap mengikuti layout saat ini.
* Tombol pada card harus berfungsi.
* Klik film harus membuka MovieDetailModal.
* Data berasal dari TMDB API.

### Prioritas

High

---

# MAINTENANCE FITUR MAJOR

## 1. Hapus MovieDetailPage

### Keputusan

MovieDetailPage akan dihapus dari sistem.

### Alasan

* Tidak stabil.
* Tidak berhasil mengambil data film secara konsisten.
* Duplikasi fungsi dengan MovieDetailModal.

### Pengganti

MovieDetailModal menjadi pusat detail film utama.

### Requirement

MovieDetailModal wajib menampilkan:

* Poster
* Backdrop
* Trailer
* Judul
* Genre
* Overview
* Runtime
* TMDB Rating
* IMDb Link
* Tagline
* Watchlist Button
* Watched Button
* Rating User
* Review User

### Target

Seluruh interaksi film dilakukan melalui MovieDetailModal.

### Prioritas

Critical

---

## 2. Watchlist dan Watched List

### Permasalahan

* Tombol tidak berfungsi.
* Endpoint belum berjalan normal.

### Requirement

Pastikan seluruh fitur berikut berfungsi:

#### Watchlist

* Tambah Watchlist
* Hapus Watchlist
* Ambil Data Watchlist
* Sinkronisasi MongoDB

#### Watched List

* Tambah Watched
* Hapus Watched
* Ambil Riwayat Watched
* Sinkronisasi MongoDB

### Prioritas

Critical

---

## 3. Integrasi Hybrid Recommendation dengan TMDB

### Permasalahan

Endpoint rekomendasi masih mengambil data film dari database MovieLens.

Akibatnya:

* Film lama terus muncul.
* Tidak relevan dengan katalog TMDB.

### Requirement

Model tetap menggunakan:

* MovieLens Dataset
* MongoDB Dataset

untuk proses training dan scoring.

Namun hasil rekomendasi wajib:

1. Menghasilkan movieId hasil prediksi.
2. Mapping movieId → tmdbId.
3. Mengambil seluruh informasi film dari TMDB.

Data yang ditampilkan:

* Poster
* Backdrop
* Trailer
* Rating
* Genre
* Overview
* Popularity

### Prioritas

Critical

---

## 4. Home Right Sidebar

### Permasalahan

Area kanan halaman Home masih terlihat kosong.

### Requirement

Tambahkan:

#### Top Contributor

Data real dari database.

Bukan mockup.

Parameter:

* Jumlah Rating
* Jumlah Review
* Jumlah Postingan
* Jumlah Komentar

#### Latest Discussion

Menampilkan:

* Judul postingan
* Username
* Waktu posting
* Jumlah komentar

Saat diklik:

* Navigasi ke postingan terkait.

### Prioritas

High

---

## 5. User Profile System

### Requirement

Pengguna dapat melihat profil pengguna lain.

#### Akses Profil

Bisa diakses melalui:

* Postingan
* Komentar
* Reply
* Friend List
* Top Contributor

### Perbaikan

Saat ini:

* Avatar terpotong.
* Profil user dari komentar tidak bisa dibuka.

### Target

Seluruh avatar dapat diklik dan mengarah ke UserProfile.

### Prioritas

High

---

## 6. Friend System

### Requirement

Tambahkan:

#### Statistik Teman

Menampilkan:

* Jumlah Teman

#### Friend List Modal

Saat diklik:

* Menampilkan daftar teman.

#### Navigasi Profil

Klik teman:

* Membuka UserProfile teman.

### Prioritas

Medium

---

## 7. Google Authentication

### Requirement

Saat login atau registrasi Google:

* Data otomatis masuk ke MongoDB.
* Jika akun belum ada → buat akun baru.
* Jika sudah ada → login.

Data yang disimpan:

* user_id
* username
* email
* profile_picture
* provider

### Prioritas

Critical

---

## 8. Profile & UserProfile Production Ready

### Requirement

Hilangkan seluruh mockup data.

Data harus berasal dari database.

#### Statistik User

* Total Rating
* Total Review
* Total Postingan
* Total Komentar
* Total Like
* Total Dislike
* Total Watched
* Total Watchlist

#### Riwayat Rating

Saat diklik:

* Muncul modal rating dan review lengkap.

#### Riwayat Aktivitas Forum

Saat diklik:

* Navigasi ke postingan atau komentar terkait.

### Prioritas

High

---

## 9. Notification System

### Permasalahan

Notification tidak berfungsi.

### Requirement

Saat terjadi:

* Like
* Dislike
* Comment
* Reply
* Mention
* Friend Request

Maka sistem wajib:

1. Menyimpan notifikasi ke MongoDB.
2. Mengirim notifikasi realtime SocketIO.
3. Menampilkan unread badge.
4. Menampilkan riwayat notifikasi.

### Prioritas

Critical

---

## 10. Private Chat System

### Permasalahan

Pesan antar user tidak terkirim.

### Requirement

Perbaiki:

* SocketIO Room
* Emit Event
* Receive Event
* Notification Event

### Target

Chat realtime berjalan dua arah.

### Prioritas

Critical

---

## 11. Community System Bug Fix

### Bug Polling

Saat memilih film:

* Opsi Film 1 masuk ke Opsi Film 2.

### Requirement

Perbaiki mapping opsi polling.

Tambahkan tipe polling baru:

#### Text Only Poll

Contoh:

"Film Marvel terbaik?"

* Avengers
* Iron Man
* Thor

Tanpa memilih film.

### Prioritas

High

---

## 12. Community Comment Counter

### Permasalahan

Komentar tersimpan di database.

Namun jumlah komentar pada postingan selalu:

0

### Requirement

Perbaiki sinkronisasi:

* Comment Count
* Reply Count
* Live Update

### Prioritas

High

---

## 13. Personalized Genre Recommendation

### Requirement

Jika user telah memiliki histori eksplorasi genre:

Tampilkan:

* Karena Anda Menyukai Action
* Karena Anda Menyukai Comedy
* Karena Anda Menyukai Sci-Fi

Data berasal dari:

* Rating History
* Watch History
* Search History
* Community Activity

### Prioritas

Medium

---

## 14. Environment Security

### Permasalahan

Credential masih hardcoded di app.py.

### Requirement

Pindahkan ke:

.env

Data yang wajib dipindahkan:

* SECRET_KEY
* MONGO_URI
* TMDB_API_KEY
* DATA_DIR
* MODELS_DIR

### Prioritas

Critical

---

# TARGET PRODUCTION READY

Setelah maintenance selesai:

* Tidak ada mockup data.
* Semua fitur sosial berfungsi.
* Semua fitur TMDB berfungsi.
* Watchlist dan Watched berjalan normal.
* Chat realtime berjalan normal.
* Notifikasi realtime berjalan normal.
* MovieDetailModal menjadi pusat detail film.
* Google Authentication tersimpan ke MongoDB.
* Sistem rekomendasi menggunakan Hybrid Model + TMDB.
* Home page lebih hidup dengan Top Contributor dan Latest Discussion.
* Seluruh halaman memiliki FireflyBackground aktif.
* Aplikasi siap masuk tahap Production Deployment.




# BUG REPORT - MOVIEHUB (FRONTEND & BACKEND)

## 1. Community Threads Endpoint Mengembalikan 405 Method Not Allowed

### Error

```text
127.0.0.1:5000/community/threads
Failed to load resource:
the server responded with a status of 405 (METHOD NOT ALLOWED)
```

### Dampak

* Halaman Community gagal memuat data thread.
* Postingan komunitas tidak tampil.
* Fitur forum menjadi tidak dapat digunakan.

### Kemungkinan Penyebab

* Method request frontend tidak sesuai dengan backend.
* Frontend mengirim POST tetapi backend hanya menerima GET.
* Frontend mengirim GET tetapi backend hanya menerima POST.
* Route Flask belum dikonfigurasi dengan methods yang sesuai.

### Requirement

* Audit endpoint `/community/threads`.
* Sinkronkan HTTP Method antara frontend dan backend.
* Tambahkan handling error jika endpoint gagal diakses.

### Prioritas

Critical

---

## 2. Duplicate React Key pada Komponen Community

### Error

```text
Encountered two children with the same key, `1339713`
```

### Dampak

* Postingan dapat muncul ganda.
* React gagal melakukan rendering secara konsisten.
* State komponen berpotensi tertukar.

### Kemungkinan Penyebab

Contoh:

```jsx
posts.map(post => (
  <PostCard key={post.id} />
))
```

Namun terdapat lebih dari satu post dengan id yang sama.

### Requirement

* Audit seluruh key pada list rendering.
* Pastikan setiap postingan memiliki identifier unik.
* Gunakan MongoDB ObjectId sebagai key utama.

Contoh:

```jsx
key={post._id}
```

### Prioritas

High

---

## 3. Movie Endpoint Mengembalikan 404 Not Found

### Error

```text
127.0.0.1:5000/movies/936075
404 (NOT FOUND)
```

### Dampak

* Detail film gagal dimuat.
* Modal film tidak dapat mengambil data.
* MovieDetailPage tidak dapat ditampilkan.

### Kemungkinan Penyebab

#### Mapping ID Salah

Frontend mengirim:

```text
936075
```

yang kemungkinan merupakan:

```text
tmdb_id
```

sementara backend mencari:

```text
movieId MovieLens
```

#### Endpoint Tidak Tersedia

Route:

```python
@app.route('/movies/<movie_id>')
```

belum ada.

### Requirement

* Audit seluruh endpoint detail film.
* Pisahkan route MovieLens ID dan TMDB ID.

Contoh:

```text
/movies/<movie_id>
/movies/tmdb/<tmdb_id>
```

### Prioritas

Critical

---

## 4. Google Authentication COOP Error

### Error

```text
Cross-Origin-Opener-Policy policy would block the window.closed call
```

### Dampak

* Popup Google Auth tidak tertutup dengan benar.
* Potensi gangguan pada login Google.

### Catatan

Biasanya muncul pada development environment.

Tidak selalu menyebabkan login gagal.

Namun perlu dilakukan audit konfigurasi:

* Google OAuth
* CORS
* COOP Header
* Redirect URI

### Requirement

* Audit implementasi Google Authentication.
* Uji login pada mode production.

### Prioritas

Medium

---

## 5. Community Endpoint Dipanggil Berulang Kali

### Gejala

```text
/community/threads
/community/threads
/community/threads
/community/threads
```

endpoint dipanggil berkali-kali.

### Dampak

* Membebani backend.
* Menambah latency.
* Membuat UI terasa lambat.

### Kemungkinan Penyebab

#### useEffect Loop

Contoh:

```jsx
useEffect(() => {
  fetchThreads();
}, [threads]);
```

Ketika state threads berubah:

* fetch ulang
* state berubah lagi
* fetch ulang lagi

menyebabkan loop.

### Requirement

* Audit useEffect pada Community.jsx.
* Pastikan dependency array benar.
* Hindari infinite re-render.

### Prioritas

High

---

## 6. Duplicate Render pada AuthContext

### Gejala

```text
DEBUG: Mencoba membaca Local Storage...
DEBUG: Mencoba membaca Local Storage...

User ditemukan...
User ditemukan...
```

Semua log muncul dua kali.

### Kemungkinan Penyebab

React Strict Mode.

Contoh:

```jsx
<React.StrictMode>
  <App />
</React.StrictMode>
```

Pada mode development React memang menjalankan effect dua kali.

### Requirement

* Verifikasi apakah hanya terjadi pada development.
* Tidak perlu diperbaiki jika tidak berdampak pada production.

### Prioritas

Low

---

# RINGKASAN PRIORITAS

## Critical

1. Community Endpoint 405
2. Movie Endpoint 404
3. Detail Film Gagal Dimuat

## High

4. Duplicate React Key
5. Community Fetch Loop

## Medium

6. Google Authentication COOP Issue

## Low

7. React Strict Mode Double Render




Tambahkan bagian ini ke dokumentasi maintenance dan bug tracking:

---

# BUG TRACKING & CODE QUALITY ISSUES

## 1. Flask-SocketIO Emit Error

### File Terkait

* app.py

### Error

```python
Unexpected keyword argument `room` in function `flask_socketio.emit`
```

Lokasi:

```python
emit('notification', payload, room=user_room)
```

atau

```python
socketio.emit('notification', payload, room=user_room)
```

Pyrefly menampilkan:

```text
Unexpected keyword argument `room`
```

### Analisis

Kemungkinan penyebab:

1. Import yang digunakan bukan emit dari Flask-SocketIO.

Contoh salah:

```python
from flask import emit
```

atau

```python
from flask_socketio import emit
```

namun type checker membaca signature yang berbeda.

2. Versi Flask-SocketIO dan type hint yang digunakan tidak sinkron.
3. Pyrefly tidak mengenali parameter room pada implementasi Flask-SocketIO yang digunakan.

### Requirement

* Audit seluruh import emit.
* Pastikan menggunakan:

```python
from flask_socketio import SocketIO, emit
```

* Audit seluruh penggunaan:

```python
emit(...)
socketio.emit(...)
```

* Validasi kompatibilitas Flask-SocketIO dengan Python 3.13.
* Pastikan event notifikasi realtime berjalan untuk:
  * komentar
  * reply
  * like
  * dislike
  * friend request
  * mention

### Prioritas

Medium

---

## 2. Endpoint Community Threads Menghasilkan HTTP 405

### Error

```text
127.0.0.1:5000/community/threads
405 METHOD NOT ALLOWED
```

### Analisis

Frontend mencoba mengakses endpoint:

```http
/community/threads
```

namun method yang digunakan tidak sesuai dengan method yang tersedia pada backend.

Contoh:

Frontend:

```javascript
fetch('/community/threads')
```

mengirim GET.

Backend:

```python
@app.route('/community/threads', methods=['POST'])
```

hanya menerima POST.

### Requirement

* Audit seluruh endpoint Community.
* Sinkronisasi method GET, POST, PUT, DELETE.
* Pastikan endpoint thread mendukung:
  * get all thread
  * create thread
  * edit thread
  * delete thread

### Prioritas

Critical

---

## 3. Duplicate React Key

### Error

```text
Encountered two children with the same key
1339713
```

### Analisis

React menemukan lebih dari satu item menggunakan key yang sama.

Contoh:

```jsx
{
  movies.map(movie => (
    <MovieCard
      key={movie.id}
      movie={movie}
    />
  ))
}
```

namun terdapat data:

```json
[
  { "id": 1339713 },
  { "id": 1339713 }
]
```

### Dampak

* Render tidak konsisten.
* Data dapat tertukar.
* Card dapat hilang atau terduplikasi.

### Requirement

* Audit seluruh map() pada frontend.
* Gunakan key yang benar-benar unik.

Contoh:

```jsx
key={`${movie.id}-${index}`}
```

atau

```jsx
key={movie.tmdb_id}
```

* Audit endpoint TMDB yang menghasilkan data duplikat.

### Prioritas

High

---

## 4. Movie Detail API Menghasilkan 404

### Error

```text
GET /movies/936075
404 NOT FOUND
```

### Analisis

Movie ID yang dikirim frontend merupakan TMDB ID:

```text
936075
```

namun backend masih mencari berdasarkan:

```python
movieId
```

dari dataset MovieLens.

### Requirement

Membuat pemisahan endpoint:

```http
GET /movies/<movieId>
```

untuk MovieLens.

dan

```http
GET /movies/tmdb/<tmdb_id>
```

untuk TMDB.

### Target

MovieDetailPage dapat memuat:

* poster
* backdrop
* trailer
* genres
* overview
* cast
* rating
* user reviews

langsung dari TMDB.

### Prioritas

Critical

---

## 5. Google Authentication COOP Warning

### Error

```text
Cross-Origin-Opener-Policy policy would block the window.closed call
```

### Analisis

Muncul saat proses login Google OAuth popup.

Biasanya disebabkan oleh:

* konfigurasi COOP
* popup OAuth
* localhost development environment

### Requirement

* Audit konfigurasi Google OAuth.
* Audit header:
  * COOP
  * CORS
  * CSP
* Pastikan popup login dapat ditutup normal setelah autentikasi berhasil.

### Prioritas

Medium

---

## 6. Notification System Belum Terintegrasi

### Permasalahan

Collection notification sudah ada namun belum digunakan secara penuh.

### Requirement

Saat terjadi aktivitas berikut:

* Like
* Dislike
* Comment
* Reply
* Friend Request
* Mention User

sistem wajib:

1. Menyimpan notification ke MongoDB.
2. Mengirim realtime notification via SocketIO.
3. Menampilkan badge unread.
4. Menampilkan riwayat notification.

### Prioritas

High

---

## 7. Technical Debt: Environment Variables Exposure

### Permasalahan

Masih ditemukan secret dan konfigurasi sensitif langsung pada source code.

Contoh:

```python
MONGO_URI = "mongodb+srv://..."
TMDB_API_KEY = "..."
SECRET_KEY = "..."
```

### Requirement

Pindahkan seluruh konfigurasi ke file:

```env
.env
```

Contoh:

```env
SECRET_KEY=xxxx
MONGO_URI=xxxx
TMDB_API_KEY=xxxx
DATA_DIR=./cleaned_data
MODELS_DIR=./models
```

Kemudian gunakan:

```python
load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
MONGO_URI = os.getenv("MONGO_URI")
TMDB_API_KEY = os.getenv("TMDB_API_KEY")
```

### Prioritas

Critical

### Security Impact

* API Key bocor.
* Database URI bocor.
* Risiko akses tidak sah ke MongoDB.
* Tidak memenuhi standar production deployment.

---

## Ringkasan Prioritas

### Critical

* Community endpoint 405.
* Movie API 404.
* Watchlist endpoint.
* Watched List endpoint.
* Recommendation endpoint masih memakai data database lama.
* Secret masih hardcoded di app.py.

### High

* Duplicate React Key.
* Notification System.
* Community System.
* Google Auth sinkronisasi user ke MongoDB.

### Medium

* Flask SocketIO emit room warning.
* COOP OAuth popup warning.
* UI consistency dan icon rendering.
