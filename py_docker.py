import subprocess
try:
    output = subprocess.check_output(['docker', 'ps', '-a', '--format', '{{.Names}}\t{{.Image}}\t{{.Status}}']).decode('utf-8')
    print("DOCKER_OUTPUT_START")
    print(output)
    print("DOCKER_OUTPUT_END")
except Exception as e:
    print(f"Error: {e}")
