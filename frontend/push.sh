#!/bin/bash

set -o errexit -o nounset -o pipefail

export AWS_DEFAULT_REGION=ap-southeast-2

export FRONTEND_BUCKET=$(aws cloudformation describe-stacks --stack-name uploader --query 'Stacks[0].Outputs[?OutputKey==`FrontendWebsiteBucket`].OutputValue' --output text)

ci/push.sh