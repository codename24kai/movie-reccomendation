# 🎬 Back End API — Sistem Rekomendasi Film Hybrid
**Team PJK-GM050 | Back End Dev: M. Faiz Naashih Rozaq**

---

## Struktur Folder

```
sima_backend/
├── app.py              ← Flask API utama (ini file lo)
├── requirements.txt    ← Dependencies
├── save_models.py      ← Jalankan di Colab untuk export model
├── models/             ← Taruh file .pkl dari Nurdin di sini
│   ├── svd_model.pkl
│   └── rf_model.pkl
└── cleaned_data/       ← Taruh file .csv dari Sulthan di sini
    ├── movies_clean.csv
    ├── ratings_val_70.csv
    └── df_master.csv
```

---

## Setup & Jalankan

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Jalankan API
python app.py
# → API berjalan di http://localhost:5000
```

---

## Endpoints

### `GET /`
Health check, cek apakah API dan model sudah siap.

```json
{
  "status": "ok",
  "model_ready": true,
  "timestamp": "2025-01-01T12:00:00"
}
```

---

### `POST /recommend`
**Endpoint utama** — generate rekomendasi hybrid untuk satu user.

**Request:**
```json
{
  "user_id": 25062,
  "top_n": 10,
  "svd_weight": 0.5,
  "rf_weight": 0.5
}
```

**Response:**
```json
{
  "status": "ok",
  "user_id": 25062,
  "recommendations": [
    {
      "movieId": 318,
      "title": "Shawshank Redemption, The (1994)",
      "genres": "Crime|Drama",
      "svd_score": 4.312,
      "rf_score": 3.987,
      "hybrid_score": 4.149
    }
  ]
}
```

---

### `GET /movies?page=1&limit=20`
Daftar semua film dengan pagination.

---

### `GET /movies/search?q=avengers&limit=10`
Cari film berdasarkan judul (case-insensitive).

---

### `GET /user/<user_id>/history`
History rating yang pernah diberikan user.

---

### `POST /rate`
Submit rating baru dari user.

**Request:**
```json
{
  "user_id": 25062,
  "movie_id": 318,
  "rating": 4.5
}
```

---

## Koordinasi Tim

| Siapa | Butuh Apa dari Faiz |
|-------|-------------------|
| **Nabhan (FE)** | Base URL `http://localhost:5000`, format response JSON di atas |
| **Nurdin (ML)** | Jalankan `save_models.py` setelah training, kasih file `svd_model.pkl` & `rf_model.pkl` |
| **Sulthan (DE)** | Pastikan file `movies_clean.csv`, `ratings_val_70.csv`, `df_master.csv` ada di `./cleaned_data/` |

---

## Cara Export Model dari Colab (untuk Nurdin)

Setelah training selesai, tambahkan cell baru di notebook dan jalankan isi `save_models.py`.
Download folder `./models/` lalu taruh di direktori yang sama dengan `app.py`.
