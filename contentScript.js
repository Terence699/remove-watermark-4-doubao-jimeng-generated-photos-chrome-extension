// 调试：确认脚本是否加载
console.log('通用去水印插件已加载！当前网站:', window.location.hostname);

// 防止重复处理的全局集合 - This is being removed as it causes issues with dynamic content.
// const processedImages = new WeakSet(); 

// 按钮管理映射：图片URL -> 按钮元素
const buttonMap = new Map();

// 检测当前网站类型
function getCurrentSiteType() {
  const hostname = window.location.hostname;
  if (hostname.includes('doubao.com')) return 'doubao';
  if (hostname.includes('jimeng.jianying.com')) return 'jimeng';
  if (hostname.includes('dreamina.capcut.com')) return 'dreamina';
  return 'unknown';
}

// 根据网站类型获取图片选择器
function getImageSelector(siteType) {
  switch (siteType) {
    case 'doubao':
      // Reverted to the more general selector.
      // The isLargeImageMode function will distinguish the main image from thumbnails.
      return 'img[data-testid="in_painting_picture"]';
    case 'jimeng':
      // This targets the main image in the detailed view.
      return 'img.image-ArSTaO, img[data-apm-action="record-detail-image-detail-image-container"]';
    case 'dreamina':
      // Dreamina (international version) uses similar selectors as jimeng
      return 'img.image-GsX5hD, img[data-apm-action="record-detail-image-detail-image-container"]';
    default:
      return 'img';
  }
}

// 根据网站类型获取网站名称
function getSiteName(siteType) {
  switch (siteType) {
    case 'doubao': return '豆包';
    case 'jimeng': return '即梦';
    case 'dreamina': return 'Dreamina';
    default: return '未知';
  }
}

// 智能检测是否为大图模式（优化版）
function isLargeImageMode(img, siteType) {
  const rect = img.getBoundingClientRect();

  if (siteType === 'doubao') {
    // Restoring the reliable detection method for Doubao.
    // The large image has a class starting with 'preview-img-' and a sufficient size.
    const hasPreviewClass = Array.from(img.classList).some(c => c.startsWith('preview-img'));
    const isLargeEnough = rect.width > 200 && rect.height > 200;

    if (hasPreviewClass && isLargeEnough) {
      console.log('✅ [豆包] 判断为大图模式 (基于class和尺寸)');
      return true;
    }
    return false;
  }

  if (siteType === 'jimeng') {
    // Logic for Jimeng remains the same.
    const modalContainer = img.closest('[style*="position: fixed"], [class*="modal"], [class*="dialog"], [class*="overlay"]');
    if (!modalContainer) return false;
    
    if (rect.width > 400 && rect.height > 400) {
      console.log('✅ [即梦] 判断为大图模式');
      return true;
    }
    return false;
  }

  if (siteType === 'dreamina') {
    // Dreamina uses similar modal detection logic as jimeng
    const modalContainer = img.closest('[style*="position: fixed"], [class*="modal"], [class*="dialog"], [class*="overlay"]');
    if (!modalContainer) return false;
    
    if (rect.width > 400 && rect.height > 400) {
      console.log('✅ [Dreamina] 判断为大图模式');
      return true;
    }
    return false;
  }

  return false;
}

// 检查图片是否可见且有效
function isImageVisible(img) {
  if (!img || !img.parentElement) return false;
  
  const rect = img.getBoundingClientRect();
  // 图片必须有尺寸且在视口内或附近
  return rect.width > 0 && rect.height > 0 && 
         rect.top > -rect.height && rect.bottom < window.innerHeight + rect.height &&
         rect.left > -rect.width && rect.right < window.innerWidth + rect.width;
}

// 清理无效的按钮
function cleanupInvalidButtons() {
  const siteType = getCurrentSiteType();
  const siteName = getSiteName(siteType);
  let cleanedCount = 0;
  
  for (const [imgSrc, btnElement] of buttonMap.entries()) {
    // 检查按钮对应的图片是否还存在且可见
    const selector = getImageSelector(siteType);
    const currentImages = Array.from(document.querySelectorAll(selector));
    const correspondingImg = currentImages.find(img => img.src === imgSrc);
    
    if (!correspondingImg || !isImageVisible(correspondingImg) || !isLargeImageMode(correspondingImg, siteType)) {
      // 图片不存在、不可见或不再是大图模式，移除按钮
      if (btnElement && btnElement.parentElement) {
        btnElement.remove();
        cleanedCount++;
        console.log(`🗑️ 清理了无效按钮: ${imgSrc.substring(0, 50)}...`);
      }
      buttonMap.delete(imgSrc);
      
      // The corresponding logic for processedImages is also removed.
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`✅ ${siteName}清理完成，移除了 ${cleanedCount} 个无效按钮`);
  }
}

// 优化版本：显示优雅按钮
function addDownloadButton() {
  const siteType = getCurrentSiteType();
  const siteName = getSiteName(siteType);
  
  console.log(`开始查找${siteName}网站的大图模式图片...`);
  
  // 先清理无效按钮
  cleanupInvalidButtons();
  
  // 根据网站类型获取对应的图片选择器
  const selector = getImageSelector(siteType);
  const images = document.querySelectorAll(selector);
  console.log(`在${siteName}找到图片数量:`, images.length);
  
  images.forEach((img, index) => {
    // The check for processedImages is removed here.
    
    console.log(`\n=== 处理${siteName}图片 ${index} ===`);
    console.log('图片URL:', img.src.substring(0, 100) + '...');
    
    // 检查是否为大图模式
    if (!isLargeImageMode(img, siteType)) {
      console.log(`图片${index}不是大图模式，跳过`);
      return;
    }
    
    // 检查是否已有按钮（通过buttonMap）
    if (buttonMap.has(img.src)) {
      const existingBtn = buttonMap.get(img.src);
      if (existingBtn && existingBtn.parentElement) {
        console.log('按钮已存在，更新位置');
        // 更新现有按钮位置
        const rect = img.getBoundingClientRect();
        existingBtn.style.top = `${rect.top + 12}px`;
        existingBtn.style.left = `${rect.right - 120}px`;
        return;
      } else {
        // 清理无效的映射
        buttonMap.delete(img.src);
      }
    }
    
    // The marking of processedImages is removed here.
    
    console.log(`✅ 开始为${siteName}图片添加下载按钮`);
    
    // 创建唯一ID
    const btnId = `rmwatermark-btn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // 创建优雅的下载按钮（使用fixed定位，不影响原DOM）
    const btn = document.createElement('div');
    btn.id = btnId;
    btn.className = 'rmwatermark-download-btn';
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
      </svg>
      去水印下载
    `;
    
    // 根据网站类型调整按钮颜色
    let buttonGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'; // 默认紫色
    if (siteType === 'jimeng') {
      buttonGradient = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'; // 即梦用蓝色
    } else if (siteType === 'dreamina') {
      buttonGradient = 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)'; // Dreamina用橙红色
    }
    
    // 计算按钮位置
    const rect = img.getBoundingClientRect();
    
    // 优雅的样式设计（使用fixed定位）
    btn.style.cssText = `
      position: fixed !important;
      top: ${rect.top + 12}px !important;
      left: ${rect.right - 120}px !important;
      z-index: 999999 !important;
      background: ${buttonGradient} !important;
      color: white !important;
      padding: 8px 16px !important;
      border: none !important;
      border-radius: 24px !important;
      cursor: pointer !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
      backdrop-filter: blur(10px) !important;
      transition: all 0.3s ease !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      opacity: 0.9 !important;
    `;
    
    // 将按钮添加到管理映射
    buttonMap.set(img.src, btn);
    
    // 监听滚动和resize事件，更新按钮位置
    const updatePosition = () => {
      if (!isImageVisible(img) || !isLargeImageMode(img, siteType)) {
        // 图片不可见或不再是大图模式，隐藏按钮
        btn.style.display = 'none';
      } else {
        const newRect = img.getBoundingClientRect();
        btn.style.top = `${newRect.top + 12}px`;
        btn.style.left = `${newRect.right - 120}px`;
        btn.style.display = 'flex';
      }
    };
    
    window.addEventListener('scroll', updatePosition, { passive: true });
    window.addEventListener('resize', updatePosition, { passive: true });
    
    // 悬停效果
    btn.onmouseenter = function() {
      btn.style.opacity = '1';
      btn.style.transform = 'translateY(-2px)';
      btn.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)';
    };
    
    btn.onmouseleave = function() {
      btn.style.opacity = '0.9';
      btn.style.transform = 'translateY(0px)';
      btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    };
    
    // 点击下载事件
    btn.addEventListener('mousedown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('🖱️ 下载按钮被点击 (mousedown event)');
      downloadImageWithWatermarkRemoval(img.src, siteType);
    });
    
    // 添加按钮到body（不影响原DOM结构）
    document.body.appendChild(btn);
    console.log(`✅ ${siteName}优雅按钮已添加！`);
  });
}

// 去水印下载函数（使用Canvas处理）
async function downloadImageWithWatermarkRemoval(imgUrl, siteType) {
  console.log('🚀 开始下载流程，直接使用Canvas处理...');

  // 策略2: 如果URL清洗失败或不适用，则使用Canvas进行水印去除
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = imgUrl;

  try {
    // 等待图片加载
    await new Promise((resolve, reject) => {
      img.onload = () => {
        console.log('图片加载成功，尺寸:', img.width, 'x', img.height);
        resolve();
      };
      img.onerror = (e) => {
        console.error('图片加载失败:', e);
        reject(new Error('图片加载失败'));
      };
    });
    
    // 创建Canvas
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    // 优化：添加 willReadFrequently 属性，解决控制台警告
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    // 绘制图片到canvas
    ctx.drawImage(img, 0, 0, img.width, img.height);
    
    // 检查Canvas是否被污染
    try {
      ctx.getImageData(0, 0, 1, 1);
    } catch (e) {
      console.error('Canvas被污染，无法读取像素数据:', e);
      throw new Error('Canvas被污染');
    }
    
    // 核心：移除水印
    console.log('🚀 调用水印移除...');
    console.log('🖼️ 图片尺寸:', img.width, 'x', img.height);
    removeWatermark(ctx, img.width, img.height);
    console.log('✅ 水印移除调用完成');

    // 从Canvas获取处理后的图片Blob
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas转Blob失败'));
          return;
        }
        
        console.log('Canvas处理成功，Blob大小:', blob.size, 'bytes');
        const siteName = getSiteName(siteType);
        const filePrefix = siteType === 'doubao' ? 'doubao图片' : 
                          siteType === 'jimeng' ? '即梦图片' :
                          siteType === 'dreamina' ? 'Dreamina图片' : '图片';
        downloadBlob(blob, `${filePrefix}_去水印_${Date.now()}.png`);
        resolve();
      }, 'image/png', 0.95);
    });
    
  } catch (error) {
    console.error(`Canvas处理图片失败:`, error);
    
    // 最后的降级方案：直接下载原图
    console.log('使用最终降级方案：直接下载原图...');
    try {
      const response = await fetch(imgUrl);
      const blob = await response.blob();
      const extension = blob.type.split('/')[1] || 'png';
      const filePrefix = siteType === 'doubao' ? 'doubao图片' : 
                        siteType === 'jimeng' ? '即梦图片' :
                        siteType === 'dreamina' ? 'Dreamina图片' : '图片';
      await downloadBlob(blob, `${filePrefix}_原图_${Date.now()}.${extension}`);
      console.log('降级下载成功');
    } catch (fallbackError) {
      console.error('所有下载方案都失败:', fallbackError);
      throw new Error('图片下载失败');
    }
  }
}

/**
 * 简化的水印去除函数 - 固定处理左上角区域
 * @param {CanvasRenderingContext2D} ctx - Canvas上下文
 * @param {number} width - 图片宽度
 * @param {number} height - 图片高度
 */
function removeWatermark(ctx, width, height) {
  console.log('🔍 开始固定区域水印去除...');
  // showDebugMessage(`🔍 开始固定区域水印去除 (${width}x${height})`, true); // 开发调试用，部署前注释掉

  try {
    // 固定处理左上角区域 - 扩大区域确保完全覆盖"AI生成"水印
    const watermarkRegion = {
      name: '左上角(固定)',
      x: 3,
      y: 3,
      w: Math.min(220, width * 0.28), // 增加宽度，确保覆盖完整文字
      h: Math.min(90, height * 0.15)   // 增加高度，确保覆盖底部边缘
    };

    const processingText = `🧹 固定处理左上角水印区域 (${watermarkRegion.x}, ${watermarkRegion.y}, ${watermarkRegion.w}x${watermarkRegion.h})`;
    console.log(processingText);
    // showDebugMessage(processingText); // 开发调试用，部署前注释掉

    // 使用增强型算法处理左上角
    removeWatermarkFromRegionEnhanced(ctx, watermarkRegion);

    const completeText = `✅ 水印去除完成！处理了左上角固定区域`;
    console.log(completeText);
    // showDebugMessage(completeText); // 开发调试用，部署前注释掉

  } catch (e) {
    console.error('❌ 固定区域水印去除失败:', e);
    // 最简单的降级方案
    const fallbackRegion = { name: '左上角(降级)', x: 10, y: 10, w: 150, h: 50 };
    const fallbackText = `🔄 使用降级方案处理左上角`;
    console.log(fallbackText);
    // showDebugMessage(fallbackText); // 开发调试用，部署前注释掉
    removeWatermarkFromRegion(ctx, fallbackRegion);
  }
}

/**
 * 检测指定区域是否包含水印
 * @param {CanvasRenderingContext2D} ctx - Canvas上下文
 * @param {Object} region - 检测区域 {x, y, w, h}
 * @param {number} imgWidth - 图片总宽度
 * @param {number} imgHeight - 图片总高度
 * @returns {number} 水印检测评分 (0-1之间，越高越可能是水印)
 */
function detectWatermarkInRegion(ctx, region, imgWidth, imgHeight) {
  try {
    // 确保区域在图片范围内
    const safeRegion = {
      x: Math.max(0, Math.min(region.x, imgWidth - 1)),
      y: Math.max(0, Math.min(region.y, imgHeight - 1)),
      w: Math.min(region.w, imgWidth - region.x),
      h: Math.min(region.h, imgHeight - region.y)
    };

    if (safeRegion.w <= 0 || safeRegion.h <= 0) return 0;

    const imageData = ctx.getImageData(safeRegion.x, safeRegion.y, safeRegion.w, safeRegion.h);
    const pixels = imageData.data;

    let textLikePixels = 0;
    let totalPixels = 0;
    let edgePixels = 0;
    let contrastSum = 0;
    let uniformColorPixels = 0; // 新增：统一颜色像素计数
    let backgroundPixels = 0;   // 新增：背景像素计数

    // 首先分析整体颜色分布，识别主要背景色
    const colorHistogram = new Map();
    for (let y = 0; y < safeRegion.h; y++) {
      for (let x = 0; x < safeRegion.w; x++) {
        const idx = (y * safeRegion.w + x) * 4;
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        const alpha = pixels[idx + 3];

        if (alpha < 50) continue;

        // 将颜色量化到较粗的级别以识别主要颜色
        const quantizedR = Math.floor(r / 32) * 32;
        const quantizedG = Math.floor(g / 32) * 32;
        const quantizedB = Math.floor(b / 32) * 32;
        const colorKey = `${quantizedR},${quantizedG},${quantizedB}`;

        colorHistogram.set(colorKey, (colorHistogram.get(colorKey) || 0) + 1);
      }
    }

    // 找到最主要的背景色
    let dominantColor = null;
    let maxCount = 0;
    for (const [color, count] of colorHistogram.entries()) {
      if (count > maxCount) {
        maxCount = count;
        dominantColor = color.split(',').map(Number);
      }
    }

    // 分析像素特征
    for (let y = 1; y < safeRegion.h - 1; y++) {
      for (let x = 1; x < safeRegion.w - 1; x++) {
        const idx = (y * safeRegion.w + x) * 4;
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        const alpha = pixels[idx + 3];

        // 跳过透明像素
        if (alpha < 50) continue;

        totalPixels++;

        // 计算亮度
        const brightness = (r + g + b) / 3;

        // 检查是否为背景色
        if (dominantColor) {
          const colorDistance = Math.sqrt(
            Math.pow(r - dominantColor[0], 2) +
            Math.pow(g - dominantColor[1], 2) +
            Math.pow(b - dominantColor[2], 2)
          );
          if (colorDistance < 40) { // 与主要背景色相似
            backgroundPixels++;
            continue; // 跳过背景像素的进一步分析
          }
        }

        // 检测边缘（可能是文字轮廓）
        const neighbors = [
          pixels[((y-1) * safeRegion.w + x) * 4], // 上
          pixels[((y+1) * safeRegion.w + x) * 4], // 下
          pixels[(y * safeRegion.w + (x-1)) * 4], // 左
          pixels[(y * safeRegion.w + (x+1)) * 4]  // 右
        ];

        const avgNeighborBrightness = neighbors.reduce((sum, val) => sum + val, 0) / neighbors.length;
        const contrast = Math.abs(brightness - avgNeighborBrightness);
        contrastSum += contrast;

        // 提高边缘检测阈值，减少误检
        if (contrast > 50) { // 从30提高到50
          edgePixels++;
        }

        // 检测类似文字的特征 - 更严格的条件
        const colorVariance = Math.abs(r - g) + Math.abs(g - b) + Math.abs(b - r);

        // 调整文字检测条件，平衡准确性
        const isLowSaturation = colorVariance < 40; // 适中的颜色一致性要求
        const isDarkText = brightness < 140; // 适中的暗色文字检测
        const isLightText = brightness > 200; // 适中的亮色文字检测
        const isHighContrast = contrast > 35; // 适中的高对比度要求
        const isMediumContrast = contrast > 20; // 适中的中等对比度要求

        // 检查颜色一致性（文字通常颜色比较一致）
        if (isLowSaturation) {
          uniformColorPixels++;
        }

        // 平衡的文字识别条件
        if ((isLowSaturation && (isDarkText || isLightText)) || // 单色+极值亮度
            (isHighContrast && isLowSaturation) || // 高对比度+单色
            (isMediumContrast && isLowSaturation && (isDarkText || isLightText))) { // 中等对比度+单色+极值亮度
          textLikePixels++;
        }
      }
    }

    if (totalPixels === 0) return 0;

    // 计算各种特征的权重分数 - 更保守的评分
    const textRatio = textLikePixels / totalPixels;
    const edgeRatio = edgePixels / totalPixels;
    const avgContrast = contrastSum / totalPixels;
    const uniformRatio = uniformColorPixels / totalPixels;
    const backgroundRatio = backgroundPixels / totalPixels;

    // 如果背景像素占比过高，很可能不是水印区域
    if (backgroundRatio > 0.75) { // 降低阈值，更严格地排除背景区域
      return 0;
    }

    // 额外检查：如果文字像素太少，也可能不是水印
    if (textRatio < 0.05) {
      return 0;
    }

    // 平衡的综合评分
    let score = 0;
    score += textRatio * 0.5;           // 提高文字像素比例权重
    score += Math.min(edgeRatio * 2.5, 0.35); // 提高边缘像素比例权重
    score += Math.min(avgContrast / 80, 0.25); // 提高对比度权重
    score += Math.min(uniformRatio * 0.4, 0.15); // 提高颜色一致性权重

    // 适中的额外加分条件
    if (textRatio > 0.1 && edgeRatio > 0.05 && avgContrast > 15 && uniformRatio > 0.2) {
      score += 0.2; // 适中的额外加分
    }

    // 特别针对左上角的"AI生成"文字检测优化
    if (region.name === '左上角') {
      // 检查是否有典型的"AI生成"文字特征
      const hasTypicalWatermarkFeatures =
        textRatio > 0.1 &&
        textRatio < 0.4 && // 文字不应该占据整个区域
        edgeRatio > 0.05 &&
        avgContrast > 15 &&
        backgroundRatio < 0.7; // 背景不应该占据太多

      if (!hasTypicalWatermarkFeatures) {
        score *= 0.5; // 如果不符合典型特征，降低评分
      }
    }

    return Math.min(score, 1);

  } catch (e) {
    console.error('水印区域检测失败:', e);
    return 0;
  }
}

/**
 * 专门检测"AI生成"文字的函数
 * @param {CanvasRenderingContext2D} ctx - Canvas上下文
 * @param {Object} region - 检测区域
 * @returns {boolean} 是否检测到"AI生成"文字特征
 */
function detectAIGeneratedText(ctx, region) {
  try {
    const imageData = ctx.getImageData(region.x, region.y, region.w, region.h);
    const pixels = imageData.data;

    // "AI生成"文字的典型特征：
    // 1. 半透明灰色或白色文字
    // 2. 位于左上角
    // 3. 文字区域相对较小
    // 4. 有明显的文字边缘

    let grayishPixels = 0;
    let edgePixels = 0;
    let totalPixels = 0;
    let textRegionPixels = 0;

    for (let y = 1; y < region.h - 1; y++) {
      for (let x = 1; x < region.w - 1; x++) {
        const idx = (y * region.w + x) * 4;
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        const alpha = pixels[idx + 3];

        if (alpha < 50) continue;
        totalPixels++;

        // 检查是否为灰色调（"AI生成"通常是灰色）
        const colorDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(b - r));
        const brightness = (r + g + b) / 3;

        if (colorDiff < 20 && brightness > 100 && brightness < 200) {
          grayishPixels++;
        }

        // 检查文字边缘
        const neighbors = [
          pixels[((y-1) * region.w + x) * 4],
          pixels[((y+1) * region.w + x) * 4],
          pixels[(y * region.w + (x-1)) * 4],
          pixels[(y * region.w + (x+1)) * 4]
        ];

        const avgNeighborBrightness = neighbors.reduce((sum, val) => sum + val, 0) / neighbors.length;
        const contrast = Math.abs(brightness - avgNeighborBrightness);

        if (contrast > 30) {
          edgePixels++;
        }

        // 检查是否在可能的文字区域（左上角的特定位置）
        if (x > region.w * 0.1 && x < region.w * 0.9 && y > region.h * 0.2 && y < region.h * 0.8) {
          textRegionPixels++;
        }
      }
    }

    if (totalPixels === 0) return false;

    const grayRatio = grayishPixels / totalPixels;
    const edgeRatio = edgePixels / totalPixels;
    const textRegionRatio = textRegionPixels / totalPixels;

    // "AI生成"文字的判断条件 - 更严格的检测
    const hasAITextFeatures =
      grayRatio > 0.08 &&       // 有一定比例的灰色像素
      grayRatio < 0.4 &&        // 但不是全部都是灰色
      edgeRatio > 0.03 &&       // 有文字边缘
      edgeRatio < 0.25 &&       // 但边缘不会太多
      textRegionRatio > 0.25 && // 主要集中在文字区域
      totalPixels > 100;        // 确保有足够的像素进行分析

    return hasAITextFeatures;

  } catch (e) {
    console.error('AI生成文字检测失败:', e);
    return false;
  }
}

/**
 * 对指定区域进行水印去除处理
 * @param {CanvasRenderingContext2D} ctx - Canvas上下文
 * @param {Object} region - 要处理的区域 {x, y, w, h}
 */
function removeWatermarkFromRegion(ctx, region) {
  try {
    // 使用多次迭代的增强型水印去除算法
    const ITERATIONS = 3; // 增加到3次迭代，确保彻底去除
    const KERNEL_SIZE = 11; // 使用11x11邻域，对文字去除效果更好
    
    for (let iteration = 0; iteration < ITERATIONS; iteration++) {
      console.log(`🔄 第${iteration + 1}次迭代处理区域 (${region.x}, ${region.y}, ${region.w}x${region.h})`);
      
      const imageData = ctx.getImageData(region.x, region.y, region.w, region.h);
      const pixels = imageData.data;
      
      const KERNEL_HALF = Math.floor(KERNEL_SIZE / 2);
      const getIndex = (x, y) => (y * region.w + x) * 4;

      const newPixelsData = new Uint8ClampedArray(pixels.length);

      for (let y = 0; y < region.h; y++) {
        for (let x = 0; x < region.w; x++) {
          const r_neighbors = [];
          const g_neighbors = [];
          const b_neighbors = [];

          // 收集邻域像素 - 使用更大的邻域
          for (let ky = -KERNEL_HALF; ky <= KERNEL_HALF; ky++) {
            for (let kx = -KERNEL_HALF; kx <= KERNEL_HALF; kx++) {
              const nx = x + kx;
              const ny = y + ky;
              if (nx >= 0 && nx < region.w && ny >= 0 && ny < region.h) {
                const neighborIndex = getIndex(nx, ny);
                r_neighbors.push(pixels[neighborIndex]);
                g_neighbors.push(pixels[neighborIndex + 1]);
                b_neighbors.push(pixels[neighborIndex + 2]);
              }
            }
          }
          
          if (r_neighbors.length === 0) continue;
          
          // 计算中值
          r_neighbors.sort((a, b) => a - b);
          g_neighbors.sort((a, b) => a - b);
          b_neighbors.sort((a, b) => a - b);
          
          const medianIndex = Math.floor(r_neighbors.length / 2);
          const currentIndex = getIndex(x, y);

          // 应用中值滤波结果
          newPixelsData[currentIndex] = r_neighbors[medianIndex];
          newPixelsData[currentIndex + 1] = g_neighbors[medianIndex];
          newPixelsData[currentIndex + 2] = b_neighbors[medianIndex];
          newPixelsData[currentIndex + 3] = pixels[currentIndex + 3]; // 保持alpha通道
        }
      }

      // 将处理后的像素数据写回canvas
      imageData.data.set(newPixelsData);
      ctx.putImageData(imageData, region.x, region.y);
    }
    
    console.log(`✅ 区域 (${region.x}, ${region.y}, ${region.w}x${region.h}) 水印去除完成 (${ITERATIONS}次迭代)`);

  } catch (e) {
    console.error(`❌ 区域水印去除失败:`, e);
    // 降级方案：智能填充
    fillRegionWithSmartColor(ctx, region);
  }
}

/**
 * 增强型水印去除 - 专门针对左上角"AI生成"文字
 */
function removeWatermarkFromRegionEnhanced(ctx, region) {
  try {
    console.log(`🔥 使用增强型算法处理左上角"AI生成"文字`);
    // showDebugMessage(`🔥 使用增强型算法处理左上角"AI生成"文字`); // 开发调试用，部署前注释掉

    // 第一步：使用优化的参数，平衡去除效果和自然度
    const ITERATIONS = 4; // 4次迭代，配合改进的算法
    const KERNEL_SIZE = 13; // 13x13核心，配合边缘柔化
    
    for (let iteration = 0; iteration < ITERATIONS; iteration++) {
      console.log(`🔄 增强处理第${iteration + 1}次迭代`);
      
      const imageData = ctx.getImageData(region.x, region.y, region.w, region.h);
      const pixels = imageData.data;
      
      const KERNEL_HALF = Math.floor(KERNEL_SIZE / 2);
      const getIndex = (x, y) => (y * region.w + x) * 4;
      const newPixelsData = new Uint8ClampedArray(pixels.length);

      for (let y = 0; y < region.h; y++) {
        for (let x = 0; x < region.w; x++) {
          const r_neighbors = [];
          const g_neighbors = [];
          const b_neighbors = [];

          // 收集邻域像素
          for (let ky = -KERNEL_HALF; ky <= KERNEL_HALF; ky++) {
            for (let kx = -KERNEL_HALF; kx <= KERNEL_HALF; kx++) {
              const nx = x + kx;
              const ny = y + ky;
              if (nx >= 0 && nx < region.w && ny >= 0 && ny < region.h) {
                const neighborIndex = getIndex(nx, ny);
                r_neighbors.push(pixels[neighborIndex]);
                g_neighbors.push(pixels[neighborIndex + 1]);
                b_neighbors.push(pixels[neighborIndex + 2]);
              }
            }
          }
          
          if (r_neighbors.length === 0) continue;
          
          // 使用改进的自然滤波策略
          r_neighbors.sort((a, b) => a - b);
          g_neighbors.sort((a, b) => a - b);
          b_neighbors.sort((a, b) => a - b);

          // 混合中值和加权平均，让效果更自然
          const medianIndex = Math.floor(r_neighbors.length / 2);
          const currentIndex = getIndex(x, y);

          // 获取当前像素值
          const currentR = pixels[currentIndex];
          const currentG = pixels[currentIndex + 1];
          const currentB = pixels[currentIndex + 2];

          // 计算中值
          const medianR = r_neighbors[medianIndex];
          const medianG = g_neighbors[medianIndex];
          const medianB = b_neighbors[medianIndex];

          // 计算加权平均（给边缘像素更高权重）
          const avgR = r_neighbors.reduce((sum, val) => sum + val, 0) / r_neighbors.length;
          const avgG = g_neighbors.reduce((sum, val) => sum + val, 0) / g_neighbors.length;
          const avgB = b_neighbors.reduce((sum, val) => sum + val, 0) / b_neighbors.length;

          // 根据位置调整混合比例（边缘区域更保守）
          const edgeDistance = Math.min(x, y, region.w - x - 1, region.h - y - 1);
          const edgeFactor = Math.min(1, edgeDistance / 5); // 边缘5像素内更保守

          // 混合中值和平均值，边缘区域更多使用平均值
          const blendFactor = 0.6 + (1 - edgeFactor) * 0.3; // 边缘区域0.9，中心区域0.6

          newPixelsData[currentIndex] = Math.round(medianR * blendFactor + avgR * (1 - blendFactor));
          newPixelsData[currentIndex + 1] = Math.round(medianG * blendFactor + avgG * (1 - blendFactor));
          newPixelsData[currentIndex + 2] = Math.round(medianB * blendFactor + avgB * (1 - blendFactor));
          newPixelsData[currentIndex + 3] = pixels[currentIndex + 3];
        }
      }

      imageData.data.set(newPixelsData);
      ctx.putImageData(imageData, region.x, region.y);
    }
    
    // 第二步：自然边界处理，打破矩形感
    console.log(`🎨 进行自然边界处理...`);
    // showDebugMessage(`🎨 进行自然边界处理...`); // 开发调试用，部署前注释掉

    const imageData = ctx.getImageData(region.x, region.y, region.w, region.h);
    const pixels = imageData.data;
    const newPixelsData = new Uint8ClampedArray(pixels);

    // 创建不规则的处理强度图
    for (let y = 0; y < region.h; y++) {
      for (let x = 0; x < region.w; x++) {
        const idx = (y * region.w + x) * 4;

        // 计算到各边的距离
        const distToLeft = x;
        const distToTop = y;
        const distToRight = region.w - x - 1;
        const distToBottom = region.h - y - 1;
        const minDist = Math.min(distToLeft, distToTop, distToRight, distToBottom);

        // 添加噪声让边界不规则
        const noiseX = Math.sin(x * 0.3 + y * 0.2) * 3;
        const noiseY = Math.cos(x * 0.2 + y * 0.3) * 3;
        const adjustedDist = minDist + noiseX + noiseY;

        // 计算处理强度（中心强，边缘弱，带噪声）
        const maxFadeDistance = 15; // 渐变距离
        let intensity = 1.0;

        if (adjustedDist < maxFadeDistance) {
          // 使用平滑的渐变函数
          const normalizedDist = Math.max(0, adjustedDist) / maxFadeDistance;
          intensity = normalizedDist * normalizedDist * (3 - 2 * normalizedDist); // 平滑步函数

          // 添加随机变化让过渡更自然
          const randomFactor = 0.8 + Math.random() * 0.4; // 0.8-1.2
          intensity *= randomFactor;
          intensity = Math.max(0, Math.min(1, intensity));
        }

        // 只对需要处理的像素进行混合
        if (intensity < 0.95) {
          // 获取周围像素的加权平均
          let avgR = 0, avgG = 0, avgB = 0, totalWeight = 0;
          const sampleRadius = 4;

          for (let dy = -sampleRadius; dy <= sampleRadius; dy++) {
            for (let dx = -sampleRadius; dx <= sampleRadius; dx++) {
              const nx = x + dx, ny = y + dy;
              if (nx >= 0 && nx < region.w && ny >= 0 && ny < region.h) {
                const distance = Math.sqrt(dx * dx + dy * dy);
                const weight = Math.exp(-distance / 2); // 高斯权重

                const nIdx = (ny * region.w + nx) * 4;
                avgR += pixels[nIdx] * weight;
                avgG += pixels[nIdx + 1] * weight;
                avgB += pixels[nIdx + 2] * weight;
                totalWeight += weight;
              }
            }
          }

          if (totalWeight > 0) {
            avgR /= totalWeight;
            avgG /= totalWeight;
            avgB /= totalWeight;

            // 根据强度混合原始像素和平均值
            newPixelsData[idx] = Math.round(pixels[idx] * intensity + avgR * (1 - intensity));
            newPixelsData[idx + 1] = Math.round(pixels[idx + 1] * intensity + avgG * (1 - intensity));
            newPixelsData[idx + 2] = Math.round(pixels[idx + 2] * intensity + avgB * (1 - intensity));
          }
        }
      }
    }

    imageData.data.set(newPixelsData);
    ctx.putImageData(imageData, region.x, region.y);

    console.log(`✅ 自然边界处理完成`);
    // showDebugMessage(`✅ 自然边界处理完成`); // 开发调试用，部署前注释掉

    console.log(`✅ 增强型处理完成 (${ITERATIONS}次迭代 + 自然边界)`);

  } catch (e) {
    console.error(`❌ 增强型水印去除失败:`, e);
    // 降级到普通处理
    removeWatermarkFromRegion(ctx, region);
  }
}

/**
 * 分析区域是否还有残留水印
 */
function analyzeRegionForRemainingWatermark(ctx, region) {
  try {
    const imageData = ctx.getImageData(region.x, region.y, region.w, region.h);
    const pixels = imageData.data;
    
    let textLikePixels = 0;
    let totalPixels = 0;
    
    for (let y = 1; y < region.h - 1; y++) {
      for (let x = 1; x < region.w - 1; x++) {
        const idx = (y * region.w + x) * 4;
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        const alpha = pixels[idx + 3];
        
        if (alpha < 50) continue;
        totalPixels++;
        
        const brightness = (r + g + b) / 3;
        const colorVariance = Math.abs(r - g) + Math.abs(g - b) + Math.abs(b - r);
        
        // 检查是否还有文字特征
        if (colorVariance < 40 && (brightness < 100 || brightness > 220)) {
          textLikePixels++;
        }
      }
    }
    
    return totalPixels > 0 ? textLikePixels / totalPixels : 0;
  } catch (e) {
    return 0;
  }
}

/**
 * 智能背景修复 - 使用纹理克隆和内容感知填充
 */
function fillRegionWithSmartColor(ctx, region) {
  try {
    console.log(`🎨 开始智能背景修复...`);
    
    // 使用内容感知的纹理克隆算法
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const pixels = imageData.data;
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    
    // 创建修复后的像素数据
    const repairedData = new Uint8ClampedArray(pixels);
    
    // 对水印区域的每个像素进行修复
    for (let y = region.y; y < region.y + region.h; y++) {
      for (let x = region.x; x < region.x + region.w; x++) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const repairedColor = getRepairedPixelColor(pixels, width, height, x, y, region);
          const idx = (y * width + x) * 4;
          
          repairedData[idx] = repairedColor.r;
          repairedData[idx + 1] = repairedColor.g;
          repairedData[idx + 2] = repairedColor.b;
          repairedData[idx + 3] = repairedColor.a;
        }
      }
    }
    
    // 将修复后的数据写回canvas
    const repairedImageData = new ImageData(repairedData, width, height);
    ctx.putImageData(repairedImageData, 0, 0);
    
    console.log(`✅ 智能背景修复完成`);
    
  } catch (e) {
    console.error('智能背景修复失败，使用简单修复', e);
    simpleBackgroundRepair(ctx, region);
  }
}

/**
 * 获取修复后的像素颜色 - 内容感知算法
 */
function getRepairedPixelColor(pixels, width, height, x, y, watermarkRegion) {
  const candidates = [];
  const searchRadius = 25; // 搜索半径
  
  // 在水印区域外搜索相似的像素
  for (let dy = -searchRadius; dy <= searchRadius; dy += 2) {
    for (let dx = -searchRadius; dx <= searchRadius; dx += 2) {
      const sx = x + dx;
      const sy = y + dy;
      
      // 确保搜索点在图片范围内且不在水印区域内
      if (sx >= 0 && sx < width && sy >= 0 && sy < height &&
          !isPointInRegion(sx, sy, watermarkRegion)) {
        
        const sidx = (sy * width + sx) * 4;
        const similarity = calculatePixelSimilarity(pixels, width, height, sx, sy, x, y, watermarkRegion);
        
        if (similarity > 0.3) { // 相似度阈值
          candidates.push({
            r: pixels[sidx],
            g: pixels[sidx + 1],
            b: pixels[sidx + 2],
            a: pixels[sidx + 3],
            similarity: similarity
          });
        }
      }
    }
  }
  
  if (candidates.length > 0) {
    // 按相似度排序，选择最相似的几个像素进行混合
    candidates.sort((a, b) => b.similarity - a.similarity);
    const topCandidates = candidates.slice(0, Math.min(5, candidates.length));
    
    // 加权平均
    let totalWeight = 0;
    let r = 0, g = 0, b = 0, a = 0;
    
    for (const candidate of topCandidates) {
      const weight = candidate.similarity;
      r += candidate.r * weight;
      g += candidate.g * weight;
      b += candidate.b * weight;
      a += candidate.a * weight;
      totalWeight += weight;
    }
    
    return {
      r: Math.round(r / totalWeight),
      g: Math.round(g / totalWeight),
      b: Math.round(b / totalWeight),
      a: Math.round(a / totalWeight)
    };
  }
  
  // 如果没有找到合适的候选像素，使用周围像素的平均值
  return getAverageNeighborColor(pixels, width, height, x, y, watermarkRegion);
}

/**
 * 计算像素相似度
 */
function calculatePixelSimilarity(pixels, width, height, sx, sy, tx, ty, watermarkRegion) {
  const neighborhoodSize = 3;
  let similarity = 0;
  let validComparisons = 0;
  
  // 比较邻域像素
  for (let dy = -neighborhoodSize; dy <= neighborhoodSize; dy++) {
    for (let dx = -neighborhoodSize; dx <= neighborhoodSize; dx++) {
      const sx1 = sx + dx, sy1 = sy + dy;
      const tx1 = tx + dx, ty1 = ty + dy;
      
      if (sx1 >= 0 && sx1 < width && sy1 >= 0 && sy1 < height &&
          tx1 >= 0 && tx1 < width && ty1 >= 0 && ty1 < height &&
          !isPointInRegion(sx1, sy1, watermarkRegion) &&
          !isPointInRegion(tx1, ty1, watermarkRegion)) {
        
        const sidx = (sy1 * width + sx1) * 4;
        const tidx = (ty1 * width + tx1) * 4;
        
        const dr = pixels[sidx] - pixels[tidx];
        const dg = pixels[sidx + 1] - pixels[tidx + 1];
        const db = pixels[sidx + 2] - pixels[tidx + 2];
        
        const distance = Math.sqrt(dr * dr + dg * dg + db * db);
        similarity += Math.max(0, 1 - distance / 255);
        validComparisons++;
      }
    }
  }
  
  return validComparisons > 0 ? similarity / validComparisons : 0;
}

/**
 * 获取周围像素的平均颜色
 */
function getAverageNeighborColor(pixels, width, height, x, y, watermarkRegion) {
  let r = 0, g = 0, b = 0, a = 0, count = 0;
  const radius = 8;
  
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height &&
          !isPointInRegion(nx, ny, watermarkRegion)) {
        
        const idx = (ny * width + nx) * 4;
        r += pixels[idx];
        g += pixels[idx + 1];
        b += pixels[idx + 2];
        a += pixels[idx + 3];
        count++;
      }
    }
  }
  
  if (count > 0) {
    return {
      r: Math.round(r / count),
      g: Math.round(g / count),
      b: Math.round(b / count),
      a: Math.round(a / count)
    };
  }
  
  return { r: 240, g: 240, b: 240, a: 255 }; // 默认浅灰色
}

/**
 * 检查点是否在区域内
 */
function isPointInRegion(x, y, region) {
  return x >= region.x && x < region.x + region.w &&
         y >= region.y && y < region.y + region.h;
}

/**
 * 简单背景修复 - 降级方案
 */
function simpleBackgroundRepair(ctx, region) {
  try {
    // 使用更大的采样区域
    const sampleRadius = 30;
    const samples = [];
    
    // 采样区域周围的像素（避开水印区域）
    const directions = [
      { dx: 0, dy: -sampleRadius }, // 上
      { dx: -sampleRadius, dy: 0 }, // 左
      { dx: sampleRadius, dy: 0 },  // 右
      { dx: 0, dy: sampleRadius }   // 下
    ];
    
    for (const dir of directions) {
      const sampleX = region.x + region.w / 2 + dir.dx;
      const sampleY = region.y + region.h / 2 + dir.dy;
      
      if (sampleX >= 0 && sampleX < ctx.canvas.width && 
          sampleY >= 0 && sampleY < ctx.canvas.height) {
        
        const sampleData = ctx.getImageData(sampleX, sampleY, 1, 1);
        samples.push({
          r: sampleData.data[0],
          g: sampleData.data[1],
          b: sampleData.data[2]
        });
      }
    }
    
    if (samples.length > 0) {
      // 计算加权平均（给上方和左方更高权重）
      let r = 0, g = 0, b = 0, totalWeight = 0;
      
      samples.forEach((sample, index) => {
        const weight = index < 2 ? 2 : 1; // 上方和左方权重更高
        r += sample.r * weight;
        g += sample.g * weight;
        b += sample.b * weight;
        totalWeight += weight;
      });
      
      r = Math.round(r / totalWeight);
      g = Math.round(g / totalWeight);
      b = Math.round(b / totalWeight);
      
      // 添加轻微的噪声以避免看起来太假
      r += Math.random() * 10 - 5;
      g += Math.random() * 10 - 5;
      b += Math.random() * 10 - 5;
      
      r = Math.max(0, Math.min(255, r));
      g = Math.max(0, Math.min(255, g));
      b = Math.max(0, Math.min(255, b));
      
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(region.x, region.y, region.w, region.h);
      
      console.log(`🎨 简单背景修复完成: rgb(${r}, ${g}, ${b})`);
    }
    
  } catch (e) {
    console.error('简单背景修复失败', e);
    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(region.x, region.y, region.w, region.h);
  }
}



// webp转png函数 - NOTE: This function is simplified and no longer attempts
// its own watermark removal, as that should be handled by the main flow.
async function convertWebpToPng(webpBlob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(resolve, 'image/png', 0.95);
    };
    img.onerror = () => reject(new Error('webp图片加载失败'));
    img.src = URL.createObjectURL(webpBlob);
  });
}

// 统一的下载函数
async function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  // 清理URL
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  console.log('文件下载完成:', filename);
}

// =================================================================
// NEW: Visual Debugger
// =================================================================
function showDebugMessage(message, clear = false) {
  let debugOverlay = document.getElementById('rmwatermark-debug-overlay');
  if (!debugOverlay) {
    debugOverlay = document.createElement('div');
    debugOverlay.id = 'rmwatermark-debug-overlay';
    debugOverlay.style.cssText = `
      position: fixed;
      bottom: 10px;
      left: 10px;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 15px;
      border-radius: 8px;
      z-index: 9999999 !important;
      font-family: monospace;
      font-size: 12px;
      max-width: 80%;
      max-height: 300px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-all;
      border: 1px solid #444;
    `;
    document.body.appendChild(debugOverlay);
  }
  
  const time = new Date().toLocaleTimeString();
  const content = `[${time}] ${message}<br>`;

  if (clear) {
    debugOverlay.innerHTML = content;
  } else {
    debugOverlay.innerHTML += content;
  }
  
  debugOverlay.scrollTop = debugOverlay.scrollHeight; // Auto-scroll
}

// 全局MutationObserver的防抖处理
let processTimeout;
function debouncedProcessPage() {
  clearTimeout(processTimeout);
  processTimeout = setTimeout(() => {
    const siteName = getSiteName(getCurrentSiteType());
    console.log(`${siteName}页面发生变化，检查和清理按钮...`);
    addDownloadButton();
  }, 500); // 500ms debounce
}

// 延迟执行，确保页面加载完毕
setTimeout(debouncedProcessPage, 1500);

// 启动MutationObserver
const observer = new MutationObserver(debouncedProcessPage);
observer.observe(document.body, { 
  childList: true, 
  subtree: true,
  attributes: true, // Watch for attribute changes
  attributeFilter: ['src'] // Specifically watch for changes to the 'src' attribute
});

console.log('通用去水印脚本设置完成！');