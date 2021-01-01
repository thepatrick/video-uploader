#!/bin/bash

# errexit:  Exit immediately if a command exits with a non-zero status.
# nounset:  Treat unset variables as an error when substituting.
# pipefail: The return value of a pipeline is the status of the last command
#           to exit with a non-zero status, or zero if no command exited with
#           a non-zero status.
set -o errexit -o nounset -o pipefail

echo "::group::Checking for s3://$bucket/$object" 
if ( aws s3api head-object --bucket "$bucket" --key "$object" > /dev/null 2> /dev/null ); then
    echo "Skipping build & upload to s3://$bucket/$object"
    echo "::endgroup::"
    exit
fi

echo "Not found, execute the then..."
echo "::endgroup::"

"$@"
