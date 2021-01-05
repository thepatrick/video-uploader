#!/bin/bash

set -o errexit -o nounset -o pipefail

export AWS_DEFAULT_REGION=ap-southeast-2

aws cloudformation deploy \
  --template-file backend-bucket.cfn.yaml \
  --stack-name uploader-backend

LAMBDA_BUCKET=$(aws cloudformation describe-stacks --stack-name uploader-backend --query 'Stacks[0].Outputs[?OutputKey==`BackendBucket`].OutputValue' --output text)

echo "::set-output name=backendBucket::$LAMBDA_BUCKET"
