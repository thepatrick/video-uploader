#!/bin/bash

set -o errexit -o nounset -o pipefail

export AWS_DEFAULT_REGION=us-east-1

aws cloudformation deploy \
  --template-file certificate.cfn.yaml \
  --stack-name uploader-certificate \
  --parameter-override \
    HostedZoneId=Z09102521YXWQT2ZKMPP7 \
    FrontendDomain=lca2021-presenter.aws.nextdayvideo.com.au \
    BackendDomain=lca2021-presenter-api.aws.nextdayvideo.com.au

certificate=$(aws cloudformation describe-stacks --stack-name uploader-certificate --query 'Stacks[0].Outputs[?OutputKey==`Certificate`].OutputValue' --output text)

echo "::set-output name=certificate::$certificate"
