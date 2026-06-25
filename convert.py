import pandas as pd
import json
import numpy as np


import os

file_name = os.path.join(
    os.path.expanduser("~"),
    "Library",
    "CloudStorage",
    "OneDrive-EdunnovateTechnologiesPrivateLimited",
    "TIS-Enrollment-Data",
    "Course Wise Enrollment.xlsx"
)

df = pd.read_excel(file_name)

# Clean column names
df.columns = [
    c.strip().lower().replace(" ", "_")
    for c in df.columns
]

# Convert Excel date → readable string
if "enrolment_date" in df.columns:
    df["enrolment_date"] = pd.to_datetime(df["enrolment_date"], errors="coerce")
    df["enrolment_date"] = df["enrolment_date"].dt.strftime("%d-%b-%Y")

# Clean course_fee (remove commas)
if "course_fee" in df.columns:
    df["course_fee"] = (
        df["course_fee"]
        .astype(str)
        .str.replace(",", "")
    )

# Fix NaN
df = df.replace([np.nan], "")

# Convert to JSON-safe format
data = df.to_dict(orient="records")

# Write JSON
with open("data/enrollments.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=4, ensure_ascii=False)

print("✅ JSON updated")
print("Rows:", len(data))
