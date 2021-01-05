#!/bin/bash

set -o errexit -o nounset -o pipefail

export AWS_DEFAULT_REGION=ap-southeast-2

BackendLambdaS3Bucket=$(aws cloudformation describe-stacks --stack-name uploader-backend --query 'Stacks[0].Outputs[?OutputKey==`BackendBucket`].OutputValue' --output text)
FrontendWebsiteCertificate=$(env AWS_DEFAULT_REGION=us-east-1 aws cloudformation describe-stacks --stack-name uploader-certificate --query 'Stacks[0].Outputs[?OutputKey==`Certificate`].OutputValue' --output text)
BackendLambdaS3Key=$(backend-lambda/ci/current-object.sh) 

echo FrontendWebsiteCertificate=$FrontendWebsiteCertificate
echo BackendLambdaS3Bucket=$BackendLambdaS3Bucket
echo BackendLambdaS3Key=$BackendLambdaS3Key
