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
    "students": "Student Master.xlsx",
    "weeklyreview": "Main Dashboard.xlsx"
}

OUTPUT_FILES = {
    "enrollments": "data/enrollments.json",
    "students": "data/students.json",
    "weeklyreview": "data/weeklyreview.json"
}


# ----------------------------
# UTIL FUNCTIONS
# ----------------------------
def clean_df(df):
    df.columns = [
        str(c).strip().lower().replace(" ", "_")
        for c in df.columns
    ]

    for col in df.columns:
        if "date" in col:
            df[col] = pd.to_datetime(df[col], errors="coerce")
            df[col] = df[col].dt.strftime("%d-%b-%Y")

    for col in df.columns:
        df[col] = df[col].astype(str).str.replace(",", "", regex=False)

    df = df.replace([np.nan, "nan", "NaT"], "")

    return df


def write_json(output_path, data):
    os.makedirs("data", exist_ok=True)

    tmp_file = output_path + ".tmp"

    with open(tmp_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

    os.replace(tmp_file, output_path)


def process_file(key, filename):
    path = os.path.join(BASE_PATH, filename)

    print(f"📥 Reading {filename}...")

    try:
        df = pd.read_excel(path)
        df = clean_df(df)

        data = df.to_dict(orient="records")

        write_json(OUTPUT_FILES[key], data)

        print(f"✅ {key}.json updated → Rows: {len(data)}")

    except Exception as e:
        print(f"❌ Error processing {filename}: {e}")


def process_weekly_review():
    path = os.path.join(BASE_PATH, FILES["weeklyreview"])

    print("📥 Reading Main Dashboard.xlsx...")

    try:
        dashboard_df = pd.read_excel(path, sheet_name="Dashboard")
        links_df = pd.read_excel(path, sheet_name="Collated links")
  

        dashboard_df = clean_df(dashboard_df)
        links_df = clean_df(links_df)

        output = {
            "dashboard": dashboard_df.to_dict(orient="records"),
            "links": links_df.to_dict(orient="records")
        }

        write_json(OUTPUT_FILES["weeklyreview"], output)

        print(
            f"✅ weeklyreview.json updated → "
            f"Dashboard: {len(dashboard_df)} rows, Links: {len(links_df)} rows"
        )

    except Exception as e:
        print(f"❌ Error processing Main Dashboard.xlsx: {e}")


# ----------------------------
# MAIN PIPELINE
# ----------------------------
def run():
    print("\n🚀 Starting conversion pipeline...\n")

    process_file("enrollments", FILES["enrollments"])
    process_file("students", FILES["students"])
    process_weekly_review()

    print("\n🎯 All files processed successfully")


if __name__ == "__main__":
    run()
