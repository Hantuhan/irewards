#!/bin/sh
set -e
# Sync deps when package-lock changes (dev volume can hide new packages from image build).
npm ci
exec npx next dev -p 3000 -H 0.0.0.0
