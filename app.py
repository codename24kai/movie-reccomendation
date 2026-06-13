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
from datetime import datetime
from pymongo import MongoClient

# ── Setup ──────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)
app.config['SECRET_KEY'] = 'rahasia_film_forum_123' 

MONGO_URI = "mongodb+srv://kai-nabhan12:V5UC2KtF3DGBLQsi@movies-database.l7ywj4w.mongodb.net/?appName=movies-database"

try:
    print("⏳ Menghubungkan ke MongoDB Atlas...")
    client = MongoClient(MONGO_URI)
    db = client['movie_forum_db'] # Nama database akan otomatis dibuat
    
    # Deklarasi collections
    users_collection = db['users']
    movies_collection = db['movies']
    ratings_collection = db['ratings']
    reviews_collection = db['reviews']
    
    # Tes koneksi (ping)
    client.admin.command('ping')
    print("✅ Berhasil terhubung ke MongoDB Atlas!")
except Exception as e:
    print(f"❌ Gagal terhubung ke MongoDB: {e}")
    

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
        "wishlist": [],
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

# ── Endpoint Wishlist ──────────────────────────────────────────

@app.route('/wishlist', methods=['POST'])
def toggle_wishlist():
    data = request.json
    user_id = data.get('user_id')
    movie_id = data.get('movie_id')

    user = users_collection.find_one({"user_id": user_id})
    if not user:
        return jsonify({"status": "error", "message": "User tidak ditemukan"}), 404

    wishlist = user.get('wishlist', [])
    
    # Logika Toggle: Jika film sudah ada, hapus. Jika belum, tambahkan.
    if movie_id in wishlist:
        users_collection.update_one({"user_id": user_id}, {"$pull": {"wishlist": movie_id}})
        message = "Film dihapus dari wishlist"
        is_added = False
    else:
        users_collection.update_one({"user_id": user_id}, {"$push": {"wishlist": movie_id}})
        message = "Film ditambahkan ke wishlist"
        is_added = True

    return jsonify({"status": "ok", "message": message, "is_added": is_added}), 200


@app.route('/wishlist/<int:user_id>', methods=['GET'])
def get_wishlist(user_id):
    user = users_collection.find_one({"user_id": user_id})
    if not user:
        return jsonify({"status": "error", "message": "User tidak ditemukan"}), 404
    
    movie_ids = user.get('wishlist', [])
    
    # Ambil detail film dari koleksi movies berdasarkan array ID di wishlist
    wishlist_movies = list(movies_collection.find({"movie_id": {"$in": movie_ids}}, {"_id": 0}))
    
    return jsonify({"status": "ok", "wishlist": wishlist_movies}), 200

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Konstanta path ──────────────────────────────────────────────
DATA_DIR   = os.getenv("DATA_DIR", "./cleaned_data")
MODELS_DIR = os.getenv("MODELS_DIR", "./models")

# ── Load model & data saat startup ─────────────────────────────
print("⏳ Loading models dan dataset...")

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
    movies_df    = pd.read_csv(f"{DATA_DIR}/movies_clean.csv")
    ratings_df   = pd.read_csv(f"{DATA_DIR}/ratings_val_70.csv")
    rf_data_df   = pd.read_csv(f"{DATA_DIR}/df_master.csv")

    # Fitur RF — harus sama persis dengan yang dipakai Nurdin saat training
    RF_FEATURES = [
        'year',
        'Action', 'Adventure', 'Animation', 'Children',
        'Comedy', 'Crime', 'Documentary', 'Drama',
        'Fantasy', 'Film-Noir', 'Horror', 'IMAX',
        'Musical', 'Mystery', 'Romance', 'Sci-Fi',
        'Thriller', 'War', 'Western'
    ]

    # Pra-hitung rf_score untuk semua film (biar endpoint rekomendasi cepat)
    rf_data_df['rf_score'] = rf_model.predict(rf_data_df[RF_FEATURES].fillna(0))
    print("✅ Datasets loaded")
    MODEL_READY = True

except Exception as e:
    logger.warning(f"⚠️  Model/data belum tersedia: {e}")
    logger.warning("   API tetap jalan — endpoint akan return error informatif.")
    MODEL_READY = False
    movies_df = pd.DataFrame()
    ratings_df = pd.DataFrame()
    rf_data_df = pd.DataFrame()


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





def get_hybrid_recommendations(user_id: int, top_n: int = 10,
                                 svd_weight: float = 0.5,
                                 rf_weight: float = 0.5) -> list:
    """
    Buat rekomendasi hybrid untuk user_id.
    1. Cari film yang belum ditonton user
    2. Hitung SVD score
    3. Gabungkan dengan RF score
    4. Sort by hybrid score, return top_n
    5. Enrich dengan title/genres (CSV) + poster_url/trailer_url (MongoDB)
    """
    # Film yang sudah ditonton user
    if user_id in ratings_df['userId'].values:
        watched = set(ratings_df[ratings_df['userId'] == user_id]['movieId'])
    else:
        watched = set()

    # Kandidat film (belum ditonton, max 1000 film untuk efisiensi)
    all_movies = set(ratings_df['movieId'].unique())
    candidates = list(all_movies - watched)[:1000]

    if not candidates:
        candidates = list(all_movies)[:1000]

    # Hitung SVD score untuk kandidat
    svd_scores = get_svd_scores(user_id, candidates)

    # Ambil RF score dari data yang sudah di-precompute
    rf_lookup = rf_data_df.set_index('movieId')['rf_score'].to_dict()

    # Hitung hybrid score
    results = []
    for movie_id, svd_score in svd_scores.items():
        rf_score = rf_lookup.get(movie_id, 0.0)
        hybrid_score = (svd_weight * svd_score) + (rf_weight * rf_score)

        results.append({
            "movieId":      int(movie_id),
            "svd_score":    round(float(svd_score), 4),
            "rf_score":     round(float(rf_score), 4),
            "hybrid_score": round(float(hybrid_score), 4),
        })

    # Sort by hybrid score, ambil top_n
    results = sorted(results, key=lambda x: x['hybrid_score'], reverse=True)[:top_n]

    # ── Gabungkan dengan info film dari CSV (title, genres) ────────────
    movie_info = movies_df.set_index('movieId')[['title', 'genres']].to_dict('index')
    for r in results:
        info = movie_info.get(r['movieId'], {})
        r['title']  = info.get('title', 'Unknown')
        r['genres'] = info.get('genres', '')

    # ── BARU: enrich dengan poster_url & trailer_url dari MongoDB ──────
    # PENTING: pastikan movie_id dikonversi ke int Python murni.
    # r['movieId'] sudah di-cast int() saat dibuat di awal fungsi ini,
    # tapi kita pastikan lagi di sini untuk keamanan ekstra —
    # numpy.int64 TIDAK match dengan int biasa saat query MongoDB $in.
    movie_ids = [int(r['movieId']) for r in results]

    try:
        mongo_movies = movies_collection.find(
            {"movie_id": {"$in": movie_ids}},
            {"_id": 0, "movie_id": 1, "poster_url": 1, "trailer_url": 1}
        )
        # Buat lookup dict: {movie_id: {poster_url, trailer_url}}
        mongo_map = {m["movie_id"]: m for m in mongo_movies}
        logger.info(f"DEBUG enrich: dicari {len(movie_ids)} movieId, ditemukan {len(mongo_map)} di MongoDB")
        logger.info(f"DEBUG movie_ids dicari: {movie_ids[:5]}")
        logger.info(f"DEBUG movie_id ditemukan: {list(mongo_map.keys())[:5]}")
    except Exception as e:
        logger.warning(f"⚠️  Gagal enrich poster dari MongoDB: {e}")
        mongo_map = {}

    for r in results:
        mongo_info = mongo_map.get(r['movieId'], {})
        r['poster_url']  = mongo_info.get('poster_url')
        r['trailer_url'] = mongo_info.get('trailer_url')

    return results


# ================================================================
# ROUTES
# ================================================================

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
    """
    POST /recommend
    Body JSON:
    {
        "user_id":    25062,      ← wajib
        "top_n":      10,         ← opsional (default: 10, max: 50)
        "svd_weight": 0.5,        ← opsional (default: 0.5)
        "rf_weight":  0.5         ← opsional (default: 0.5)
    }

    Response:
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
            },
            ...
        ]
    }
    """
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
    top_n      = min(int(body.get("top_n", 10)), 50)   # max 50
    svd_weight = float(body.get("svd_weight", 0.5))
    rf_weight  = float(body.get("rf_weight", 0.5))

    # Validasi weight
    if abs((svd_weight + rf_weight) - 1.0) > 0.01:
        return jsonify({
            "status":  "error",
            "message": "svd_weight + rf_weight harus = 1.0"
        }), 400

    logger.info(f"📽  Generating recommendations for user_id={user_id}, top_n={top_n}")

    try:
        recs = get_hybrid_recommendations(user_id, top_n, svd_weight, rf_weight)
        return jsonify({
            "status":          "ok",
            "user_id":         user_id,
            "top_n":           top_n,
            "svd_weight":      svd_weight,
            "rf_weight":       rf_weight,
            "recommendations": recs
        })
    except Exception as e:
        logger.error(f"Error saat generate rekomendasi: {e}")
        return jsonify({
            "status":  "error",
            "message": str(e)
        }), 500


# ── Endpoint: Daftar Film ───────────────────────────────────────
@app.route("/movies", methods=["GET"])
def get_movies():
    """
    GET /movies?page=1&limit=20
    Daftar semua film dengan pagination.
    """
    if movies_df.empty:
        return jsonify({"status": "error", "message": "Dataset belum dimuat."}), 503

    page  = int(request.args.get("page", 1))
    limit = min(int(request.args.get("limit", 20)), 100)  # max 100/request
    start = (page - 1) * limit
    end   = start + limit

    subset = movies_df.iloc[start:end][['movieId', 'title', 'genres']]

    return jsonify({
        "status":      "ok",
        "page":        page,
        "limit":       limit,
        "total_films": len(movies_df),
        "movies":      subset.to_dict(orient="records")
    })


# ── Endpoint: Cari Film ─────────────────────────────────────────
@app.route("/movies/search", methods=["GET"])
def search_movies():
    """
    GET /movies/search?q=avengers&limit=10
    Cari film berdasarkan judul (case-insensitive).
    """
    if movies_df.empty:
        return jsonify({"status": "error", "message": "Dataset belum dimuat."}), 503

    query = request.args.get("q", "").strip()
    limit = min(int(request.args.get("limit", 10)), 50)

    if not query:
        return jsonify({"status": "error", "message": "Parameter 'q' wajib diisi."}), 400

    mask   = movies_df['title'].str.contains(query, case=False, na=False)
    result = movies_df[mask][['movieId', 'title', 'genres']].head(limit)

    return jsonify({
        "status":  "ok",
        "query":   query,
        "results": result.to_dict(orient="records")
    })


# ── Endpoint: History Rating User ──────────────────────────────
@app.route("/user/<int:user_id>/history", methods=["GET"])
def user_history(user_id: int):
    """
    GET /user/25062/history?limit=20
    Ambil history rating yang sudah diberikan user.
    """
    if ratings_df.empty:
        return jsonify({"status": "error", "message": "Dataset belum dimuat."}), 503

    limit  = min(int(request.args.get("limit", 20)), 100)
    user_r = ratings_df[ratings_df['userId'] == user_id].copy()

    if user_r.empty:
        return jsonify({
            "status":    "ok",
            "user_id":   user_id,
            "message":   "User tidak ditemukan atau belum memberikan rating.",
            "total":     0,
            "ratings":   []
        })

    # Gabungkan dengan nama film
    merged = user_r.merge(
        movies_df[['movieId', 'title', 'genres']],
        on='movieId', how='left'
    ).sort_values('timestamp', ascending=False).head(limit)

    return jsonify({
        "status":  "ok",
        "user_id": user_id,
        "total":   len(user_r),
        "ratings": merged[['movieId', 'title', 'genres', 'rating']].to_dict(orient="records")
    })


# ── Endpoint: Submit Rating Baru ────────────────────────────────
# ── Endpoint Rating ────────────────────────────────────────────

@app.route('/rate', methods=['POST'])
def submit_rating():
    data = request.json
    user_id = data.get('user_id')
    movie_id = data.get('movie_id')
    rating = data.get('rating')

    if not user_id or not movie_id or not rating:
        return jsonify({"status": "error", "message": "Data tidak lengkap"}), 400

    # Gunakan upsert=True agar jika user merating ulang film yang sama, 
    # nilainya diperbarui (Update), bukan membuat data ganda (Insert).
    ratings_collection.update_one(
        {"user_id": user_id, "movie_id": movie_id},
        {"$set": {
            "user_id": user_id, 
            "movie_id": movie_id, 
            "rating": float(rating),
            "created_at": datetime.utcnow()
        }},
        upsert=True
    )
    
    return jsonify({"status": "ok", "message": "Rating berhasil disimpan"}), 201

# ── Endpoint Trending ──────────────────────────────────────────

@app.route('/movies/trending', methods=['GET'])
def get_trending_movies():
    try:
        # Mengambil 20 film yang sudah memiliki poster untuk halaman Trending
        # Nanti bisa diubah logikanya untuk mengurutkan berdasarkan rating atau jumlah ulasan
        trending_movies = list(movies_collection.find(
            {"poster_url": {"$ne": None}}, 
            {"_id": 0}
        ).limit(20))
        
        return jsonify({"status": "ok", "movies": trending_movies}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/movies/preview', methods=['GET'])
def get_movie_preview():
    try:
        # Mengambil 12 film acak/teratas yang memiliki poster
        preview_movies = list(movies_collection.find(
            {"poster_url": {"$ne": None}}, 
            {"_id": 0} # Sembunyikan ObjectId bawaan Mongo
        ).limit(12))
        
        return jsonify({"status": "ok", "movies": preview_movies}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


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
    print("\n🚀 Starting Movie Recommendation API...")
    print("📖 Endpoints:")
    print("   GET  /                        → Health check")
    print("   POST /recommend               → Rekomendasi hybrid")
    print("   GET  /movies                  → Daftar film")
    print("   GET  /movies/search?q=<title> → Cari film")
    print("   GET  /user/<id>/history       → History user")
    print("   POST /rate                    → Submit rating")
    app.run(debug=False, host="0.0.0.0", port=5000) 
