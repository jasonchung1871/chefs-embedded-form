FROM nginx:1.23-alpine

# copy our template files
COPY default.conf.template  /etc/nginx/templates/default.conf.template
COPY index.html.template   /usr/share/nginx/html/index.html.template

# render and launch
CMD ["/bin/sh","-c", "\
  # populate nginx.conf.d/default.conf \
  envsubst '$$ALLOWED_ORIGIN' \
    < /etc/nginx/templates/default.conf.template \
    > /etc/nginx/conf.d/default.conf && \
  # populate index.html \
  envsubst '$$IFRAME_SRC' \
    < /usr/share/nginx/html/index.html.template \
    > /usr/share/nginx/html/index.html && \
  exec nginx -g 'daemon off;'\
"]