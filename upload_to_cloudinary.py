#!/usr/bin/env python3
"""批量上传图片到 Cloudinary"""
import os
import cloudinary
import cloudinary.uploader

cloudinary.config(
    cloud_name="jwjttap0",
    api_key="754246963498852",
    api_secret="0T_cAAt_DFJFIqNWFpAkvi4wrb4",
    secure=True
)

# 要上传的文件夹
FOLDERS = ["photos", "friends", "covers"]
EXTS = (".jpg", ".jpeg", ".png", ".gif", ".webp")

base = os.path.dirname(os.path.abspath(__file__))
uploaded = 0
skipped = 0

for folder in FOLDERS:
    folder_path = os.path.join(base, folder)
    if not os.path.exists(folder_path):
        print(f"跳过 {folder}/（不存在）")
        continue
    for root, dirs, files in os.walk(folder_path):
        for f in files:
            if not f.lower().endswith(EXTS):
                continue
            local_path = os.path.join(root, f)
            # public_id 用相对路径（不带扩展名），保持文件夹结构
            rel = os.path.relpath(local_path, base)
            public_id = os.path.splitext(rel)[0]
            try:
                result = cloudinary.uploader.upload(
                    local_path,
                    public_id=public_id,
                    overwrite=False,  # 已存在的跳过
                    resource_type="image"
                )
                print(f"✓ {rel} -> {result['secure_url']}")
                uploaded += 1
            except Exception as e:
                if "already exists" in str(e):
                    print(f"= {rel}（已存在，跳过）")
                    skipped += 1
                else:
                    print(f"✗ {rel}: {e}")

print(f"\n完成！上传 {uploaded} 张，跳过 {skipped} 张已存在。")
