#!/bin/bash

set -o errexit -o nounset -o pipefail

export AWS_DEFAULT_REGION=ap-southeast-2

echo FRONTEND_WEBSITE_CERTIFICATE=$FRONTEND_WEBSITE_CERTIFICATE
echo BACKEND_LAMBDA_S3_BUCKET=$BACKEND_LAMBDA_S3_BUCKET
echo BACKEND_LAMBDA_S3_KEY=$BACKEND_LAMBDA_S3_KEY

aws cloudformation deploy \
  --template-file deployment.cfn.yaml \
  --stack-name uploader \
  --no-execute-changeset \
  --parameter-override \
    "HostedZoneId=$HOSTED_ZONE_ID" \
    "FrontendDomain=$FRONTEND_DOMAIN" \
    "BackendDomain=$BACKEND_DOMAIN" \
    "FrontendWebsiteCertificate=$FRONTEND_WEBSITE_CERTIFICATE" \
    "BackendJWTAudience=$BACKEND_JWT_AUDIENCE" \
    "BackendLambdaS3Bucket=$BACKEND_LAMBDA_S3_BUCKET" \
    "BackendLambdaS3Key=$BACKEND_LAMBDA_S3_KEY" \
    "BackendJWTPrivateKey=$BACKEND_JWT_PRIVATE_KEY" \
    "VeypearPresenterBase=$VEYPEAR_PRESENTER_BASE" \
  --capabilities CAPABILITY_IAM
