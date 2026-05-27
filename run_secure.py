import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        ssl_keyfile="./ssl_certs/nginx.key",
        ssl_certfile="./ssl_certs/nginx.crt"
    )
