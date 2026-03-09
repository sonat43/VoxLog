import firebase_admin
from firebase_admin import credentials, firestore

try:
    cred = credentials.Certificate('firebase-service-account.json')
    firebase_admin.initialize_app(cred)
except ValueError:
    pass # App already initialized

db = firestore.client()
print("Fetching some attendance records...")
records = db.collection('attendance_records').limit(3).stream()
for doc in records:
    print(f"ID: {doc.id}")
    print(doc.to_dict())
