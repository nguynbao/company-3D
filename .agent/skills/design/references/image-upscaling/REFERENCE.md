---
name: image-upscaling
description: Upscale low-resolution images to 2K/4K Ultra-HD while preserving detail, sharpness, and natural texture using CoreImage Lanczos Super-Resolution, Unsharp Mask, Real-ESRGAN, or Topaz pipelines.
---

# Image Upscaling & Super-Resolution Module (Integrated in DESIGN & VIDEO)

## 1. Local Hardware-Accelerated Super-Resolution (Default Pipeline)
- Automatically triggered via `node .agent/skills/design/scripts/stamp_logo.js`
- Uses Apple Silicon `CoreImage` (`CILanczosScaleTransform` + `CIUnsharpMask`) to upscale any asset `< 2048px` to `>= 2048px` (2K Ultra-HD) at `1.0` lossless quality before compositing the native `4574x1173px` 11 SPORT logo.

## 2. External AI Super-Resolution (Optional 4K/8K Print Pipeline)
- Supports 2x and 4x AI super-resolution recovery for extreme print deliverables (billboards, court backdrops, standees).
- Enforces zero compression artifacts, preserved carbon-fiber weave micro-texture, and crisp typography edges.
