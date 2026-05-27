import subprocess

try:
    result = subprocess.run(
        ["docker-compose", "build", "frontend"], 
        capture_output=True, 
        text=True
    )
    with open("build_err.log", "w", encoding="utf-8") as f:
        f.write(result.stderr)
        f.write(result.stdout)
except Exception as e:
    print(e)
