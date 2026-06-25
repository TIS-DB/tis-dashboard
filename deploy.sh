#!/bin/bash

cd "$(dirname "$0")"

echo "🚀 Starting TIS Dashboard Pipeline..."

echo "📊 Step 1: Running Excel conversion"
python3 convert.py

echo "📦 Step 2: Git add ALL changes"
git add -A

echo "📝 Step 3: Commit changes"
git commit -m "Auto update enrollment data" || echo "No changes"

echo "🚀 Step 4: Push to GitHub"
git push origin main

echo "✅ Done — Dashboard updated!"
#!/bin/bash

cd "$(dirname "$0")"

echo "🚀 Starting TIS Dashboard Pipeline..."

echo "📊 Step 1: Running Excel conversion"
python3 convert.py

echo "📦 Step 2: Git add ALL changes"
git add -A

echo "📝 Step 3: Commit changes"
git commit -m "Auto update enrollment data" || echo "No changes"

echo "🚀 Step 4: Push to GitHub"
git push origin main

echo "✅ Done — Dashboard updated!"
