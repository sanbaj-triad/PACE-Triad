try:
    with open('tmp_backend.txt', 'r', encoding='utf-16le') as f:
        backend = f.readlines()
    with open('tmp_frontend.txt', 'r', encoding='utf-16le') as f:
        frontend = f.readlines()
    with open('debug_logs.md', 'w') as f:
        f.write("# Backend\n```\n")
        f.writelines(backend[-30:])
        f.write("```\n# Frontend\n```\n")
        f.writelines(frontend[-30:])
        f.write("\n```")
except Exception as e:
    print(e)
