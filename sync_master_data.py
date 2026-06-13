import pandas as pd
import requests
import time
from pymongo import MongoClient
import certifi
from concurrent.futures import ThreadPoolExecutor, as_completed

# 1. Konfigurasi
MONGO_URI = "mongodb+srv://kai-nabhan12:V5UC2KtF3DGBLQsi@movies-database.l7ywj4w.mongodb.net/?retryWrites=true&w=majority&appName=movies-database"
TMDB_API_KEY = "b4bd07d1cf925c24b0e4e0e7773ed944"

# Koneksi ke MongoDB (PyMongo secara otomatis sudah thread-safe)
client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
db = client['movie_forum_db']
movies_collection = db['movies']

# 2. Fungsi Pekerja (Worker) untuk 1 Film
def process_single_movie(row):
    movie_id = int(row['movieId'])
    tmdb_id = row['tmdbId']
    
    # Lewati jika tmdb_id kosong (NaN)
    if pd.isna(tmdb_id):
        return None
        
    tmdb_id = int(tmdb_id)
    
    # Cek apakah film ini sudah ada dan punya poster di MongoDB
    if movies_collection.find_one({"movie_id": movie_id, "poster_url": {"$ne": None}}):
        return None # Sudah lengkap, abaikan

    try:
        url = f"https://api.themoviedb.org/3/movie/{tmdb_id}?api_key={TMDB_API_KEY}&language=en-US"
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            tmdb_data = response.json()
            
            movie_document = {
                "movie_id": movie_id,
                "imdb_id": row.get('imdbId', None),
                "tmdb_id": tmdb_id,
                "title": row.get('title', tmdb_data.get('title')),
                "genres": row.get('genres', ""),
                "poster_url": f"https://image.tmdb.org/t/p/w500{tmdb_data['poster_path']}" if tmdb_data.get('poster_path') else None,
                "overview": tmdb_data.get('overview', ''),
                "release_year": tmdb_data.get('release_date', '')[:4] if tmdb_data.get('release_date') else "",
                "vote_average": tmdb_data.get('vote_average', 0.0),
                "popularity": tmdb_data.get('popularity', 0.0)
            }
            
            # Simpan ke MongoDB
            movies_collection.update_one(
                {"movie_id": movie_id},
                {"$set": movie_document},
                upsert=True
            )
            return f"✅ Sukses: {movie_document['title']}"
            
        elif response.status_code == 429:
            # Jika terkena rate limit, paksa thread ini tidur agak lama
            time.sleep(2)
            return f"⏳ Terkena limit pada ID {tmdb_id}, mencoba lagi nanti..."
        else:
            return f"⚠️ Gagal ID {tmdb_id} | Code: {response.status_code}"
            
    except Exception as e:
        return f"❌ Error pada movie_id {movie_id}: {e}"

# 3. Eksekusi Utama dengan Multithreading
if __name__ == "__main__":
    print("Membaca df_master...")
    df_master = pd.read_csv('cleaned_data/df_master.csv')
    
    # Ubah DataFrame menjadi list of dictionaries agar lebih mudah diproses oleh thread
    movies_to_process = df_master.to_dict('records')
    
    print(f"Memulai sinkronisasi untuk {len(movies_to_process)} baris data...")
    print("Menggunakan 15 jalur paralel (Multithreading)...")
    
    # Gunakan ThreadPoolExecutor
    # Max_workers=15 artinya Python akan memproses 15 film secara bersamaan
    # TMDB mengizinkan sekitar 40 request per detik, jadi 15 sangat aman dan cepat
    with ThreadPoolExecutor(max_workers=15) as executor:
        # Submit semua tugas ke executor
        futures = {executor.submit(process_single_movie, row): row for row in movies_to_process}
        
        # Proses hasil setiap kali ada thread yang selesai
        for future in as_completed(futures):
            result = future.result()
            if result: # Hanya print jika ada pesan (bukan film yang di-skip)
                print(result)

    print("\n🎉 Sinkronisasi Super Cepat Selesai!")