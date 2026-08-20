#!/bin/bash
# Runs inside the LocalStack container each time it reaches the "ready" stage
# (LocalStack init hook). Provisions the SafeIn5 bucket + browser CORS so a
# restart never leaves the PWA upload blocked on a missing bucket or missing
# CORS. Idempotent — safe to run on every boot.
#
# MUST stay LF-only: a CRLF shebang (#!/bin/bash\r) makes the kernel look for
# interpreter "/bin/bash\r" and the script fails with [Errno 2]. .gitattributes
# pins *.sh to eol=lf so git's autocrlf can't re-break it.
set -e

awslocal s3 mb s3://safein-videos 2>/dev/null || true

awslocal s3api put-bucket-cors --bucket safein-videos --cors-configuration '{
  "CORSRules": [
    {
      "AllowedOrigins": ["http://localhost:5173", "https://localhost:5173"],
      "AllowedMethods": ["PUT", "GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}'

echo "[safein-init] bucket safein-videos + CORS ready"
