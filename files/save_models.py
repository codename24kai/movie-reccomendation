"""
=====================================================
  save_models.py
  Jalankan script ini di Google Colab SETELAH
  notebook Nurdin selesai training model.

  Copy-paste ke cell baru di notebook, lalu run.
=====================================================
"""

import pickle
import os

os.makedirs('./models', exist_ok=True)

# ── Simpan SVD model ────────────────────────────────────────────
with open('./models/svd_model.pkl', 'wb') as f:
    pickle.dump(svd_model, f)
print("✅ svd_model.pkl saved")

# ── Simpan Random Forest model ──────────────────────────────────
with open('./models/rf_model.pkl', 'wb') as f:
    pickle.dump(rf_model, f)
print("✅ rf_model.pkl saved")

# ── Verifikasi ──────────────────────────────────────────────────
for fname in os.listdir('./models'):
    size = os.path.getsize(f'./models/{fname}') / (1024*1024)
    print(f"   {fname:25s}  {size:.2f} MB")

print("\n✅ Semua model berhasil disimpan ke folder ./models/")
print("   Pindahkan folder ./models/ ke direktori yang sama dengan app.py")
