#!/bin/bash

set -o errexit -o nounset -o pipefail

export AWS_DEFAULT_REGION=ap-southeast-2

echo FrontendWebsiteCertificate=$FrontendWebsiteCertificate
echo BackendLambdaS3Bucket=$BackendLambdaS3Bucket
echo BackendLambdaS3Key=$BackendLambdaS3Key

