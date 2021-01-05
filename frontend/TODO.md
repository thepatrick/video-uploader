# TODO

1. ~CloudFormation create S3 bucket~
2. ~CloudFormation create CloudFront in front of S3 (configure to not cache / at all)~
3. ~Github action to build frontend & push to S3~
4. Add error handling to getPartSignedURLs, abandonUpload and completeUpload (although...?)
5. Change logic to not get presigned urls until they are needed (might be a lot of data to ship if the the file is split into 100+ chunks)
6. Add retry logic if a chunk fails (maybe allow for something like 3-4 retries without a chunk succeeding / remaining in flight, and then show a "Having trouble, try again?", maybe also reducing concurrency at the same time)