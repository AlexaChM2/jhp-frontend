FROM nginx:alpine

# Copiar todos los archivos del sitio
COPY . /usr/share/nginx/html

# Exponer puerto 8080 (Railway lo requiere)
EXPOSE 8080

# Configurar Nginx para usar puerto 8080
RUN sed -i 's/80/8080/g' /etc/nginx/conf.d/default.conf

# Iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]