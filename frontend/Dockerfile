# Production stage
FROM nginx:alpine as production-stage

# Copy the built files natively compiled on the host to avoid Docker memory EPIPE limits
COPY dist /usr/share/nginx/html

# Replace default Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
