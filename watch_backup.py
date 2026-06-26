import time
import os
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

FILE_TO_WATCH = "/Users/raginimishra/Library/CloudStorage/OneDrive-EdunnovateTechnologiesPrivateLimited/TIS-Enrollment-Data/Course Wise Enrollment.xlsx"

class Handler(FileSystemEventHandler):
    def on_modified(self, event):
        if FILE_TO_WATCH in event.src_path:
            print("📊 Excel changed → running deploy...")
            os.system("./deploy.sh")

if __name__ == "__main__":
    event_handler = Handler()
    observer = Observer()

    folder = os.path.dirname(FILE_TO_WATCH)
    observer.schedule(event_handler, folder, recursive=False)

    print("👀 Watching Excel file for changes...")
    observer.start()

    try:
        while True:
            time.sleep(2)
    except KeyboardInterrupt:
        observer.stop()

    observer.join()
