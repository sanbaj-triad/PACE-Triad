
import sys
import os
sys.path.append(os.getcwd())

from app.main import app
from fastapi.routing import APIRoute

def list_routes():
    print("Listing all routes:")
    for route in app.routes:
        if isinstance(route, APIRoute):
            print(f"Path: {route.path} | Name: {route.name} | Func: {route.endpoint.__name__} | Module: {route.endpoint.__module__}")

if __name__ == "__main__":
    list_routes()
