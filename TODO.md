1. ~Rename bucket.cfn.yaml to something more sensible~
2. CD deploy ~backendbucket.cfn.yaml~, then ~certificate.cfn.yaml~, then ~backend-lambda/push.sh~, then ~deployment.yaml~, then ~frontend/push.sh~
3. Put a friendly name over the top of the api gateway... maybe we can just point /api from the frontend cloudfront to it?
4. Update readme in frontend
5. Create readme in backend-lambda
6. Populate a good readme in the root of the repo
7. Move the cloudformtion templates + shell scripts out of the root folder.