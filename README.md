# chefs-embedded-form

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

## OpenShift Deployment

### Option 1: Pre-built Image
```sh
# Build the image
docker build -f Dockerfile.openshift -t chefs-embedded-form:latest .

# Tag for your OpenShift registry
docker tag chefs-embedded-form:latest image-registry.apps.silver.devops.gov.bc.ca/a191b5-tools/chefs-embedded-form:latest

# Login to OpenShift registry
oc whoami -t | docker login image-registry.apps.silver.devops.gov.bc.ca -u $(oc whoami) --password-stdin

# Push the image
docker push image-registry.apps.silver.devops.gov.bc.ca/a191b5-tools/chefs-embedded-form:latest

# Deploy using pre-built template
oc process -f embedded-chefs.yaml \
  -p APP_NAME=chefs-embedded-form \
  -p IMAGE_REGISTRY=image-registry.openshift-image-registry.svc:5000 \
  -p IMAGE_NAMESPACE=a191b5-tools \
  -p ROUTE_HOST=chefs-embedded-form.apps.silver.devops.gov.bc.ca \
  -p VITE_API_FORM_ID=your-form-id \
  -p VITE_API_FORM_VERSION_ID=your-version-id \
  -p VITE_API_KEY=your-api-key \
  | oc apply -f -
```

### Option 2: Build in OpenShift (Recommended)
```sh
# Deploy using build template (OpenShift builds from Git)
oc process -f embedded-chefs-build.yaml \
  -p APP_NAME=chefs-embedded-form \
  -p ROUTE_HOST=chefs-embedded-form.apps.silver.devops.gov.bc.ca \
  -p VITE_API_FORM_ID=your-form-id \
  -p VITE_API_FORM_VERSION_ID=your-version-id \
  -p VITE_API_KEY=your-api-key \
  | oc apply -f -

# Trigger a build
oc start-build chefs-embedded-form
```