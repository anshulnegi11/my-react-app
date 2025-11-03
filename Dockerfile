FROM ubuntu:latest

LABEL maintainer="anshul_negi"

RUN apt update && \
    apt install -y curl nginx && \
    apt clean

WORKDIR /var/www/html

RUN rm -rf /var/www/html/*

# ✅ Copy compiled frontend (Vite uses 'dist', not 'build')
COPY dist/ /var/www/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
