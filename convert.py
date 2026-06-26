import pandas as pd
import json
import numpy as np
import os

# ----------------------------
# CONFIG
# ----------------------------
BASE_PATH = os.path.join(
    os.path.expanduser("~"),
    "Library",
    "CloudStorage",
    "OneDrive-EdunnovateTechnologiesPrivateLimited",
    "TIS-Enrollment-Data"
)

FILES = {
    "enrollments": "Course Wise Enrollment.xlsx",
    "students": "Student Master.xlsx"
}

OUTPUT_FILES = {
    "enrollments": "data/enrollments.json",
    "students": "data/students.json"
}


# ----------------------------
# UTIL FUNCTIONS
# ----------------------------
def clean_df(df):
    df.columns = [
        c.strip().lower().replace(" ", "_")
        for c in df.columns
    ]

    # Convert any datetime columns safely
    for col in df.columns:
        if "date" in col:
            df[col] = pd.to_datetime(df[col], errors="coerce")
            df[col] = df[col].dt.strftime("%d-%b-%Y")

    # Clean numeric-like fields (remove commas)
    for col in df.columns:
        df[col] = df[col].astype(str).str.replace(",", "", regex=False)

    # Fix NaN
    df = df.replace([np.nan], "")

    return df


def process_file(key, filename):
    path = os.path.join(BASE_PATH, filename)

    print(f"📥 Reading {filename}...")

    try:
        df = pd.read_excel(path)
        df = clean_df(df)

        data = df.to_dict(orient="records")

        os.makedirs("data", exist_ok=True)

        tmp_file = OUTPUT_FILES[key] + ".tmp"

        with open(tmp_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)

        os.replace(tmp_file, OUTPUT_FILES[key])

        print(f"✅ {key}.json updated → Rows: {len(data)}")

    except Exception as e:
        print(f"❌ Error processing {filename}: {e}")


# ----------------------------
# MAIN PIPELINE
# ----------------------------
def run():
    print("\n🚀 Starting conversion pipeline...\n")

    for key, file in FILES.items():
        process_file(key, file)

    print("\n🎯 All files processed successfully")


if __name__ == "__main__":
    run()
