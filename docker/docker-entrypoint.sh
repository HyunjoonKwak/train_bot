#!/bin/sh
set -e

echo "Starting TrainBot..."
echo "  NODE_ENV: ${NODE_ENV}"
echo "  DB_PATH:  ${DB_PATH}"
echo "  PORT:     ${PORT}"

exec node dist/server/index.js
