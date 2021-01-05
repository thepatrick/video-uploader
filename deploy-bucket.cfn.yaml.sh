#!/bin/bash

set -o errexit -o nounset -o pipefail

export AWS_DEFAULT_REGION=ap-southeast-2

aws cloudformation deploy \
  --template-file backend-bucket.cfn.yaml \
  --stack-name uploader-backend

