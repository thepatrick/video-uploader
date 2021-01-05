#!/bin/bash

set -o errexit -o nounset -o pipefail

cd $(dirname "$0")/..

. ../ci/functions.sh

start_group "Installing dependencies"
npm ci
end_group

start_group "Building"
npm run clean
npm run build
end_group

start_group "Uploading to s3://$FRONTEND_BUCKET"
aws s3 sync dist/ "s3://${FRONTEND_BUCKET}/"
end_group