#!/usr/bin/env python3
"""
Email-Manager 打包脚本

使用方法: python build.py
"""
import os
import shutil
import subprocess
import sys
import platform

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
    is_windows = platform.system() == "Windows"
    is_mac = platform.system() == "Darwin"
    
    ext = ".exe" if is_windows else ""
    target_name = "EmailManager"
    if is_mac:
        target_name_full = f"{target_name}.app"
    else:
        target_name_full = f"{target_name}{ext}"

    print(f"\n=== 打包 {target_name_full} ===")
    
    # 确保 backend/requirements.txt 中的依赖已安装 (特别是 pyinstaller 和 pywebview)
    # 自动尝试安装缺失依赖
    try:
        import pyinstaller
    except ImportError:
        print("正在安装 PyInstaller...")
        run(f"{sys.executable} -m pip install pyinstaller")
    
    try:
        import webview
    except ImportError:
        print("正在安装 pywebview...")
        run(f"{sys.executable} -m pip install pywebview")

    # 安装 requirements.txt
    print("正在安装后端依赖...")
    run(f"{sys.executable} -m pip install -r requirements.txt", cwd=backend_dir)

    # 路径分隔符
    sep = ";" if is_windows else ":"
    
    # 确保 desktop.py 存在
    if not os.path.exists(os.path.join(backend_dir, "desktop.py")):
         print("错误: backend/desktop.py 不存在")
         sys.exit(1)

    icon_path = "NONE"
    icon_flag = f'--icon="{icon_path}" ' if icon_path != "NONE" else ""

    run(
        f'pyinstaller --onefile --windowed '
        f'--add-data "web{sep}web" '
        f'--name "{target_name}" '
        f'{icon_flag}'
        f'--clean '
        f'desktop.py',
        cwd=backend_dir
    )
    
    # 4. 输出结果
    output_path = os.path.join(backend_dir, "dist", target_name_full)
    if os.path.exists(output_path):
        print(f"\n✅ 打包成功: {output_path}")
        if not is_mac: # macOS .app is a directory
            print(f"📦 文件大小: {os.path.getsize(output_path) / 1024 / 1024:.1f} MB")
    else:
        print("\n❌ 打包失败")

if __name__ == "__main__":
    main()

