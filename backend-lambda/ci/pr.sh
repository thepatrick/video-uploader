#!/bin/bash

# errexit:  Exit immediately if a command exits with a non-zero status.
# nounset:  Treat unset variables as an error when substituting.
# pipefail: The return value of a pipeline is the status of the last command
#           to exit with a non-zero status, or zero if no command exited with
#           a non-zero status.
set -o errexit -o nounset -o pipefail

cd $(dirname "$0")/..

. ../ci/functions.sh

hash=$(calculate_hash $PWD "$PWD/../ci/")
object=backend-lambda/${hash}/build.zip

echo object=$object

# if ! s3_object_exists $LAMBDA_BUCKET $object; then
#   start_group "Downloading redirect-lambda"
#   ../redirect-lambda/ci/get.sh
#   end_group

#   start_group "Installing dependencies"
#   npm ci
#   end_group

#   start_group "Testing"
#   npm test
#   end_group

#   start_group "Building"
#   npm run build
#   end_group

#   start_group "Uploading to s3://$LAMBDA_BUCKET/$object"
#   aws s3 cp build.zip "s3://$LAMBDA_BUCKET/$object"
#   end_group
# fi

# echo $object > build.key
