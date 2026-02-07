#!/usr/bin/env python3
"""
Email-Manager 打包脚本

使用方法: python build.py
"""
import os
import shutil
import subprocess
import sys

def run(cmd, cwd=None):
    """执行命令"""
    print(f">>> {cmd}")
    result = subprocess.run(cmd, shell=True, cwd=cwd)
    if result.returncode != 0:
        print(f"命令失败: {cmd}")
        sys.exit(1)

def main():
    # 检查前置条件
    if not shutil.which("npm"):
        print("错误: 需要安装 Node.js 和 npm")
        sys.exit(1)
    if not shutil.which("pyinstaller"):
        print("错误: 需要安装 PyInstaller (pip install pyinstaller)")
        sys.exit(1)
    
    # 获取根目录
    root_dir = os.getcwd()
    frontend_dir = os.path.join(root_dir, "frontend")
    backend_dir = os.path.join(root_dir, "backend")
    
    if not os.path.exists(frontend_dir) or not os.path.exists(backend_dir):
        print("错误: 未找到 frontend 或 backend 目录，请在 workspace 目录下运行")
        sys.exit(1)

    # 1. 构建前端
    print("\n=== 构建前端 ===")
    if not os.path.exists(os.path.join(frontend_dir, "node_modules")):
        run("npm install", cwd=frontend_dir)
    run("npm run build", cwd=frontend_dir)
    
    # 2. 复制到后端
    print("\n=== 复制静态文件 ===")
    web_dir = os.path.join(backend_dir, "web")
    dist_dir = os.path.join(frontend_dir, "dist")
    
    if os.path.exists(web_dir):
        shutil.rmtree(web_dir)
    shutil.copytree(dist_dir, web_dir)
    print(f"已复制到 {web_dir}")
    
    # 3. PyInstaller 打包
    print("\n=== 打包 EXE ===")
    # 确保 desktop.py 存在
    if not os.path.exists(os.path.join(backend_dir, "desktop.py")):
         # 如果不存在，可能是因为上次通过 git rebase 恢复时未创建，这里临时创建一下，或者确认文件是否存在
         print("错误: backend/desktop.py 不存在")
         sys.exit(1)

    run(
        f'pyinstaller --onefile --windowed '
        f'--add-data "web:web" '
        f'--name "EmailManager" '
        f'--icon=NONE '
        f'--clean '
        f'desktop.py',
        cwd=backend_dir
    )
    
    # 4. 输出结果
    exe_path = os.path.join(backend_dir, "dist", "EmailManager.exe")
    if os.path.exists(exe_path):
        print(f"\n✅ 打包成功: {exe_path}")
        print(f"📦 文件大小: {os.path.getsize(exe_path) / 1024 / 1024:.1f} MB")
    else:
        print("\n❌ 打包失败")

if __name__ == "__main__":
    main()
