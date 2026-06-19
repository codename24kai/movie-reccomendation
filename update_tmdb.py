import requests
import re
import time
from pymongo import MongoClient

# 1. Masukkan MongoDB URI kamu (sama persis dengan yang di app.py)
MONGO_URI = "mongodb+srv://kai-nabhan12:V5UC2KtF3DGBLQsi@movies-database.l7ywj4w.mongodb.net/?retryWrites=true&w=majority&appName=movies-database"

# 2. Masukkan TMDB API Key kamu di sini
TMDB_API_KEY = "V5UC2KtF3DGBLQsi"

# Hubungkan ke database
client = MongoClient(MONGO_URI)
db = client['movie_forum_db']
movies_collection = db['movies']

def clean_title(title):
    # Memisahkan judul dan tahun. Contoh: "Toy Story (1995)" -> Judul: "Toy Story", Tahun: "1995"
    match = re.match(r"(.+?)(?:\s\((\d{4})\))?$", title.strip())
    if match:
        return match.group(1).strip(), match.group(2)
    return title.strip(), None

def fetch_tmdb_data():
    movies = list(movies_collection.find({"poster_url": {"$exists": False}})) # Hanya cari yang belum punya URL
    total = len(movies)
    
    print(f"🎬 Menemukan {total} film yang perlu diupdate...")

    for index, movie in enumerate(movies):
        original_title = movie.get('title', '')
        search_title, year = clean_title(original_title)
        
        # Endpoint 1: Cari Film
        search_url = f"https://api.themoviedb.org/3/search/movie?api_key={TMDB_API_KEY}&query={search_title}"
        if year:
            search_url += f"&primary_release_year={year}"
            
        try:
            response = requests.get(search_url).json()
            results = response.get('results', [])
            
            if results:
                tmdb_movie = results[0] # Ambil hasil pencarian teratas
                tmdb_id = tmdb_movie.get('id')
                poster_path = tmdb_movie.get('poster_path')
                
                poster_url = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else None
                trailer_url = None
                
                # Endpoint 2: Cari Trailer di YouTube
                video_url = f"https://api.themoviedb.org/3/movie/{tmdb_id}/videos?api_key={TMDB_API_KEY}"
                video_response = requests.get(video_url).json()
                videos = video_response.get('results', [])
                
                # Filter hanya video tipe 'Trailer' dari YouTube
                for vid in videos:
                    if vid.get('site') == 'YouTube' and vid.get('type') == 'Trailer':
                        trailer_url = f"https://www.youtube.com/embed/{vid.get('key')}"
                        break
                
                # Update dokumen di MongoDB
                movies_collection.update_one(
                    {"_id": movie["_id"]},
                    {"$set": {
                        "poster_url": poster_url,
                        "trailer_url": trailer_url
                    }}
                )
                print(f"[{index+1}/{total}] ✅ Sukses: {search_title} (Poster: {'Ada' if poster_url else 'Tdk'}, Trailer: {'Ada' if trailer_url else 'Tdk'})")
                
            else:
                print(f"[{index+1}/{total}] ❌ Gagal menemukan TMDB: {search_title}")
                # Tetap beri flag agar tidak di-loop ulang nantinya
                movies_collection.update_one({"_id": movie["_id"]}, {"$set": {"poster_url": None, "trailer_url": None}})
                
        except Exception as e:
            print(f"[{index+1}/{total}] ⚠️ Error API pada {search_title}: {e}")
            
        # Jeda 0.2 detik agar tidak diblokir oleh TMDB karena terlalu banyak request (Rate Limiting)
        time.sleep(0.2)
        
    print("\n🎉 Proses sinkronisasi data TMDB selesai!")

if __name__ == "__main__":
    fetch_tmdb_data()