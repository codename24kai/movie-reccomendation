"""
=====================================================
  Back End API - Sistem Rekomendasi Film Hybrid
  Team PJK-GM050 | Back End Dev: M. Faiz Naashih Rozaq
=====================================================
  Endpoints:
    GET  /                          → health check
    POST /recommend                 → rekomendasi hybrid (SVD + RF)
    GET  /movies                    → daftar semua film
    GET  /movies/search?q=<query>   → cari film by title
    GET  /user/<user_id>/history    → history rating user
    POST /rate                      → submit rating baru
=====================================================
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
import pickle
import os
import logging
import requests
import re
import uuid
from pymongo import MongoClient
import concurrent.futures
from dotenv import load_dotenv

# Load environment variables dari file .env
load_dotenv()

# ── Setup Flask ────────────────────────────────────────────────
from flask_socketio import SocketIO, emit, join_room, leave_room

app = Flask(__name__)

# CORS: Gunakan env var ALLOWED_ORIGINS untuk production. Fallback ke * hanya untuk dev.
_raw_origins = os.environ.get('ALLOWED_ORIGINS', '*')
_allowed_origins = [o.strip() for o in _raw_origins.split(',')] if _raw_origins != '*' else "*"
CORS(app, origins=_allowed_origins, supports_credentials=True)

app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY')
app.config['SESSION_COOKIE_SECURE'] = os.environ.get('FLASK_ENV') == 'production'
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

# Inisialisasi SocketIO
socketio = SocketIO(app, cors_allowed_origins=_allowed_origins, async_mode='threading')

# ── Constants & Configuration ──────────────────────────────────
MONGO_URI = os.environ.get('MONGO_URI')
TMDB_API_KEY = os.environ.get("TMDB_API_KEY")
TMDB_BASE_URL = "https://api.themoviedb.org/3"
DATA_DIR = os.environ.get("DATA_DIR", "./cleaned_data")
MODELS_DIR = os.environ.get("MODELS_DIR", "./models")

POSTER_FILTER = {"poster_url": {"$nin": [None, "", "null"]}}
MOVIE_FIELDS = {"_id": 0, "movie_id": 1, "title": 1, "genres": 1,
                "poster_url": 1, "overview": 1, "vote_average": 1,
                "popularity": 1, "release_year": 1, "tmdb_id": 1}

# ── Logging Setup ──────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── MongoDB Connection ─────────────────────────────────────────
try:
    print("⏳ Menghubungkan ke MongoDB Atlas...")
    client = MongoClient(MONGO_URI)
    db = client['movie_forum_db']  # Nama database akan otomatis dibuat

    # Deklarasi collections
    users_collection = db["users"]
    movies_collection = db["movies"]
    ratings_collection = db["ratings"]
    reviews_collection = db["reviews"]
    watchlist_collection = db["watchlist"]
    watched_collection = db["watched"]
    community_posts_collection = db["community_posts"]
    community_comments_collection = db["community_comments"]
    community_votes_collection = db["community_votes"]
    notifications_collection = db["notifications"]
    messages_collection = db["messages"]
    conversations_collection = db["conversations"]
    
    # Untuk backward compatibility (sudah dipakai di beberapa endpoint)
    threads_collection = community_posts_collection
    comments_collection = community_comments_collection
    votes_collection = community_votes_collection

    # Tes koneksi (ping)
    client.admin.command('ping')
    print("✅ Berhasil terhubung ke MongoDB Atlas!")
except Exception as e:
    print(f"❌ Gagal terhubung ke MongoDB: {e}")

# ── TMDB HELPER (WAJIB DITAMBAHKAN UNTUK ENDPOINT BARU) ────────

TMDB_GENRES = {
    28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
    99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
    27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Sci-Fi",
    10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western"
}
REVERSE_GENRES = {v.lower(): k for k, v in TMDB_GENRES.items()}

def format_tmdb_movie(item):
    """Format respons JSON TMDB agar persis seperti struktur yang diminta Frontend React."""
    genre_names = [TMDB_GENRES.get(gid, "") for gid in item.get('genre_ids', []) if gid in TMDB_GENRES]
    return {
        "movie_id": item.get('id'), # Movie ID kita sekarang adalah murni TMDB ID
        "title": item.get('title'),
        "poster_url": f"https://image.tmdb.org/t/p/w500{item['poster_path']}" if item.get('poster_path') else None,
        "vote_average": round(item.get('vote_average', 0), 1),
        "release_year": item.get('release_date', '')[:4] if item.get('release_date') else None,
        "overview": item.get('overview', ''),
        "genres": " | ".join(genre_names)
    }

# ── Load Models & Data ─────────────────────────────────────────
print("⏳ Loading models dan dataset...")

MODEL_READY = False
movies_df = pd.DataFrame()
ratings_df = pd.DataFrame()
rf_data_df = pd.DataFrame()
svd_model = None
rf_model = None
RF_FEATURES = []

try:
    # Load model SVD (Matrix Factorization)
    with open(f"{MODELS_DIR}/svd_model.pkl", "rb") as f:
        svd_model = pickle.load(f)
    print("✅ SVD model loaded")

    # Load model Random Forest
    with open(f"{MODELS_DIR}/rf_model.pkl", "rb") as f:
        rf_model = pickle.load(f)
    print("✅ Random Forest model loaded")

    # Load dataset
    movies_df = pd.read_csv(f"{DATA_DIR}/movies_clean.csv")
    ratings_df = pd.read_csv(f"{DATA_DIR}/ratings_val_70.csv")
    rf_data_df = pd.read_csv(f"{DATA_DIR}/df_master.csv")

    # Fitur RF — harus sama persis dengan yang dipakai saat training
    RF_FEATURES = [
        'year',
        'Action', 'Adventure', 'Animation', 'Children',
        'Comedy', 'Crime', 'Documentary', 'Drama',
        'Fantasy', 'Film-Noir', 'Horror', 'IMAX',
        'Musical', 'Mystery', 'Romance', 'Sci-Fi',
        'Thriller', 'War', 'Western'
    ]

    # Pra-hitung rf_score untuk semua film
    rf_data_df['rf_score'] = rf_model.predict(rf_data_df[RF_FEATURES].fillna(0))
    print("✅ Datasets loaded")
    MODEL_READY = True

except Exception as e:
    logger.warning(f"⚠️  Model/data belum tersedia: {e}")
    logger.warning("   API tetap jalan — endpoint akan return error informatif.")
    MODEL_READY = False

# ── Build TMDB Lookup ──────────────────────────────────────────
_movie_id_to_tmdb = {}
_tmdb_to_movie_id = {}

def _build_tmdb_lookup():
    """Bangun lookup dict movieId → tmdbId dari df_master.csv saat startup."""
    global _movie_id_to_tmdb
    try:
        if 'tmdbId' not in rf_data_df.columns:
            print(f"⚠️  Kolom tmdbId tidak ditemukan. Kolom tersedia: {rf_data_df.columns.tolist()}")
            return

        # Buang baris yang tmdbId-nya kosong/NaN
        valid = rf_data_df[['movieId', 'tmdbId']].dropna()

        _movie_id_to_tmdb = dict(
            zip(
                valid['movieId'].astype(int),
                valid['tmdbId'].astype(int)
            )
        )
        
        global _tmdb_to_movie_id
        _tmdb_to_movie_id = {v: k for k, v in _movie_id_to_tmdb.items()}
        
        print(f"✅ TMDB lookup siap: {len(_movie_id_to_tmdb)} entri dari df_master.csv")

    except Exception as e:
        print(f"⚠️  Gagal build TMDB lookup: {e}")

# Panggil saat startup (setelah MODEL_READY & data loaded)
if MODEL_READY:
    _build_tmdb_lookup()


# ================================================================
# HELPER FUNCTIONS
# ================================================================

def check_model():
    """Return error response kalau model belum siap."""
    if not MODEL_READY:
        return jsonify({
            "status": "error",
            "message": "Model belum dimuat. Pastikan file model (.pkl) dan data (.csv) sudah tersedia.",
            "hint": "Jalankan notebook Nurdin dulu, lalu simpan model dengan pickle."
        }), 503
    return None


def get_svd_scores(user_id: int, movie_ids: list) -> dict:
    """
    Prediksi rating SVD untuk satu user terhadap daftar film.
    Return: dict {movieId: predicted_rating}
    """
    scores = {}
    for mid in movie_ids:
        pred = svd_model.predict(user_id, mid)
        scores[mid] = round(pred.est, 4)
    return scores


def fetch_movie_detail_from_tmdb(tmdb_id: int) -> dict:
    """
    Ambil data lengkap film dari TMDB dengan fallback bahasa untuk overview.
    """
    try:
        headers = {"Authorization": f"Bearer {TMDB_API_KEY}"}

        # 1. Fetch detail film dengan bahasa id-ID
        detail_res = requests.get(
            f"{TMDB_BASE_URL}/movie/{tmdb_id}",
            headers=headers,
            params={"language": "id-ID", "append_to_response": "external_ids"},
            timeout=5
        )
        
        if detail_res.status_code != 200:
            return None
        
        detail = detail_res.json()
        
        # --- PERBAIKAN: Fallback Overview ke en-US jika kosong ---
        overview = detail.get("overview", "")
        if not overview or overview.strip() == "":
            # Coba ambil versi Inggris jika versi Indonesia kosong
            en_res = requests.get(
                f"{TMDB_BASE_URL}/movie/{tmdb_id}",
                headers=headers,
                params={"language": "en-US"},
                timeout=5
            )
            if en_res.status_code == 200:
                detail["overview"] = en_res.json().get("overview", "Sinopsis tidak tersedia.")
        
        # 2. Fetch Videos (Trailer)
        videos_res = requests.get(
            f"{TMDB_BASE_URL}/movie/{tmdb_id}/videos",
            headers=headers,
            params={"language": "en-US"},
            timeout=5
        )
        videos = videos_res.json().get("results", []) if videos_res.status_code == 200 else []

        # Ambil trailer YouTube terbaik
        trailer_key = None
        for v in videos:
            if v.get("site") == "YouTube" and v.get("type") == "Trailer":
                trailer_key = v["key"]
                break
        if not trailer_key:
            trailer_key = next(
                (v["key"] for v in videos if v.get("site") == "YouTube" and v.get("type") == "Teaser"),
                None
            )

        imdb_id = detail.get("external_ids", {}).get("imdb_id") or detail.get("imdb_id")
        imdb_url = f"https://www.imdb.com/title/{imdb_id}/" if imdb_id else None

        return {
            "movie_id": tmdb_id,
            "tmdb_id": tmdb_id,
            "imdb_id": imdb_id,
            "imdb_url": imdb_url,
            "title": detail.get("title", ""),
            "overview": detail.get("overview", "Sinopsis tidak tersedia."),
            "genres": " | ".join([g["name"] for g in detail.get("genres", [])]),
            "poster_url": (
                f"https://image.tmdb.org/t/p/w500{detail['poster_path']}"
                if detail.get("poster_path") else None
            ),
            "backdrop_url": (
                f"https://image.tmdb.org/t/p/w1280{detail['backdrop_path']}"
                if detail.get("backdrop_path") else None
            ),
            "trailer_key": trailer_key,
            "trailer_url": f"https://www.youtube.com/watch?v={trailer_key}" if trailer_key else None,
            "embed_url": f"https://www.youtube.com/embed/{trailer_key}?autoplay=1&rel=0" if trailer_key else None,
            "release_year": (detail.get("release_date") or "")[:4] or None,
            "vote_average": round(detail.get("vote_average", 0), 1),
            "vote_count": detail.get("vote_count", 0),
            "popularity": round(detail.get("popularity", 0), 2),
            "runtime": detail.get("runtime"),
            "tagline": detail.get("tagline", "")
        }

    except Exception as e:
        logger.error(f"⚠️ Gagal fetch TMDB untuk tmdb_id={tmdb_id}: {e}")
        return None




import random # Pastikan import random ada di atas file app.py kamu
import concurrent.futures
import requests

def get_hybrid_recommendations(user_id: int, top_n: int = 10,
                               svd_weight: float = 0.5,
                               rf_weight: float = 0.5) -> list:
    """
    Buat rekomendasi hybrid untuk user_id.

    Pipeline:
    1. Cari film yang belum ditonton/di-watchlist user
    2. Hitung bobot dinamis
    3. Penanganan Cold Start
    4. Ambil kandidat dengan Random Sampling agar dinamis
    5. Prediksi skor SVD & RF
    6. Enrich metadata rekomendasi langsung dari TMDB API
    """
    # ── 1. Film yang sudah ditonton & di-watchlist ──
    watched = set()
    if user_id in ratings_df['userId'].values:
        watched.update(ratings_df[ratings_df['userId'] == user_id]['movieId'])
    
    # Ambil riwayat ditonton DAN watchlist dari MongoDB agar tidak direkomendasikan ulang
    mongo_user = users_collection.find_one({"user_id": user_id})
    if mongo_user:
        watched.update(mongo_user.get('watched_list', []))
        watched.update(mongo_user.get('watchlist', [])) # <-- PERBAIKAN: Exclude watchlist
    
    mongo_ratings = ratings_collection.find({"user_id": user_id})
    for r in mongo_ratings:
        r_id = r.get("movie_id")
        if r_id in _tmdb_to_movie_id:
            watched.add(_tmdb_to_movie_id[r_id])
        else:
            watched.add(r_id)

    total_user_ratings = len(ratings_df[ratings_df['userId'] == user_id]) if user_id in ratings_df['userId'].values else 0
    mongo_rating_count = ratings_collection.count_documents({"user_id": user_id})
    total_ratings = total_user_ratings + mongo_rating_count

    # ── 2. Dynamic Weighting ──
    if abs(svd_weight - 0.5) < 0.01 and abs(rf_weight - 0.5) < 0.01:
        if total_ratings == 0:
            svd_weight, rf_weight = 0.1, 0.9  
        elif total_ratings < 5:
            svd_weight, rf_weight = 0.3, 0.7  
        elif total_ratings < 20:
            svd_weight, rf_weight = 0.5, 0.5  
        else:
            svd_weight, rf_weight = 0.7, 0.3  

    # ── 3. Penanganan Cold Start (Rekomendasi Terpopuler via TMDB) ──
    if total_ratings == 0:
        logger.info(f"👤 Cold start terdeteksi untuk user_id={user_id}. Menggunakan popularitas TMDB.")
        try:
            url = f"{TMDB_BASE_URL}/movie/popular?api_key={TMDB_API_KEY}&language=id-ID&page=1"
            res = requests.get(url, timeout=5).json()
            popular_movies = [format_tmdb_movie(m) for m in res.get('results', [])]
            
            recs = []
            for m in popular_movies:
                if m["movie_id"] not in watched:
                    m["svd_score"] = 0.0
                    m["rf_score"] = 0.0
                    m["hybrid_score"] = m.get("vote_average", 0.0)
                    recs.append(m)
                if len(recs) == top_n:
                    break
            return recs
        except Exception as e:
            logger.error(f"Gagal mengambil fallback cold start TMDB: {e}")
            return []

    # ── 4. Kandidat film dengan Random Sampling ──
    all_movies = set(ratings_df['movieId'].unique())
    candidate_pool = list(all_movies - watched)
    
    rf_lookup = rf_data_df.set_index('movieId')['rf_score'].to_dict()
    candidate_pool = sorted(candidate_pool, key=lambda x: rf_lookup.get(x, 0.0), reverse=True)
    
    # PERBAIKAN: Ambil 3000 terbaik, lalu ACAK dan ambil 1000. 
    # Ini membuat rekomendasi selalu "segar" tiap di-refresh tanpa mengubah model
    top_candidates = candidate_pool[:3000]
    random.shuffle(top_candidates)
    candidates = top_candidates[:1000]

    # ── 5. Hitung SVD score ──
    svd_scores = get_svd_scores(user_id, candidates)

    # ── 6. Hitung hybrid score ──
    results = []
    for movie_id, svd_score in svd_scores.items():
        rf_score = rf_lookup.get(movie_id, 0.0)
        
        # PERBAIKAN: Tambahkan sedikit noise/jitter ke skor (0 sampai 0.05) agar urutannya tidak kaku
        jitter = random.uniform(0, 0.05) 
        hybrid_score = (svd_weight * svd_score) + (rf_weight * rf_score) + jitter
        
        results.append({
            "movieId": int(movie_id),
            "svd_score": round(float(svd_score), 4),
            "rf_score": round(float(rf_score), 4),
            "hybrid_score": round(float(hybrid_score), 4),
        })

    results = sorted(results, key=lambda x: x['hybrid_score'], reverse=True)[:top_n * 2]

    # ── 7. Enrich dari TMDB API secara Paralel ──
    def enrich_one(r: dict) -> dict:
        try:
            mid = int(r['movieId'])
            tmdb_id = _movie_id_to_tmdb.get(mid)
            fallback_title = f"Film (ID: {mid})"

            if tmdb_id:
                tmdb_data = fetch_movie_detail_from_tmdb(int(tmdb_id))
                if tmdb_data:
                    tmdb_data["svd_score"] = r.get("svd_score", 0)
                    tmdb_data["rf_score"] = r.get("rf_score", 0)
                    tmdb_data["hybrid_score"] = r.get("hybrid_score", 0)
                    
                    if not tmdb_data.get("poster_url"):
                        title_clean = tmdb_data.get('title', fallback_title).replace(' ', '+')
                        tmdb_data["poster_url"] = f"https://ui-avatars.com/api/?name={title_clean}&background=random"
                    
                    return tmdb_data

            return None # Abaikan jika tidak valid di TMDB agar tidak merusak frontend
        except Exception as e:
            logger.error(f"Gagal memproses enrich_one untuk movieId={r.get('movieId')}: {e}")
            return None

    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        enriched_results = list(executor.map(enrich_one, results))

    enriched_results = [m for m in enriched_results if m is not None]
    final_recommendations = enriched_results[:top_n]

    logger.info(
        f"✅ Rekomendasi siap (dynamic hybrid): user_id={user_id}, "
        f"bobot SVD={svd_weight:.2f}, RF={rf_weight:.2f}, total={len(final_recommendations)}"
    )
    return final_recommendations


# ================================================================
# ROUTES
# ================================================================

# ── Endpoint Autentikasi Google ─────────────────────────────────

@app.route('/auth/google', methods=['POST'])
def google_auth():
    data = request.json
    access_token = data.get('access_token')

    if not access_token:
        return jsonify({"status": "error", "message": "Token tidak valid"}), 400

    # 1. Ambil data profil dari Google menggunakan access token
    try:
        google_response = requests.get(f"https://www.googleapis.com/oauth2/v3/userinfo?access_token={access_token}")
        google_user = google_response.json()
    except Exception as e:
        return jsonify({"status": "error", "message": "Gagal terhubung ke server Google"}), 500

    if "error" in google_user:
        return jsonify({"status": "error", "message": "Akses ditolak oleh Google"}), 401

    email = google_user.get("email")
    name = google_user.get("name")
    picture = google_user.get("picture")
    google_id = google_user.get("sub")

    # 2. Cek apakah user sudah terdaftar di MongoDB
    user = users_collection.find_one({"email": email})

    current_time = datetime.utcnow()

    if not user:
        # 3. Jika belum terdaftar, lakukan Auto-Register
        total_users = users_collection.count_documents({})
        new_user_id = total_users + 1000 
        
        new_user = {
            "user_id": new_user_id,
            "google_id": google_id,
            "username": name,
            "email": email,
            "password_hash": "", # Dikosongkan karena login via Google
            "profile_picture": picture,
            "watchlist": [],
            "watched_list": [],
            "following": [],
            "created_at": current_time,
            "last_login": current_time,
            "auth_provider": "google" # Penanda bahwa ini akun Google
        }
        users_collection.insert_one(new_user)
        user = new_user # Set user ke data yang baru dibuat
    else:
        # Update user eksisting dengan google_id, avatar, dan last_login
        users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {
                "google_id": google_id,
                "profile_picture": picture, # Selalu sync avatar terbaru dari Google
                "last_login": current_time
            }}
        )
        user["google_id"] = google_id
        user["profile_picture"] = picture

    # 4. Buat Token JWT (Sama seperti login biasa)
    token = jwt.encode({
        'user_id': user['user_id'],
        'exp': datetime.utcnow() + timedelta(hours=24)
    }, app.config['SECRET_KEY'], algorithm="HS256")

    return jsonify({
        "status": "ok",
        "message": "Login Google berhasil!",
        "token": token,
        "user": {
            "user_id": user['user_id'],
            "username": user['username'],
            "email": user['email'],
            "profile_picture": user.get('profile_picture')
        }
    }), 200



# ── Endpoint Autentikasi (Register & Login) ─────────────────────

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    # Validasi input kosong
    if not username or not email or not password:
        return jsonify({"status": "error", "message": "Semua kolom harus diisi!"}), 400

    # Cek apakah email atau username sudah terdaftar
    if users_collection.find_one({"$or": [{"email": email}, {"username": username}]}):
        return jsonify({"status": "error", "message": "Email atau Username sudah terdaftar!"}), 400

    # Acak password demi keamanan
    hashed_password = generate_password_hash(password)

    # Generate user_id berupa angka (untuk kebutuhan SVD & Random Forest nanti)
    # Kita hitung jumlah user saat ini lalu tambah 1
    total_users = users_collection.count_documents({})
    new_user_id = total_users + 1000  # Mulai dari ID 1000 agar tidak bentrok dengan data CSV

    # Siapkan dokumen user baru
    new_user = {
        "user_id": new_user_id,
        "username": username,
        "email": email,
        "password_hash": hashed_password,
        "profile_picture": f"https://ui-avatars.com/api/?name={username.replace(' ', '+')}&background=random",
        "watchlist": [],
        "following": [],
        "created_at": datetime.utcnow()
    }
    
    # Simpan ke MongoDB Atlas
    users_collection.insert_one(new_user)
    
    return jsonify({"status": "ok", "message": "Registrasi berhasil! Silakan login."}), 201


@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    # Cari user berdasarkan email
    user = users_collection.find_one({"email": email})

    # Cek apakah user ada DAN password cocok dengan hash di database
    if not user or not check_password_hash(user['password_hash'], password):
        return jsonify({"status": "error", "message": "Email atau password salah!"}), 401

    # Buat token JWT yang berlaku selama 24 jam
    token = jwt.encode({
        'user_id': user['user_id'],
        'exp': datetime.utcnow() + timedelta(hours=24)
    }, app.config['SECRET_KEY'], algorithm="HS256")

    return jsonify({
        "status": "ok",
        "message": "Login berhasil!",
        "token": token,
        "user": {
            "user_id": user['user_id'],
            "username": user['username'],
            "email": user['email'],
            "profile_picture": user['profile_picture']
        }
    }), 200

# ────────────────────────────────────────────────────────────────

# ── Endpoint Watchlist ──────────────────────────────────────────

@app.route('/watchlist', methods=['POST'])
def toggle_watchlist():
    data = request.json
    user_id = data.get('user_id')
    movie_id = data.get('movie_id')

    # Pastikan movie_id selalu integer agar konsisten di MongoDB
    try:
        movie_id = int(movie_id)
    except:
        return jsonify({"status": "error", "message": "ID film tidak valid"}), 400

    user = users_collection.find_one({"user_id": user_id})
    if not user:
        return jsonify({"status": "error", "message": "User tidak ditemukan"}), 404

    watchlist = user.get('watchlist', [])
    
    # Logika Toggle
    if movie_id in watchlist:
        users_collection.update_one({"user_id": user_id}, {"$pull": {"watchlist": movie_id}})
        message = "Film dihapus dari Watchlist"
        is_added = False
    else:
        users_collection.update_one({"user_id": user_id}, {"$push": {"watchlist": movie_id}})
        message = "Film ditambahkan ke Watchlist"
        is_added = True

    return jsonify({"status": "ok", "message": message, "is_added": is_added}), 200

@app.route('/watchlist/<int:user_id>', methods=['GET'])
def get_watchlist(user_id):
    user = users_collection.find_one({"user_id": user_id})
    if not user:
        return jsonify({"status": "error", "message": "User tidak ditemukan"}), 404
    
    movie_ids = user.get('watchlist', [])
    if not movie_ids:
        return jsonify({"status": "ok", "watchlist": []}), 200

    # Helper function untuk menarik data satuan dari TMDB
    def fetch_watchlist_meta(tmdb_id):
        try:
            url = f"{TMDB_BASE_URL}/movie/{tmdb_id}?api_key={TMDB_API_KEY}&language=id-ID"
            res = requests.get(url, timeout=5)
            if res.status_code == 200:
                return format_tmdb_movie(res.json())
        except:
            pass
        return None

    # Fetch data film dari TMDB secara paralel agar response time tetap cepat
    watchlist_movies = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        results = executor.map(fetch_watchlist_meta, movie_ids)
        for result in results:
            if result:
                watchlist_movies.append(result)
    
    return jsonify({"status": "ok", "watchlist": watchlist_movies}), 200

@app.route("/", methods=["GET"])
def health_check():
    """Health check — buat mastiin API nyala."""
    return jsonify({
        "status":      "ok",
        "service":     "Movie Recommendation API",
        "team":        "PJK-GM050",
        "version":     "1.0.0",
        "model_ready": MODEL_READY,
        "timestamp":   datetime.now().isoformat()
    })


# ── Endpoint Utama: Rekomendasi Hybrid ──────────────────────────
@app.route("/recommend", methods=["POST"])
def recommend():
    err = check_model()
    if err:
        return err

    body = request.get_json(silent=True)
    if not body or "user_id" not in body:
        return jsonify({
            "status":  "error",
            "message": "Field 'user_id' wajib diisi di request body."
        }), 400

    user_id    = int(body["user_id"])
    top_n      = min(int(body.get("top_n", 10)), 50)
    svd_weight = float(body.get("svd_weight", 0.5))
    rf_weight  = float(body.get("rf_weight", 0.5))

    if abs((svd_weight + rf_weight) - 1.0) > 0.01:
        return jsonify({
            "status":  "error",
            "message": "svd_weight + rf_weight harus = 1.0"
        }), 400

    logger.info(
        f"📽  Generating recommendations | "
        f"user_id={user_id} top_n={top_n} "
        f"svd={svd_weight} rf={rf_weight}"
    )

    try:
        # 1. Ambil rekomendasi mentah dari gabungan model ML (SVD + RF)
        raw_recs = get_hybrid_recommendations(user_id, top_n * 2, svd_weight, rf_weight) # Ambil lebih banyak untuk cadangan filter
        
        verified_recs = []
        
        # 2. Validasi & lengkapi data menggunakan metadata TMDB asli
        for item in raw_recs:
            if len(verified_recs) >= top_n:
                break
                
            # Ambil ID internal dari model
            mid = item.get("movieId") or item.get("movie_id")
            if not mid:
                continue
                
            # Konversi MovieLens ID ke TMDB ID menggunakan dictionary mapping yang kamu miliki
            tmdb_id = _movie_id_to_tmdb.get(int(mid)) if int(mid) in _movie_id_to_tmdb else mid
            
            if not tmdb_id:
                continue # Lewati jika film tidak memiliki relasi ke TMDB
                
            try:
                # Ambil data real-time langsung dari server TMDB agar judul, poster, dan sinopsisnya 100% akurat
                tmdb_url = f"{TMDB_BASE_URL}/movie/{tmdb_id}?api_key={TMDB_API_KEY}&language=id-ID"
                tmdb_res = requests.get(tmdb_url, timeout=3)
                
                if tmdb_res.status_code == 200:
                    tmdb_movie = tmdb_res.json()
                    
                    # Pastikan film memiliki poster sebelum dimasukkan ke daftar rekomendasi
                    poster_path = tmdb_movie.get("poster_path")
                    if not poster_path:
                        continue
                        
                    # Gabungkan metrik skor dari model ML dengan visual data dari TMDB
                    formatted_movie = {
                        "movieId": tmdb_id, # Frontend sekarang membaca tmdb_id sebagai token utama
                        "movie_id": tmdb_id,
                        "tmdb_id": tmdb_id,
                        "title": tmdb_movie.get("title") or item.get("title"),
                        "genres": "|".join([g["name"] for g in tmdb_movie.get("genres", [])]) if tmdb_movie.get("genres") else item.get("genres", ""),
                        "poster_url": f"https://image.tmdb.org/t/p/w500{poster_path}",
                        "backdrop_url": f"https://image.tmdb.org/t/p/w1280{tmdb_movie.get('backdrop_path')}" if tmdb_movie.get('backdrop_path') else None,
                        "overview": tmdb_movie.get("overview") or item.get("overview", ""),
                        "vote_average": tmdb_movie.get("vote_average") or item.get("vote_average", 0),
                        "vote_count": tmdb_movie.get("vote_count") or item.get("vote_count", 0),
                        "release_year": tmdb_movie.get("release_date")[:4] if tmdb_movie.get("release_date") else item.get("release_year", ""),
                        "runtime": tmdb_movie.get("runtime"),
                        "tagline": tmdb_movie.get("tagline"),
                        "imdb_id": tmdb_movie.get("imdb_id"),
                        "imdb_url": f"https://www.imdb.com/title/{tmdb_movie.get('imdb_id')}/" if tmdb_movie.get("imdb_id") else None,
                        
                        # Pertahankan skor perhitungan model untuk keperluan debugging/analisis backend
                        "svd_score": item.get("svd_score"),
                        "rf_score": item.get("rf_score"),
                        "hybrid_score": item.get("hybrid_score")
                    }
                    
                    verified_recs.append(formatted_movie)
            except Exception as tmdb_err:
                logger.warning(f"Gagal sinkronisasi TMDB untuk movieId {mid}: {tmdb_err}")
                continue

        return jsonify({
            "status":          "ok",
            "user_id":         user_id,
            "top_n":           top_n,
            "total_returned":  len(verified_recs),
            "svd_weight":      svd_weight,
            "rf_weight":       rf_weight,
            "recommendations": verified_recs
        }), 200

    except Exception as e:
        logger.error(f"❌ Error generate rekomendasi user_id={user_id}: {e}", exc_info=True)
        return jsonify({
            "status":  "error",
            "message": "Gagal membuat rekomendasi. Coba beberapa saat lagi.",
            "detail":  str(e)
        }), 500
# ── Endpoint Rekomendasi Berbasis Genre ─────────────────────────
@app.route("/recommend/genre/<int:user_id>", methods=["GET"])
def recommend_genre(user_id):
    """
    Menganalisa riwayat tontonan/rating user untuk menemukan genre favorit,
    lalu mengambil film dari TMDB berdasarkan genre tersebut.
    """
    try:
        # Ambil riwayat rating dari MongoDB
        mongo_ratings = list(ratings_collection.find({"user_id": user_id, "rating": {"$gte": 3.5}}))
        
        # Ambil riwayat dari CSV
        csv_ratings = []
        if user_id in ratings_df['userId'].values:
            user_ratings_df = ratings_df[(ratings_df['userId'] == user_id) & (ratings_df['rating'] >= 3.5)]
            csv_ratings = user_ratings_df['movieId'].tolist()
            
        movie_ids = [r.get("movie_id") for r in mongo_ratings] + csv_ratings
        
        if not movie_ids:
            return jsonify({"status": "ok", "genres": [], "recommendations": []}), 200
            
        # Hitung frekuensi genre
        genre_counts = {}
        for mid in movie_ids:
            # Ambil tmdb_id
            tmdb_id = _movie_id_to_tmdb.get(int(mid)) if int(mid) in _movie_id_to_tmdb else mid
            # Coba cari genre di data film yang ada
            movie = rf_data_df[rf_data_df['movieId'] == int(mid)]
            if not movie.empty:
                for col in RF_FEATURES[1:]: # Skip 'year'
                    if movie.iloc[0][col] == 1:
                        genre_counts[col] = genre_counts.get(col, 0) + 1
        
        if not genre_counts:
            return jsonify({"status": "ok", "genres": [], "recommendations": []}), 200
            
        # Ambil 2 genre teratas
        top_genres = sorted(genre_counts.items(), key=lambda x: x[1], reverse=True)[:2]
        top_genre_names = [g[0] for g in top_genres]
        
        # Mapping nama genre ke TMDB ID
        top_genre_ids = []
        for name in top_genre_names:
            if name.lower() in REVERSE_GENRES:
                top_genre_ids.append(str(REVERSE_GENRES[name.lower()]))
                
        if not top_genre_ids:
            return jsonify({"status": "ok", "genres": top_genre_names, "recommendations": []}), 200
            
        # Fetch dari TMDB Discover
        genre_query = ",".join(top_genre_ids)
        url = f"{TMDB_BASE_URL}/discover/movie?api_key={TMDB_API_KEY}&language=id-ID&with_genres={genre_query}&sort_by=popularity.desc&page=1"
        res = requests.get(url, timeout=5).json()
        
        movies = [format_tmdb_movie(m) for m in res.get('results', [])[:10]]
        
        return jsonify({
            "status": "ok", 
            "genres": top_genre_names, 
            "recommendations": movies
        }), 200
        
    except Exception as e:
        logger.error(f"Error di recommend_genre: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

# ── Endpoint Statistik Home Page ─────────────────────────────────
@app.route("/stats/home", methods=["GET"])
def home_stats():
    try:
        # Top Contributors (Aktivitas terbanyak: Rating + Review + Post)
        # Sederhana: Hitung jumlah rating tiap user di MongoDB
        pipeline = [
            {"$group": {"_id": "$user_id", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 5}
        ]
        top_raters = list(ratings_collection.aggregate(pipeline))
        
        top_contributors = []
        for tr in top_raters:
            uid = tr["_id"]
            user_data = users_collection.find_one({"user_id": uid})
            if user_data:
                top_contributors.append({
                    "user_id": uid,
                    "username": user_data.get("username", "Unknown"),
                    "profile_picture": user_data.get("profile_picture"),
                    "score": tr["count"] * 10 # Contoh perhitungan skor
                })
                
        # Recent Activity (Review terbaru)
        recent_reviews = list(reviews_collection.find().sort("created_at", -1).limit(5))
        recent_activity = []
        for r in recent_reviews:
            r['_id'] = str(r['_id'])
            user_data = users_collection.find_one({"user_id": r["user_id"]})
            recent_activity.append({
                "type": "review",
                "user": {
                    "user_id": r["user_id"],
                    "username": user_data.get("username", "Unknown") if user_data else "Unknown",
                    "profile_picture": user_data.get("profile_picture") if user_data else None
                },
                "movie_id": r["movie_id"],
                "content": r["content"],
                "created_at": r.get("created_at")
            })
            
        return jsonify({
            "status": "ok",
            "top_contributors": top_contributors,
            "recent_activity": recent_activity
        }), 200
    except Exception as e:
        logger.error(f"Error di home_stats: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


# ── Endpoint: Daftar Film ───────────────────────────────────────
@app.route("/movies", methods=["GET"])
def get_movies():
    """
    GET /movies?page=1
    Mengambil daftar film populer langsung dari TMDB dengan pagination.
    """
    try:
        page = request.args.get("page", 1)
        url = f"{TMDB_BASE_URL}/movie/popular?api_key={TMDB_API_KEY}&language=id-ID&page={page}"
        res = requests.get(url, timeout=5).json()
        
        movies = [format_tmdb_movie(m) for m in res.get('results', [])]
        
        return jsonify({
            "status": "ok",
            "page": int(page),
            "movies": movies
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ── Endpoint: Now Playing ──────────────────────────────────────
@app.route('/movies/now-playing', methods=['GET'])
def get_now_playing():
    """
    GET /movies/now-playing
    Ambil film yang sedang tayang di bioskop dari TMDB.
    """
    try:
        page = request.args.get('page', 1)
        url = f"{TMDB_BASE_URL}/movie/now_playing?api_key={TMDB_API_KEY}&language=id-ID&page={page}"
        res = requests.get(url, timeout=5).json()
        
        movies = [format_tmdb_movie(m) for m in res.get('results', [])]
        
        return jsonify({
            "status": "ok",
            "total": len(movies),
            "movies": movies
        }), 200
    except requests.exceptions.Timeout:
        return jsonify({"status": "error", "message": "TMDB API timeout"}), 504
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ── Endpoint: Popular TMDB ─────────────────────────────────────
@app.route('/movies/popular-tmdb', methods=['GET'])
def get_popular_tmdb():
    """
    GET /movies/popular-tmdb
    Sama seperti /movies, disediakan untuk kompatibilitas frontend lama.
    """
    try:
        page = request.args.get('page', 1)
        url = f"{TMDB_BASE_URL}/movie/popular?api_key={TMDB_API_KEY}&language=id-ID&page={page}"
        res = requests.get(url, timeout=5).json()
        
        movies = [format_tmdb_movie(m) for m in res.get('results', [])]
        
        return jsonify({"status": "ok", "movies": movies}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ── Endpoint: App Stats ────────────────────────────────────────
@app.route('/stats', methods=['GET'])
def get_stats():
    """
    GET /stats
    Statistik agregat untuk landing page (count-up animation).
    """
    try:
        total_users = users_collection.count_documents({})
        total_ratings = ratings_collection.count_documents({})
        total_reviews = ratings_collection.count_documents({"review": {"$ne": "", "$exists": True}})
        total_threads = threads_collection.count_documents({})

        return jsonify({
            "status": "ok",
            "total_movies": 980000, # Estimasi jumlah film di TMDB
            "total_users": total_users,
            "total_ratings": total_ratings,
            "total_reviews": total_reviews,
            "total_threads": total_threads,
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ── Endpoint: Cari Film ─────────────────────────────────────────
@app.route("/movies/search", methods=["GET"])
def search_movies():
    """
    GET /movies/search?q=avengers
    Mencari film langsung menggunakan TMDB Search API.
    """
    try:
        query = request.args.get("q", "").strip()
        page = request.args.get("page", 1)
        
        if not query:
            return jsonify({"status": "error", "message": "Parameter 'q' wajib diisi."}), 400
            
        url = f"{TMDB_BASE_URL}/search/movie?api_key={TMDB_API_KEY}&language=id-ID&query={query}&page={page}"
        res = requests.get(url, timeout=5).json()
        
        movies = [format_tmdb_movie(m) for m in res.get('results', [])]
        
        return jsonify({
            "status": "ok", 
            "query": query, 
            "results": movies
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ── Endpoint: Detail Film ─────────────────────────────────────
@app.route('/movies/<int:movie_id>', methods=['GET'])
def get_movie_detail_endpoint(movie_id):
    """
    GET /movies/318
    Menarik detail lengkap film untuk halaman MovieDetailPage.jsx
    menggunakan fungsi helper fetch_movie_detail_from_tmdb.
    """
    try:
        movie_detail = fetch_movie_detail_from_tmdb(movie_id)
        
        # Fallback: Jika gagal ditarik dari TMDB, mungkin ini adalah internal movieId
        if not movie_detail and movie_id in _movie_id_to_tmdb:
            actual_tmdb_id = _movie_id_to_tmdb[movie_id]
            movie_detail = fetch_movie_detail_from_tmdb(actual_tmdb_id)

        if not movie_detail:
            return jsonify({"status": "error", "message": "Film tidak ditemukan"}), 404
            
        return jsonify({"status": "ok", "movie": movie_detail}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500




# ── Endpoint: History Rating User ──────────────────────────────
@app.route("/user/<int:user_id>/history", methods=["GET"])
def user_history(user_id: int):
    """
    GET /user/25062/history?limit=20
    Ambil history rating yang sudah diberikan user (CSV + MongoDB).
    """
    limit = min(int(request.args.get("limit", 20)), 100)

    csv_ratings = []
    if not ratings_df.empty and user_id in ratings_df['userId'].values:
        user_r = ratings_df[ratings_df['userId'] == user_id].copy()
        merged = user_r.merge(
            movies_df[['movieId', 'title', 'genres']],
            on='movieId', how='left'
        )
        for _, row in merged.iterrows():
            csv_ratings.append({
                "movieId": int(row["movieId"]),
                "title": row["title"] if pd.notna(row["title"]) else "Unknown",
                "genres": row["genres"] if pd.notna(row["genres"]) else "",
                "rating": float(row["rating"]),
                "timestamp": int(row["timestamp"]) if "timestamp" in row else 0
            })

    mongo_ratings = []
    try:
        ratings_cursor = ratings_collection.find({"user_id": user_id})
        for r in ratings_cursor:
            mid = int(r["movie_id"])
            
            title = "Unknown"
            genres = ""
            if not movies_df.empty and mid in movies_df['movieId'].values:
                m_info = movies_df[movies_df['movieId'] == mid].iloc[0]
                title = m_info["title"]
                genres = m_info["genres"]

            mongo_ratings.append({
                "movieId": mid,
                "title": title,
                "genres": genres,
                "rating": float(r["rating"]),
                "timestamp": int(r.get("created_at", datetime.utcnow()).timestamp())
            })
    except Exception as e:
        logger.warning(f"⚠️ Gagal memuat rating MongoDB untuk user {user_id}: {e}")

    combined_dict = {}
    
    for r in csv_ratings:
        combined_dict[r["movieId"]] = r
        
    for r in mongo_ratings:
        combined_dict[r["movieId"]] = r

    all_ratings = sorted(combined_dict.values(), key=lambda x: x["timestamp"], reverse=True)
    total_ratings = len(all_ratings)

    all_ratings = all_ratings[:limit]

    return jsonify({
        "status":  "ok",
        "user_id": user_id,
        "total":   total_ratings,
        "ratings": all_ratings
    })


# ──  Endpoint Rating  ──────

@app.route('/rate', methods=['POST'])
def submit_rating():
    data = request.json
    user_id = data.get('user_id')
    movie_id = data.get('movie_id')
    rating = data.get('rating')
    review = data.get('review', '') 

    if not user_id or not movie_id or not rating:
        return jsonify({"status": "error", "message": "Data tidak lengkap"}), 400

    ratings_collection.update_one(
        {"user_id": user_id, "movie_id": movie_id},
        {"$set": {
            "user_id": user_id, 
            "movie_id": movie_id, 
            "rating": float(rating),
            "review": review, 
            "created_at": datetime.utcnow()
        }},
        upsert=True
    )
    
    return jsonify({"status": "ok", "message": "Rating & Review berhasil disimpan"}), 201

# ── Endpoint Trending ──────────────────────────────────────────
@app.route('/movies/trending', methods=['GET'])
def get_trending_movies():
    """
    GET /movies/trending
    Mengambil film trending minggu ini langsung dari TMDB.
    """
    try:
        url = f"{TMDB_BASE_URL}/trending/movie/week?api_key={TMDB_API_KEY}&language=id-ID"
        res = requests.get(url, timeout=5).json()
        
        # Ambil 20 film teratas
        movies = [format_tmdb_movie(m) for m in res.get('results', [])[:20]]
        
        return jsonify({"status": "ok", "movies": movies}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/movies/top-rated', methods=['GET'])
def get_top_rated():
    """
    GET /movies/top-rated
    Mengambil film dengan rating tertinggi sepanjang masa dari TMDB.
    """
    try:
        url = f"{TMDB_BASE_URL}/movie/top_rated?api_key={TMDB_API_KEY}&language=id-ID&page=1"
        res = requests.get(url, timeout=5).json()
        
        # Ambil 12 film teratas
        movies = [format_tmdb_movie(m) for m in res.get('results', [])[:12]]
        
        return jsonify({"status": "ok", "movies": movies}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/movies/latest', methods=['GET'])
def get_latest_movies():
    """
    GET /movies/latest
    Mengambil film terbaru yang baru saja rilis (hingga hari ini).
    Memfilter film dengan vote_count >= 10 agar tidak menampilkan film obscure/kotor.
    """
    try:
        from datetime import datetime
        today = datetime.today().strftime('%Y-%m-%d')
        
        url = f"{TMDB_BASE_URL}/discover/movie?api_key={TMDB_API_KEY}&language=id-ID&sort_by=primary_release_date.desc&primary_release_date.lte={today}&vote_count.gte=10"
        res = requests.get(url, timeout=5).json()
        
        # Ambil 12 film terbaru
        movies = [format_tmdb_movie(m) for m in res.get('results', [])[:12]]
        
        return jsonify({"status": "ok", "movies": movies}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    
@app.route('/movies/genre/<genre_name>', methods=['GET'])
def get_movies_by_genre(genre_name):
    """
    GET /movies/genre/Action
    Mengambil film berdasarkan genre dari TMDB API (diurutkan berdasarkan popularitas).
    """
    try:
        # Bersihkan string pencarian (misal 'Sci-Fi' atau 'sci-fi' -> 'scifi')
        query_clean = genre_name.lower().replace('-', '').strip()
        
        # Cari ID Genre TMDB yang cocok dari dictionary TMDB_GENRES
        genre_id = None
        for tmdb_id, name in TMDB_GENRES.items():
            if name.lower().replace('-', '') == query_clean:
                genre_id = tmdb_id
                break
                
        if not genre_id:
            return jsonify({"status": "error", "message": f"Kategori genre '{genre_name}' tidak ditemukan"}), 404
            
        url = f"{TMDB_BASE_URL}/discover/movie?api_key={TMDB_API_KEY}&language=id-ID&with_genres={genre_id}&sort_by=popularity.desc"
        res = requests.get(url, timeout=5).json()
        
        # Ambil 12 film teratas sesuai dengan limit di kode lamamu
        movies = [format_tmdb_movie(m) for m in res.get('results', [])[:12]]
        
        return jsonify({"status": "ok", "movies": movies}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    
# ── Endpoint Watched List ──────────────────────────────────────

@app.route('/watched', methods=['POST'])
def toggle_watched():
    data = request.json
    user_id = data.get('user_id')
    movie_id = data.get('movie_id')

    try:
        movie_id = int(movie_id)
    except:
        return jsonify({"status": "error", "message": "ID film tidak valid"}), 400

    user = users_collection.find_one({"user_id": user_id})
    if not user:
        return jsonify({"status": "error", "message": "User tidak ditemukan"}), 404

    watched_list = user.get('watched_list', [])
    
    # Logika Toggle Watched
    if movie_id in watched_list:
        users_collection.update_one({"user_id": user_id}, {"$pull": {"watched_list": movie_id}})
        message = "Film dihapus dari Watched List"
        is_watched = False
    else:
        users_collection.update_one({"user_id": user_id}, {"$push": {"watched_list": movie_id}})
        message = "Film ditandai sebagai sudah ditonton"
        is_watched = True

    return jsonify({"status": "ok", "message": message, "is_watched": is_watched}), 200


@app.route('/watched/<int:user_id>', methods=['GET'])
def get_watched_list(user_id):
    user = users_collection.find_one({"user_id": user_id})
    if not user:
        return jsonify({"status": "error", "message": "User tidak ditemukan"}), 404
    
    movie_ids = user.get('watched_list', [])
    if not movie_ids:
        return jsonify({"status": "ok", "watched_list": []}), 200
    
    # Fetch data film dari TMDB secara paralel
    def fetch_watched_meta(tmdb_id):
        try:
            url = f"{TMDB_BASE_URL}/movie/{tmdb_id}?api_key={TMDB_API_KEY}&language=id-ID"
            res = requests.get(url, timeout=5)
            if res.status_code == 200:
                return format_tmdb_movie(res.json())
        except:
            pass
        return None

    watched_movies = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        results = executor.map(fetch_watched_meta, movie_ids)
        for result in results:
            if result:
                watched_movies.append(result)
    
    return jsonify({"status": "ok", "watched_list": watched_movies}), 200


# ── Endpoint Cek Status Interaksi User (Untuk Modal) ───────────

@app.route('/movie/<int:movie_id>/status/<int:user_id>', methods=['GET'])
def check_movie_status(movie_id, user_id):
    """
    GET /movie/<movie_id>/status/<user_id>
    Cek apakah film sudah di-watched dan apa rating/review user tersebut.
    """
    user = users_collection.find_one({"user_id": user_id})
    
    # Ambil watched_list (pastikan cast ke int jika diperlukan)
    watched_list = [int(mid) for mid in user.get('watched_list', [])] if user else []
    
    # Cek rating & review di database rating (tidak bergantung pada movies_collection)
    rating_data = ratings_collection.find_one({"user_id": user_id, "movie_id": int(movie_id)})
    
    return jsonify({
        "status": "ok",
        "is_watched": int(movie_id) in watched_list,
        "rating": rating_data["rating"] if rating_data else 0,
        "review": rating_data.get("review", "") if rating_data else ""
    }), 200
    

# ── Endpoint: Katalog Preview ──────────────────────────────────
@app.route('/movies/preview', methods=['GET'])
def get_movie_preview():
    """
    GET /movies/preview
    Digunakan oleh halaman Catalog untuk menampilkan daftar awal.
    Menarik film populer terbaru dari TMDB.
    """
    try:
        url = f"{TMDB_BASE_URL}/movie/popular?api_key={TMDB_API_KEY}&language=id-ID&page=1"
        res = requests.get(url, timeout=5)
        res.raise_for_status()
        data = res.json()
        
        movies = [format_tmdb_movie(m) for m in data.get('results', [])]
        
        return jsonify({"status": "ok", "movies": movies}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    
    
# ── Endpoint: Trailer Film ─────────────────────────────────────

@app.route('/movies/<int:movie_id>/trailer', methods=['GET'])
@app.route('/movies/tmdb/<int:movie_id>/trailer', methods=['GET'])
def get_movie_trailer(movie_id):
    """
    GET /movies/{id}/trailer
    Menarik data trailer YouTube resmi langsung dari TMDB API.
    (Karena kita sudah migrasi 100% ke TMDB, movie_id yang dikirim Frontend adalah tmdb_id)
    """
    try:
        # Panggil endpoint videos dari TMDB
        url = f"{TMDB_BASE_URL}/movie/{movie_id}/videos?api_key={TMDB_API_KEY}&language=en-US"
        res = requests.get(url, timeout=5)
        res.raise_for_status()
        videos = res.json().get("results", [])

        # Prioritas: Official Trailer → Trailer Biasa → Teaser
        trailer = None
        for v in videos:
            if v.get("site") == "YouTube" and v.get("type") == "Trailer":
                trailer = v
                break
                
        if not trailer:
            trailer = next(
                (v for v in videos if v.get("site") == "YouTube" and v.get("type") == "Teaser"), None
            )

        if not trailer:
            return jsonify({
                "status": "error",
                "message": "Trailer tidak tersedia"
            }), 404

        key = trailer["key"]
        return jsonify({
            "status": "ok",
            "youtube_key": key,
            "embed_url": f"https://www.youtube.com/embed/{key}?autoplay=1&rel=0",
            "watch_url": f"https://www.youtube.com/watch?v={key}",
            "trailer_url": f"https://www.youtube.com/watch?v={key}" # Fallback property untuk komponen baru
        }), 200

    except requests.exceptions.Timeout:
        return jsonify({"status": "error", "message": "TMDB timeout"}), 504
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    
    
# ── Endpoint Forum Diskusi ───────────


@app.route('/community/posts', methods=['GET'])
def get_posts():
    """
    GET /community/posts?limit=20
    Mengambil daftar post komunitas terbaru.
    """
    try:
        limit = min(int(request.args.get('limit', 20)), 50)

        pipeline = [
            {"$sort": {"created_at": -1}},
            {"$limit": limit},
            {
                "$lookup": {
                    "from": "users",
                    "localField": "user_id",
                    "foreignField": "user_id",
                    "as": "author_info"
                }
            },
            {
                "$lookup": {
                    "from": "comments",
                    "let": {"pid": {"$ifNull": ["$post_id", "$thread_id"]}},
                    "pipeline": [
                        {"$match": {"$expr": {"$or": [
                            {"$eq": ["$post_id", "$$pid"]},
                            {"$eq": ["$thread_id", "$$pid"]}
                        ]}}}
                    ],
                    "as": "comments_list"
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "post_id": {"$ifNull": ["$post_id", "$thread_id"]},
                    "user_id": 1,
                    "type": {"$ifNull": ["$type", "discussion"]},
                    "content": 1,
                    "tags": 1,
                    "likes": 1,
                    "dislikes": 1,
                    "upvotes": 1,
                    "downvotes": 1,
                    "movie_id": 1,
                    "rating": 1,
                    "poll_options": 1,
                    "taggedMovie": 1,
                    "created_at": 1,
                    "updated_at": 1,
                    "comment_count": {"$size": "$comments_list"},
                    "author": {
                        "$cond": {
                            "if": {"$gt": [{"$size": "$author_info"}, 0]},
                            "then": {
                                "username": {"$arrayElemAt": ["$author_info.username", 0]},
                                "profile_picture": {"$arrayElemAt": ["$author_info.profile_picture", 0]}
                            },
                            "else": {"username": {"$ifNull": ["$author_name", "Anonim"]}, "profile_picture": "$author_avatar"}
                        }
                    }
                }
            }
        ]

        posts = list(threads_collection.aggregate(pipeline))

        # Konversi datetime -> ISO string agar aman di-parse new Date() di frontend
        for t in posts:
            if isinstance(t.get('created_at'), datetime):
                t['created_at'] = t['created_at'].isoformat()
            if isinstance(t.get('updated_at'), datetime):
                t['updated_at'] = t['updated_at'].isoformat()

        return jsonify({"status": "ok", "posts": posts}), 200
    except Exception as e:
        logger.error(f"Gagal mengambil daftar post: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/community/threads', methods=['POST'])
def create_thread():
    """
    POST /community/threads
    Body: user_id, content, optional tags
    """
    data = request.json or {}
    user_id = data.get('user_id')
    content = (data.get('content') or '').strip()
    tags = data.get('tags', [])

    if not user_id or not content:
        return jsonify({"status": "error", "message": "Data thread tidak lengkap"}), 400

    user = users_collection.find_one({"user_id": user_id}, {"_id": 0, "user_id": 1})
    if not user:
        return jsonify({"status": "error", "message": "User tidak ditemukan"}), 404

    normalized_tags = []
    if isinstance(tags, str):
        normalized_tags = [t.strip() for t in tags.split('|') if t.strip()]
    elif isinstance(tags, list):
        normalized_tags = [str(t).strip() for t in tags if str(t).strip()]

    thread_doc = {
        "thread_id": str(uuid.uuid4()),
        "user_id": user_id,
        "content": content,
        "tags": normalized_tags,
        "upvotes": 0,
        "downvotes": 0,
        "created_at": datetime.utcnow()
    }

    threads_collection.insert_one(thread_doc)

    response_thread = {
        "thread_id": thread_doc["thread_id"],
        "user_id": thread_doc["user_id"],
        "content": thread_doc["content"],
        "tags": thread_doc["tags"],
        "upvotes": thread_doc["upvotes"],
        "downvotes": thread_doc["downvotes"],
        "created_at": thread_doc["created_at"].isoformat()
    }

    return jsonify({
        "status": "ok",
        "message": "Thread berhasil dibuat",
        "thread": response_thread
    }), 201

@app.route('/community/vote', methods=['POST'])
def vote_item():
    """
    Endpoint untuk Upvote / Downvote thread atau komentar.
    Body: user_id, target_id (thread_id atau comment_id), vote_type (1 untuk upvote, -1 untuk downvote)
    """
    data = request.json
    user_id = data.get('user_id')
    target_id = data.get('target_id')
    vote_type = data.get('vote_type') # 1 atau -1
    item_type = data.get('item_type', 'thread') # 'thread' atau 'comment'

    if not user_id or not target_id or vote_type not in [1, -1]:
        return jsonify({"status": "error", "message": "Data vote tidak valid"}), 400

    # Cek apakah user sudah pernah vote ini
    existing_vote = votes_collection.find_one({"user_id": user_id, "target_id": target_id})
    
    collection = threads_collection if item_type == 'thread' else comments_collection
    target_field = "thread_id" if item_type == 'thread' else "comment_id"

    if existing_vote:
        # Jika user menekan tombol vote yang sama, batalkan vote-nya (Toggle)
        if existing_vote["vote_type"] == vote_type:
            votes_collection.delete_one({"_id": existing_vote["_id"]})
            increment_field = "upvotes" if vote_type == 1 else "downvotes"
            collection.update_one({target_field: target_id}, {"$inc": {increment_field: -1}})
            return jsonify({"status": "ok", "message": "Vote dibatalkan"})
        
        # Jika user mengubah vote (dari upvote ke downvote atau sebaliknya)
        else:
            votes_collection.update_one({"_id": existing_vote["_id"]}, {"$set": {"vote_type": vote_type}})
            # Hapus vote lama, tambah vote baru
            if vote_type == 1:
                collection.update_one({target_field: target_id}, {"$inc": {"upvotes": 1, "downvotes": -1}})
            else:
                collection.update_one({target_field: target_id}, {"$inc": {"upvotes": -1, "downvotes": 1}})
            return jsonify({"status": "ok", "message": "Vote diubah"})
    else:
        # User baru pertama kali vote ini
        votes_collection.insert_one({
            "user_id": user_id,
            "target_id": target_id,
            "vote_type": vote_type,
            "item_type": item_type
        })
        increment_field = "upvotes" if vote_type == 1 else "downvotes"
        collection.update_one({target_field: target_id}, {"$inc": {increment_field: 1}})
        return jsonify({"status": "ok", "message": "Vote berhasil ditambahkan"})


# ── Endpoint Komentar (Reply) ──────────────────────────────────

@app.route('/community/comments/<post_id>', methods=['GET'])
def get_comments(post_id):
    try:
        pipeline = [
            {"$match": {"$or": [{"post_id": post_id}, {"thread_id": post_id}]}},
            {"$sort": {"created_at": 1}},
            {
                "$lookup": {
                    "from": "users",
                    "localField": "user_id",
                    "foreignField": "user_id",
                    "as": "author_info"
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "comment_id": 1,
                    "post_id": {"$ifNull": ["$post_id", "$thread_id"]},
                    "parent_comment_id": 1,
                    "user_id": 1,
                    "content": 1,
                    "upvotes": 1,
                    "downvotes": 1,
                    "likes": 1,
                    "dislikes": 1,
                    "created_at": 1,
                    "updated_at": 1,
                    "author": {
                        "$cond": {
                            "if": {"$gt": [{"$size": "$author_info"}, 0]},
                            "then": {
                                "username": {"$arrayElemAt": ["$author_info.username", 0]},
                                "profile_picture": {"$arrayElemAt": ["$author_info.profile_picture", 0]}
                            },
                            "else": {"username": "Anonim", "profile_picture": ""}
                        }
                    }
                }
            }
        ]
        
        comments = list(comments_collection.aggregate(pipeline))
        
        # Konversi datetime -> ISO string agar aman di-parse di frontend
        for c in comments:
            if isinstance(c.get('created_at'), datetime):
                c['created_at'] = c['created_at'].isoformat()
            if isinstance(c.get('updated_at'), datetime):
                c['updated_at'] = c['updated_at'].isoformat()
            
        return jsonify({"status": "ok", "comments": comments}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/community/comments', methods=['POST'])
def create_comment():
    data = request.json
    user_id = data.get('user_id')
    post_id = data.get('post_id') or data.get('thread_id')
    parent_comment_id = data.get('parent_comment_id')
    content = data.get('content')

    if not user_id or not post_id or not content:
        return jsonify({"status": "error", "message": "Data tidak lengkap"}), 400

    new_comment = {
        "comment_id": str(uuid.uuid4()),
        "post_id": post_id,
        "parent_comment_id": parent_comment_id,
        "user_id": user_id,
        "content": content,
        "likes": [],
        "dislikes": [],
        "upvotes": 0,
        "downvotes": 0,
        "created_at": datetime.utcnow()
    }
    
    comments_collection.insert_one(new_comment)
    del new_comment["_id"]

    # Increment comment_count in the post
    threads_collection.update_one(
        {"post_id": post_id},
        {"$inc": {"comment_count": 1}}
    )

    # Push notifikasi ke pemilik post (jika bukan komentar sendiri)
    post = threads_collection.find_one({"post_id": post_id}, {"user_id": 1})
    if post:
        post_owner_id = post.get("user_id")
        if post_owner_id and post_owner_id != user_id:
            commenter = users_collection.find_one({"user_id": user_id}, {"username": 1})
            actor_name = commenter.get("username", "Seseorang") if commenter else "Seseorang"
            notif_type = "reply" if parent_comment_id else "comment"
            notif_data = {
                "user_id": post_owner_id,
                "type": notif_type,
                "actor_id": user_id,
                "actor_name": actor_name,
                "message": f"{actor_name} {'membalas komentar' if parent_comment_id else 'mengomentari postingan'} Anda",
                "created_at": datetime.utcnow().isoformat(),
                "is_read": False
            }
            notifications_collection.insert_one(notif_data)
            _push_notification(post_owner_id, notif_data)

    return jsonify({"status": "ok", "message": "Komentar berhasil ditambahkan!", "comment": new_comment}), 201

@app.route('/community/comments/<comment_id>', methods=['PUT', 'DELETE'])
def manage_comment(comment_id):
    """Edit atau Hapus komentar"""
    if request.method == 'DELETE':
        # Find the comment first to know which post it belongs to
        comment = comments_collection.find_one({"comment_id": comment_id})
        if not comment:
            return jsonify({"status": "error", "message": "Komentar tidak ditemukan"}), 404

        post_id = comment.get("post_id")
        
        # Temukan semua child comments (rekursif)
        ids_to_delete = {comment_id}
        while True:
            # Cari semua comment yang parent_comment_id nya ada di ids_to_delete tapi belum masuk ids_to_delete
            children = list(comments_collection.find({"parent_comment_id": {"$in": list(ids_to_delete)}}))
            new_ids = {c["comment_id"] for c in children}
            if new_ids.issubset(ids_to_delete):
                break
            ids_to_delete.update(new_ids)
            
        # Hapus komentar beserta child-nya
        result = comments_collection.delete_many({"comment_id": {"$in": list(ids_to_delete)}})
        if result.deleted_count:
            # Decrement comment_count in the post
            threads_collection.update_one(
                {"post_id": post_id},
                {"$inc": {"comment_count": -result.deleted_count}}
            )
            return jsonify({"status": "ok", "message": "Komentar berhasil dihapus", "deleted_count": result.deleted_count}), 200
        return jsonify({"status": "error", "message": "Komentar tidak ditemukan"}), 404

    if request.method == 'PUT':
        # Edit komentar
        data = request.json
        update_data = {
            "content": data.get("content"),
            "updated_at": datetime.now().isoformat()
        }
        
        result = comments_collection.update_one(
            {"comment_id": comment_id, "user_id": data.get("user_id")}, # Pastikan pemilik
            {"$set": {k: v for k, v in update_data.items() if v is not None}}
        )
        
        if result.modified_count:
            return jsonify({"status": "ok", "message": "Komentar berhasil diperbarui"}), 200
        return jsonify({"status": "error", "message": "Gagal memperbarui atau Anda bukan pemilik"}), 400

@app.route('/community/comments/react', methods=['POST'])
def react_comment():
    """Like atau Dislike sebuah komentar"""
    data = request.json
    comment_id = data.get('comment_id') or data.get('item_id')
    user_id = data.get('user_id')
    action = data.get('action') # 'like' atau 'dislike'

    comment = comments_collection.find_one({"comment_id": comment_id})
    if not comment:
        return jsonify({"status": "error", "message": "Komentar tidak ditemukan"}), 404

    # Logika Toggle
    if action == 'like':
        if user_id in comment.get('likes', []):
            comments_collection.update_one({"comment_id": comment_id}, {"$pull": {"likes": user_id}})
        else:
            comments_collection.update_one({"comment_id": comment_id}, {"$push": {"likes": user_id}, "$pull": {"dislikes": user_id}})
    elif action == 'dislike':
        if user_id in comment.get('dislikes', []):
            comments_collection.update_one({"comment_id": comment_id}, {"$pull": {"dislikes": user_id}})
        else:
            comments_collection.update_one({"comment_id": comment_id}, {"$push": {"dislikes": user_id}, "$pull": {"likes": user_id}})

    return jsonify({"status": "ok", "message": f"React {action} diproses"}), 200


@app.route('/community/posts', methods=['POST'])
def create_post():
    """Buat post baru (discussion, review, atau poll)"""
    data = request.json
    user_id = data.get('user_id')
    
    user = users_collection.find_one({"user_id": user_id})
    if not user:
        return jsonify({"status": "error", "message": "User tidak ditemukan"}), 404

    post_id = uuid.uuid4().hex
    new_post = {
        "post_id": post_id,
        "user_id": user_id,
        "author_name": user.get("username") or user.get("name"),
        "author_avatar": user.get("profile_picture"),
        "type": data.get("type", "discussion"), # discussion, review, poll
        "content": data.get("content", ""),
        "movie_id": data.get("movie_id"), # Optional jika membahas film tertentu
        "rating": data.get("rating"), # Optional untuk tipe review
        "taggedMovie": data.get("taggedMovie"), # Simpan objek utuh
        "poll_options": data.get("poll_options", []), # List of dict: {"id": "1", "text": "Opsi A", "votes": []}
        "likes": [],
        "dislikes": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    threads_collection.insert_one(new_post)
    del new_post['_id'] # Hapus _id bawaan mongo sebelum dikembalikan ke frontend
    
    # Konversi ke isoformat untuk dikembalikan di API Response agar Frontend aman
    new_post["created_at"] = new_post["created_at"].isoformat()
    new_post["updated_at"] = new_post["updated_at"].isoformat()
    
    return jsonify({"status": "ok", "message": "Post berhasil dibuat", "post": new_post}), 201

@app.route('/community/posts/<post_id>', methods=['PUT', 'DELETE'])
def manage_post(post_id):
    """Edit atau Hapus post"""
    if request.method == 'DELETE':
        # Hapus post
        result = threads_collection.delete_one({"post_id": post_id})
        if result.deleted_count:
            # Cascade delete: hapus semua komentar yang terkait dengan post ini
            comments_collection.delete_many({"post_id": post_id})
            return jsonify({"status": "ok", "message": "Post dan komentar terkait berhasil dihapus"}), 200
        return jsonify({"status": "error", "message": "Post tidak ditemukan"}), 404

    if request.method == 'PUT':
        # Edit post
        data = request.json
        update_data = {
            "content": data.get("content"),
            "updated_at": datetime.now().isoformat()
        }
        
        result = threads_collection.update_one(
            {"post_id": post_id, "user_id": data.get("user_id")}, # Pastikan yang edit adalah pemiliknya
            {"$set": {k: v for k, v in update_data.items() if v is not None}}
        )
        
        if result.modified_count:
            return jsonify({"status": "ok", "message": "Post berhasil diperbarui"}), 200
        return jsonify({"status": "error", "message": "Gagal memperbarui atau Anda bukan pemilik post"}), 400

@app.route('/community/react', methods=['POST'])
def react_post():
    """Like atau Dislike sebuah post"""
    data = request.json
    post_id = data.get('post_id')
    user_id = data.get('user_id')
    action = data.get('action') # 'like' atau 'dislike'

    post = threads_collection.find_one({"post_id": post_id})
    if not post:
        return jsonify({"status": "error", "message": "Post tidak ditemukan"}), 404

    # Logika Toggle
    is_adding = False
    if action == 'like':
        if user_id in post.get('likes', []):
            threads_collection.update_one({"post_id": post_id}, {"$pull": {"likes": user_id}})
        else:
            threads_collection.update_one({"post_id": post_id}, {"$push": {"likes": user_id}, "$pull": {"dislikes": user_id}})
            is_adding = True
    elif action == 'dislike':
        if user_id in post.get('dislikes', []):
            threads_collection.update_one({"post_id": post_id}, {"$pull": {"dislikes": user_id}})
        else:
            threads_collection.update_one({"post_id": post_id}, {"$push": {"dislikes": user_id}, "$pull": {"likes": user_id}})

    # Push notifikasi ke pemilik post jika like baru (bukan unlike, bukan self-like)
    post_owner_id = post.get('user_id')
    if is_adding and action == 'like' and post_owner_id and post_owner_id != user_id:
        reactor = users_collection.find_one({"user_id": user_id}, {"username": 1})
        actor_name = reactor.get("username", "Seseorang") if reactor else "Seseorang"
        notif_data = {
            "user_id": post_owner_id,
            "type": "like",
            "actor_id": user_id,
            "actor_name": actor_name,
            "message": f"{actor_name} menyukai postingan Anda",
            "created_at": datetime.utcnow().isoformat(),
            "is_read": False
        }
        notifications_collection.insert_one(notif_data)
        _push_notification(post_owner_id, notif_data)

    return jsonify({"status": "ok", "message": f"React {action} diproses"}), 200

@app.route('/community/poll/vote', methods=['POST'])
def vote_poll():
    """Vote pada opsi polling"""
    data = request.json
    post_id = data.get('post_id')
    user_id = data.get('user_id')
    option_id = data.get('option_id')

    # Cari post untuk memastikan user belum vote di opsi lain
    post = threads_collection.find_one({"post_id": post_id})
    if not post or post.get("type") != "poll":
        return jsonify({"status": "error", "message": "Polling tidak ditemukan"}), 404

    # Hapus user dari semua opsi terlebih dahulu (mencegah double vote)
    threads_collection.update_one(
        {"post_id": post_id},
        {"$pull": {"poll_options.$[].votes": user_id}}
    )

    # Tambahkan user ke opsi yang dipilih
    threads_collection.update_one(
        {"post_id": post_id, "poll_options.id": option_id},
        {"$push": {"poll_options.$.votes": user_id}}
    )

    return jsonify({"status": "ok", "message": "Vote berhasil direkam"}), 200


# ── Endpoint Notifikasi ─────────────────────────────────────────

@app.route('/notifications/<int:user_id>', methods=['GET'])
def get_notifications(user_id):
    try:
        query = {
            "$or": [
                {"user_id": user_id},
                {"user_id": str(user_id)}
            ]
        }
        
        notifications = list(notifications_collection.find(query).sort("created_at", -1).limit(50))
        
        for notif in notifications:
            notif['_id'] = str(notif['_id'])
            # Pastikan 'created_at' dikonversi ke ISO string jika tipenya datetime objek objek MongoDB
            if hasattr(notif.get('created_at'), 'isoformat'):
                notif['created_at'] = notif['created_at'].isoformat()
                
        return jsonify({"status": "ok", "notifications": notifications}), 200
    except Exception as e:
        logger.error(f"Error fetching notifications: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/notifications/mark-read/<int:user_id>', methods=['POST'])
def mark_notifications_read(user_id):
    try:
        query = {
            "$and": [
                {"$or": [{"user_id": user_id}, {"user_id": str(user_id)}]},
                {"is_read": False}
            ]
        }
        notifications_collection.update_many(query, {"$set": {"is_read": True}})
        return jsonify({"status": "ok", "message": "Semua notifikasi ditandai dibaca"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/notifications/unread-count/<int:user_id>', methods=['GET'])
def get_unread_notifications_count(user_id):
    try:
        query = {
            "$and": [
                {"$or": [{"user_id": user_id}, {"user_id": str(user_id)}]},
                {"is_read": False}
            ]
        }
        count = notifications_collection.count_documents(query)
        return jsonify({"status": "ok", "unread_count": count}), 200
    except Exception as e:
        logger.error(f"Error get_unread_notifications_count: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

# ── Endpoint User Profile & Friend System ───────────────────────

@app.route('/user/<int:user_id>/profile', methods=['GET'])
def get_user_profile(user_id):
    try:
        user = users_collection.find_one({"user_id": user_id}, {"password_hash": 0, "_id": 0})
        if not user:
            return jsonify({"status": "error", "message": "User tidak ditemukan"}), 404
            
        # Hitung statistik
        total_ratings = ratings_collection.count_documents({"user_id": user_id})
        total_reviews = reviews_collection.count_documents({"user_id": user_id})
        total_posts = community_posts_collection.count_documents({"author.user_id": user_id})
        
        user['stats'] = {
            "total_ratings": total_ratings,
            "total_reviews": total_reviews,
            "total_posts": total_posts,
            "total_watchlist": len(user.get("watchlist", [])),
            "total_watched": len(user.get("watched_list", [])),
            "total_following": len(user.get("following", []))
        }
        
        return jsonify({"status": "ok", "profile": user}), 200
    except Exception as e:
        logger.error(f"Error fetching profile: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/friends/follow', methods=['POST'])
def follow_user():
    data = request.json
    follower_id = data.get('follower_id')
    target_id = data.get('target_id')
    
    if not follower_id or not target_id:
        return jsonify({"status": "error", "message": "Missing IDs"}), 400
        
    try:
        # Cek apakah sudah follow
        user = users_collection.find_one({"user_id": follower_id})
        following = user.get("following", [])
        
        if target_id in following:
            # Unfollow
            users_collection.update_one(
                {"user_id": follower_id},
                {"$pull": {"following": target_id}}
            )
            action = "unfollowed"
        else:
            # Follow
            users_collection.update_one(
                {"user_id": follower_id},
                {"$push": {"following": target_id}}
            )
            action = "followed"
            
            # Buat notifikasi
            actor_name = user.get("username", "Seseorang")
            notif_data = {
                "user_id": target_id,
                "type": "follow",
                "actor_id": follower_id,
                "actor_name": actor_name,
                "message": f"{actor_name} mulai mengikuti Anda",
                "created_at": datetime.utcnow().isoformat(),
                "is_read": False
            }
            notifications_collection.insert_one(notif_data)
            # Push realtime
            _push_notification(target_id, notif_data)
                
        return jsonify({"status": "ok", "action": action}), 200
    except Exception as e:
        logger.error(f"Error toggle follow: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


# ── Chat System (Real-time Messaging) ───────────────────────────

def _push_notification(user_id, notif_data):
    """Helper: emit notifikasi realtime ke room pribadi user."""
    try:
        payload = {k: v for k, v in notif_data.items() if k != '_id'}
        socketio.emit('new_notification', payload, to=f'notif_{user_id}')
    except Exception as e:
        logger.warning(f"Gagal push notification ke user {user_id}: {e}")

def get_conversation_id(user1, user2):
    return "-".join(sorted([str(user1), str(user2)]))


@app.route('/chat/conversations/init', methods=['POST'])
def initialize_conversation():
    try:
        data = request.json
        sender_id = data.get('sender_id')
        receiver_id = data.get('receiver_id')
        
        if not sender_id or not receiver_id:
            return jsonify({"status": "error", "message": "ID tidak lengkap"}), 400
            
        # Buat room ID yang terurut alfabetis sesuai arsitektur kamu
        room_id = "-".join(sorted([str(sender_id), str(receiver_id)]))
        
        # Cari atau buat percakapan baru (Upsert)
        conversations_collection.update_one(
            {"conversation_id": room_id},
            {
                "$set": {
                    "conversation_id": room_id,
                    "participants": [int(sender_id), int(receiver_id)],
                    "updated_at": datetime.utcnow().isoformat()
                },
                "$setOnInsert": {
                    "last_message": "Memulai percakapan baru...",
                    "last_sender_id": int(sender_id)
                }
            },
            upsert=True
        )
        return jsonify({"status": "ok", "conversation_id": room_id}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/chat/conversations/<int:user_id>', methods=['GET'])
def get_conversations(user_id):
    try:
        conversations = list(conversations_collection.find({"participants": user_id}).sort("updated_at", -1))
        
        # Enrich conversation with other user's data
        for conv in conversations:
            conv['_id'] = str(conv['_id'])
            other_user_id = next((uid for uid in conv['participants'] if uid != user_id), None)
            if other_user_id:
                other_user = users_collection.find_one({"user_id": other_user_id}, {"_id": 0, "username": 1, "profile_picture": 1})
                if other_user:
                    conv['other_user'] = other_user
        
        return jsonify({"status": "ok", "conversations": conversations}), 200
    except Exception as e:
        logger.error(f"Error fetching conversations: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/chat/messages/<conversation_id>', methods=['GET'])
def get_messages(conversation_id):
    try:
        messages = list(messages_collection.find({"conversation_id": conversation_id}).sort("timestamp", 1))
        for msg in messages:
            msg['_id'] = str(msg['_id'])
        return jsonify({"status": "ok", "messages": messages}), 200
    except Exception as e:
        logger.error(f"Error fetching messages: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@socketio.on('join_chat')
def on_join_chat(data):
    user_id = data.get('user_id')
    other_user_id = data.get('other_user_id')
    if not user_id or not other_user_id:
        return
    room = get_conversation_id(user_id, other_user_id)
    join_room(room)
    print(f"User {user_id} joined room: {room}")

@socketio.on('join_notifications')
def on_join_notifications(data):
    """User bergabung ke room notifikasi pribadi mereka"""
    user_id = data.get('user_id')
    if user_id:
        room = f'notif_{user_id}'
        join_room(room)
        print(f"User {user_id} joined notification room: {room}")

@socketio.on('leave_chat')
def on_leave_chat(data):
    user_id = data.get('user_id')
    other_user_id = data.get('other_user_id')
    if not user_id or not other_user_id:
        return
    room = get_conversation_id(user_id, other_user_id)
    leave_room(room)
    print(f"User {user_id} left room: {room}")

@socketio.on('send_message')
def on_send_message(data):
    sender_id = data.get('sender_id')
    receiver_id = data.get('receiver_id')
    text = data.get('text')
    
    if not sender_id or not receiver_id or not text:
        return

    room = get_conversation_id(sender_id, receiver_id)
    timestamp = datetime.utcnow().isoformat()
    
    msg_doc = {
        "conversation_id": room,
        "sender_id": sender_id,
        "receiver_id": receiver_id,
        "text": text,
        "timestamp": timestamp,
        "is_read": False
    }
    
    # Save message
    result = messages_collection.insert_one(msg_doc)
    msg_doc['_id'] = str(result.inserted_id)
    
    # Upsert conversation
    conversations_collection.update_one(
        {"conversation_id": room},
        {
            "$set": {
                "participants": [sender_id, receiver_id],
                "last_message": text,
                "last_sender_id": sender_id,
                "updated_at": timestamp
            }
        },
        upsert=True
    )
    
    # Broadcast to room
    emit('receive_message', msg_doc, to=room)

# ── Error Handlers ──────────────────────────────────────────────
@app.errorhandler(404)
def not_found(e):
    return jsonify({"status": "error", "message": "Endpoint tidak ditemukan."}), 404

@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"status": "error", "message": "Method tidak diizinkan."}), 405

@app.errorhandler(500)
def internal_error(e):
    return jsonify({"status": "error", "message": "Internal server error."}), 500


# ================================================================
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    is_production = os.environ.get("FLASK_ENV") == "production"

    print("\n🚀 Starting MovieHub API...")
    print(f"   Mode    : {'production' if is_production else 'development'}")
    print(f"   Port    : {port}")
    print(f"   Host    : 0.0.0.0")

    socketio.run(
        app,
        debug=not is_production,
        host="0.0.0.0",
        port=port,
        allow_unsafe_werkzeug=True
    )
