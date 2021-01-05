#!/bin/bash

set -o errexit -o nounset -o pipefail

npm run clean
npm run build

aws s3 sync dist/ "s3://${FRONTEND_BUCKET}/"
