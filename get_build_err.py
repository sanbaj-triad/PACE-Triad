import subprocess

try:
    result = subprocess.run(
        ["docker-compose", "build", "frontend"], 
        capture_output=True, 
        text=True
    )
    print("STDOUT", result.stdout[-2000:])
    print("STDERR", result.stderr[-2000:])
except Exception as e:
    print(e)
