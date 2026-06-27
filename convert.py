import pandas as pd
import json
import numpy as np
import os

FILES = {
    "enrollments": "https://theinnovationstory-my.sharepoint.com/:x:/p/ragini/IQBY0YxMDubZTrhClYnfi6jkARuhda3zffKkko6k6bUfh3k?e=QpKJ6k&download=1",
    "students": "https://theinnovationstory-my.sharepoint.com/:x:/p/ragini/IQCHsGYHDxfpQIBCovKgYcaqAf9wgHYLPVkXXE_9Ujuf35c?e=FQ3KKh&download=1",
    "weeklyreview": "https://theinnovationstory-my.sharepoint.com/:x:/p/ragini/IQCjE3LbsEwFSqfJH50WVPojAXzmaoIU5t9M3304eIbUigI?e=KV0tAq&download=1",
    "cskpi": "https://theinnovationstory-my.sharepoint.com/:x:/p/ragini/IQCCBGFU2GdjRb8TV4GAroICAVtDTH91QnsgMy-aQcEwo8k?e=oaXKoe&download=1"
}

OUTPUT_FILES = {
    "enrollments": "data/enrollments.json",
    "students": "data/students.json",
    "weeklyreview": "data/weeklyreview.json",
    "cskpi": "data/cskpi.json"
}


def clean_df(df):
    df = df.dropna(how="all")
    df = df.dropna(axis=1, how="all")

    df.columns = [
        str(c).strip().lower().replace(" ", "_")
        for c in df.columns
    ]

    df = df.loc[:, ~df.columns.str.startswith("unnamed")]

    for col in df.columns:
        if "date" in col:
            df[col] = pd.to_datetime(df[col], errors="coerce")
            df[col] = df[col].dt.strftime("%d-%b-%Y")

    for col in df.columns:
        df[col] = (
            df[col]
            .astype(str)
            .str.replace(",", "", regex=False)
            .str.strip()
        )

    df = df.replace([np.nan, "nan", "NaT", "None"], "")

    return df


def write_json(output_path, data):
    os.makedirs("data", exist_ok=True)

    tmp_file = output_path + ".tmp"

    with open(tmp_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

    os.replace(tmp_file, output_path)


def process_file(key):
    path = FILES[key]

    print(f"📥 Reading {key} file...")

    try:
        df = pd.read_excel(path, engine="openpyxl")
        df = clean_df(df)

        data = df.to_dict(orient="records")
        write_json(OUTPUT_FILES[key], data)

        print(f"✅ {key}.json updated → Rows: {len(data)}")

    except Exception as e:
        print(f"❌ Error processing {key}: {e}")
        raise


def process_weekly_review():
    path = FILES["weeklyreview"]

    print("📥 Reading Main Dashboard.xlsx...")

    try:
        dashboard_df = pd.read_excel(path, sheet_name="Dashboard", engine="openpyxl")
        links_df = pd.read_excel(path, sheet_name="Collated links", engine="openpyxl")

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
        print(f"❌ Error processing weeklyreview: {e}")
        raise


def run():
    print("\n🚀 Starting conversion pipeline...\n")

    process_file("enrollments")
    process_file("students")
    process_weekly_review()
    process_file("cskpi")

    print("\n🎯 All files processed successfully")


if __name__ == "__main__":
    run()
