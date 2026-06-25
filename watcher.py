import time
import os
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

WATCH_FILE = "/Users/raginimishra/Library/CloudStorage/OneDrive-EdunnovateTechnologiesPrivateLimited/TIS-Enrollment-Data/Course Wise Enrollment.xlsx"

class Handler(FileSystemEventHandler):
    def on_modified(self, event):
        if "Course Wise Enrollment.xlsx" in event.src_path:
            print("Excel changed → running pipeline")

            os.system("python3 convert.py")
            os.system("git add data/enrollments.json")
            os.system('git commit -m "auto update from EA Excel"')
            os.system("git push")

event_handler = Handler()
observer = Observer()

path = os.path.dirname(WATCH_FILE)
observer.schedule(event_handler, path=path, recursive=False)

observer.start()

print("Watching Excel file...")

try:
    while True:
        time.sleep(5)
except KeyboardInterrupt:
    observer.stop()

observer.join()
