$Dir = ".\ssl_certs"
if (-not (Test-Path $Dir)) {
    New-Item -ItemType Directory -Force -Path $Dir | Out-Null
}

Write-Host "Generating self-signed SSL certificate using OpenSSL container..."

# Use alpine/openssl to generate the certificate and dump it directly into the mapped folder
docker run --rm -v "$($PWD.Path)\ssl_certs:/certs" alpine/openssl req -x509 -nodes -days 3650 -newkey rsa:2048 -keyout /certs/nginx.key -out /certs/nginx.crt -subj "/C=US/ST=State/L=City/O=Internal/CN=localhost"

Write-Host "Certificates generated successfully in .\ssl_certs"
