#!/bin/bash
# Build and deploy script for OpenShift

set -e

# Configuration
APP_NAME="${APP_NAME:-embedded-chefs}"
IMAGE_NAME="${IMAGE_NAME:-chefs-embedded-form}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
REGISTRY="${REGISTRY:-ghcr.io}"
NAMESPACE="${NAMESPACE:-your-github-username}"

echo "Building Vue.js application..."
npm run build

echo "Building Docker image..."
docker build -f Dockerfile.openshift -t ${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG} .

echo "Pushing image to registry..."
docker push ${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG}

echo "Image pushed: ${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG}"
echo ""
echo "To deploy to OpenShift, use:"
echo "oc process -f embedded-chefs-prebuilt.yaml \\"
echo "  -p APP_NAME=${APP_NAME} \\"
echo "  -p IMAGE_REGISTRY=${REGISTRY} \\"
echo "  -p IMAGE_NAMESPACE=${NAMESPACE} \\"
echo "  -p IMAGE_NAME=${IMAGE_NAME} \\"
echo "  -p IMAGE_TAG=${IMAGE_TAG} \\"
echo "  -p ROUTE_HOST=your-route-host.apps.cluster.domain \\"
echo "  -p VITE_API_FORM_ID=your-form-id \\"
echo "  -p VITE_API_FORM_VERSION_ID=your-version-id \\"
echo "  -p VITE_API_KEY=your-api-key \\"
echo "  | oc apply -f -"
