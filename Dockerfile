FROM ubuntu:latest

LABEL maintainer="anshul_negi"

RUN apt update && \
    apt install -y curl nginx && \
    apt clean

WORKDIR /var/www/html

RUN rm -rf /var/www/html/*

COPY build/ /var/www/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
