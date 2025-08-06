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

## Local

### Build

```sh
docker build -f Dockerfile.openshift -t chefs-embedded-form:local .
```

### Run

```sh
docker run --rm -it -p 8080:8080 chefs-embedded-form:local
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
oc process -f embedded-chefs-build.yaml 
  -p APP_NAME=chefs-embedded-form 
  -p ROUTE_HOST=chefs-embedded-form.apps.silver.devops.gov.bc.ca 
  -p VITE_API_FORM_ID=3aa45876-464b-40b5-8cf4-9afc2545e394
  -p VITE_API_FORM_VERSION_ID=1f57b879-1d0b-4d5e-9300-0878f0a98061
  -p VITE_API_KEY=544a1274-f37e-4d5d-9a44-c58865493971
  | oc apply -f -

# Trigger a build
oc start-build chefs-embedded-form
```

### Deleting Resources
```sh
oc delete all -l app=chefs-embedded-form
oc delete secret -l app=chefs-embedded-form
oc delete configmap -l app=chefs-embedded-form
oc delete pvc -l app=chefs-embedded-form
```