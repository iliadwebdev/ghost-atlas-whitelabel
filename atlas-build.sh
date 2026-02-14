docker buildx build \
  --platform linux/amd64 \
  -f Dockerfile.railway \
  -t owenrossi/ghost-atlas-whitelabel:railway \
  --push \
  .