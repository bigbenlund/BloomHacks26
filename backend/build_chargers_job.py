import os
import sys
from pathlib import Path

# Ensure we can import build_chargers
sys.path.append(str(Path(__file__).resolve().parent))

import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
from cloud_parser import build_chargers, OUTPUT_FILE


def main():
    service_account_path = Path(__file__).resolve().parent.parent / "service-account.json"

    if service_account_path.exists():
        print("Setting GOOGLE_APPLICATION_CREDENTIALS environment variable...")
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(service_account_path.resolve())
        print(f"Initializing Firebase Admin with: {service_account_path}")
        cred = credentials.Certificate(str(service_account_path))
        firebase_admin.initialize_app(cred)
    else:
        print("Initializing Firebase Admin using Application Default Credentials (ADC)...")
        firebase_admin.initialize_app()

    db = firestore.client()

    print("Building chargers using the Two-Agent Gemini pipeline...")
    chargers = build_chargers()

    print(f"Successfully generated {len(chargers)} charger records.")

    # 1. Clear old documents in the 'chargers' collection to avoid stale records
    print("Clearing existing documents in 'chargers' collection...")
    collection_ref = db.collection("chargers")
    docs = collection_ref.stream()

    delete_batch = db.batch()
    delete_count = 0
    for doc in docs:
        delete_batch.delete(doc.reference)
        delete_count += 1
        if delete_count % 400 == 0:
            delete_batch.commit()
            delete_batch = db.batch()

    if delete_count % 400 != 0:
        delete_batch.commit()
    print(f"Deleted {delete_count} existing documents.")

    # 2. Write new documents to the 'chargers' collection in batches of 400
    print("Writing new charger documents to Firestore...")
    write_batch = db.batch()
    write_count = 0
    for charger in chargers:
        doc_id = str(charger["id"])
        doc_ref = collection_ref.document(doc_id)
        write_batch.set(doc_ref, charger)
        write_count += 1

        if write_count % 400 == 0:
            write_batch.commit()
            print(f"Committed batch of {write_count} documents.")
            write_batch = db.batch()

    if write_count % 400 != 0:
        write_batch.commit()
        print(f"Committed final batch of {write_count} documents.")

    print(f"Firestore update complete. Successfully wrote {write_count} documents.")

    # Write local copy for verification or local debugging
    try:
        with OUTPUT_FILE.open("w", encoding="utf-8") as f:
            import json
            json.dump(chargers, f, indent=2)
        print(f"Successfully wrote debug copy to {OUTPUT_FILE}")
    except Exception as e:
        print(f"Failed to write local debug copy: {e}")


if __name__ == "__main__":
    main()
