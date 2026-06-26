import time
import os
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import subprocess

BASE_FOLDER = "/Users/raginimishra/Library/CloudStorage/OneDrive-EdunnovateTechnologiesPrivateLimited/TIS-Enrollment-Data"

WATCH_FILES = {
    "Course Wise Enrollment.xlsx",
    "Student Master.xlsx"
}

DEBOUNCE_SECONDS = 5
last_run_time = 0


class Handler(FileSystemEventHandler):
    def on_modified(self, event):
        global last_run_time

        if event.is_directory:
            return

        filename = os.path.basename(event.src_path)

        # only react to our Excel files
        if filename not in WATCH_FILES:
            return

        now = time.time()

        if now - last_run_time < DEBOUNCE_SECONDS:
            return

        last_run_time = now

        print(f"\n📊 Change detected in {filename} → running pipeline...")

        result = subprocess.run(["python3", "convert.py"])

        if result.returncode == 0:
            print("📦 Running deploy.sh...")
            subprocess.run(["./deploy.sh"])
            print("✅ Deploy complete")
        else:
            print("❌ Convert failed — skipping deploy")


if __name__ == "__main__":
    print("👀 Watching Excel files for changes...")

    event_handler = Handler()
    observer = Observer()

    observer.schedule(event_handler, BASE_FOLDER, recursive=False)

    observer.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Stopping watcher...")
        observer.stop()

    observer.join()
