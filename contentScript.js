// 调试：确认脚本是否加载
console.log('通用去水印插件已加载！当前网站:', window.location.hostname);

// 防止重复处理的全局集合
const processedImages = new WeakSet();
// 按钮管理映射：图片URL -> 按钮元素
const buttonMap = new Map();

// 检测当前网站类型
function getCurrentSiteType() {
  const hostname = window.location.hostname;
  if (hostname.includes('doubao.com')) return 'doubao';
  if (hostname.includes('jimeng.jianying.com')) return 'jimeng';
  return 'unknown';
}

// 根据网站类型获取图片选择器
function getImageSelector(siteType) {
  switch (siteType) {
    case 'doubao':
      return 'img[data-testid="in_painting_picture"]';
    case 'jimeng':
      return 'img[data-apm-action="record-detail-image-detail-image-container"], img.image-ArSTaO';
    default:
      return 'img';
  }
}

// 根据网站类型获取网站名称
function getSiteName(siteType) {
  switch (siteType) {
    case 'doubao': return '豆包';
    case 'jimeng': return '即梦';
    default: return '未知';
  }
}

// 智能检测是否为大图模式（优化版）
function isLargeImageMode(img, siteType) {
  const rect = img.getBoundingClientRect();
  console.log(`${getSiteName(siteType)}图片尺寸信息:`, {
    width: rect.width,
    height: rect.height,
    src: img.src.substring(0, 100) + '...'
  });
  
  // 即梦特殊判断：必须在弹窗/模态框中
  if (siteType === 'jimeng') {
    // 检查是否在弹窗中（通常有fixed定位的父容器）
    const isInModal = img.closest('[style*="position: fixed"], [class*="modal"], [class*="dialog"], [class*="overlay"]');
    const isInFullscreen = img.closest('[style*="z-index"]');
    
    console.log('即梦图片容器检查:', {
      isInModal: !!isInModal,
      isInFullscreen: !!isInFullscreen,
      parentClasses: img.parentElement?.className,
      grandParentClasses: img.parentElement?.parentElement?.className
    });
    
    // 只有在模态框中且尺寸较大时才认为是大图
    if (!isInModal && !isInFullscreen) {
      console.log('❌ 即梦图片不在模态框中，跳过');
      return false;
    }
    
    // 即梦大图的最小尺寸要求更高
    if (rect.width < 400 || rect.height < 400) {
      console.log('❌ 即梦图片尺寸太小，不是大图模式');
      return false;
    }
  } else {
    // 豆包的判断逻辑
    if (rect.width < 300) {
      console.log('❌ 不是大图模式');
      return false;
    }
  }
  
  console.log('✅ 判断为大图模式');
  return true;
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
      
      // 同时从processedImages中移除（如果图片还存在的话）
      if (correspondingImg) {
        processedImages.delete(correspondingImg);
      }
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
    // 使用WeakSet检查是否已处理，避免重复
    if (processedImages.has(img)) {
      return;
    }
    
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
    
    // 标记为已处理
    processedImages.add(img);
    
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
    btn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log(`开始下载${siteName}去水印图片`);
      
      // 更新按钮状态
      const originalHTML = btn.innerHTML;
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z">
            <animateTransform attributeName="transform" attributeType="XML" type="rotate"
              from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
          </path>
        </svg>
        处理中...
      `;
      btn.style.background = 'linear-gradient(135deg, #ffa726 0%, #fb8c00 100%)';
      
      // 执行去水印下载
      downloadImageWithWatermarkRemoval(img.src, siteType)
        .then(() => {
          btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
            </svg>
            下载成功
          `;
          btn.style.background = 'linear-gradient(135deg, #66bb6a 0%, #43a047 100%)';
        })
        .catch((err) => {
          console.error('下载失败:', err);
          btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
            </svg>
            下载失败
          `;
          btn.style.background = 'linear-gradient(135deg, #ef5350 0%, #e53935 100%)';
        })
        .finally(() => {
          // 2秒后恢复原状
          setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.background = buttonGradient;
          }, 2000);
        });
    };
    
    // 添加按钮到body（不影响原DOM结构）
    document.body.appendChild(btn);
    console.log(`✅ ${siteName}优雅按钮已添加！`);
  });
}

// 去水印下载函数（使用Canvas处理）
async function downloadImageWithWatermarkRemoval(imgUrl, siteType) {
  const siteName = getSiteName(siteType);
  console.log(`开始处理${siteName}图片:`, imgUrl);
  
  // 对于即梦，由于跨域限制严格，优先尝试直接下载
  if (siteType === 'jimeng') {
    console.log('即梦图片，尝试直接下载原图...');
    try {
      const response = await fetch(imgUrl);
      if (!response.ok) throw new Error('网络请求失败');
      
      const blob = await response.blob();
      console.log('即梦原图下载成功，大小:', blob.size, 'bytes', '格式:', blob.type);
      
      // 如果是webp格式，尝试转换为png
      if (blob.type.includes('webp')) {
        console.log('检测到webp格式，尝试转换为png...');
        try {
          const processedBlob = await convertWebpToPng(blob);
          await downloadBlob(processedBlob, `${siteName}图片_去水印_${Date.now()}.png`);
          return;
        } catch (convertError) {
          console.log('webp转换失败，下载原图:', convertError.message);
          // 转换失败则下载原图
        }
      }
      
      // 下载原图
      const extension = blob.type.split('/')[1] || 'png';
      await downloadBlob(blob, `${siteName}图片_${Date.now()}.${extension}`);
      return;
      
    } catch (fetchError) {
      console.error('即梦图片直接下载失败:', fetchError);
      // 继续尝试Canvas方法
    }
  }
  
  // Canvas方法（豆包或即梦备用）
  try {
    console.log('尝试Canvas处理...');
    
    // 创建图片对象
    const img = new Image();
    
    // 处理跨域问题
    if (siteType === 'jimeng') {
      // 即梦图片不设置crossOrigin，避免跨域问题
      console.log('即梦图片，不设置crossOrigin');
    } else {
      img.crossOrigin = 'anonymous';
    }
    
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
      img.src = imgUrl;
    });
    
    // 创建Canvas
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    
    // 设置Canvas背景为白色
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制原图
    try {
      ctx.drawImage(img, 0, 0);
      console.log('图片已绘制到Canvas');
      
      // 检查Canvas是否被污染
      try {
        ctx.getImageData(0, 0, 1, 1);
        console.log('Canvas未被污染，可以处理');
      } catch (e) {
        console.error('Canvas被污染，无法读取像素数据:', e);
        throw new Error('Canvas被污染');
      }
      
    } catch (e) {
      console.error('Canvas绘制失败:', e);
      throw new Error('Canvas绘制失败');
    }
    
    // 根据网站类型使用不同的去水印策略
    let wmWidth, wmHeight, wmX, wmY;
    
    if (siteType === 'doubao') {
      // 豆包：右下角15%区域
      wmWidth = Math.floor(img.width * 0.15);
      wmHeight = Math.floor(img.height * 0.15);
      wmX = img.width - wmWidth;
      wmY = img.height - wmHeight;
    } else if (siteType === 'jimeng') {
      // 即梦：右下角12%区域（通常水印较小）
      wmWidth = Math.floor(img.width * 0.12);
      wmHeight = Math.floor(img.height * 0.12);
      wmX = img.width - wmWidth;
      wmY = img.height - wmHeight;
    }
    
    // 用左侧像素覆盖水印区域
    if (wmX > 0 && wmY > 0) {
      try {
        const fillData = ctx.getImageData(Math.max(0, wmX - 5), wmY, 5, wmHeight);
        for (let x = 0; x < wmWidth; x += 5) {
          ctx.putImageData(fillData, wmX + x, wmY);
        }
        console.log('水印去除完成');
      } catch (e) {
        console.error('去水印处理失败:', e);
        // 如果去水印失败，至少保证原图能下载
      }
    }
    
    // 转换为Blob并下载
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas转Blob失败'));
          return;
        }
        
        console.log('Canvas处理成功，Blob大小:', blob.size, 'bytes');
        downloadBlob(blob, `${siteName}图片_去水印_${Date.now()}.png`);
        resolve();
      }, 'image/png', 0.95);
    });
    
  } catch (error) {
    console.error(`Canvas处理${siteName}图片失败:`, error);
    
    // 最后的降级方案：直接下载原图
    console.log('使用最终降级方案：直接下载原图...');
    try {
      const response = await fetch(imgUrl);
      const blob = await response.blob();
      const extension = blob.type.split('/')[1] || 'png';
      await downloadBlob(blob, `${siteName}图片_原图_${Date.now()}.${extension}`);
      console.log('降级下载成功');
    } catch (fallbackError) {
      console.error('所有下载方案都失败:', fallbackError);
      throw new Error('图片下载失败');
    }
  }
}

// webp转png函数
async function convertWebpToPng(webpBlob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      // 白色背景
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // 绘制图片
      ctx.drawImage(img, 0, 0);
      
      // 简单去水印（右下角12%区域）
      const wmWidth = Math.floor(img.width * 0.12);
      const wmHeight = Math.floor(img.height * 0.12);
      const wmX = img.width - wmWidth;
      const wmY = img.height - wmHeight;
      
      if (wmX > 0 && wmY > 0) {
        try {
          const fillData = ctx.getImageData(Math.max(0, wmX - 5), wmY, 5, wmHeight);
          for (let x = 0; x < wmWidth; x += 5) {
            ctx.putImageData(fillData, wmX + x, wmY);
          }
          console.log('webp图片去水印完成');
        } catch (e) {
          console.log('webp去水印失败，保留原图:', e.message);
        }
      }
      
      canvas.toBlob((blob) => {
        if (blob) {
          console.log('webp转png成功');
          resolve(blob);
        } else {
          reject(new Error('webp转png失败'));
        }
      }, 'image/png', 0.95);
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

// 延迟执行，确保页面加载完毕
setTimeout(() => {
  const siteName = getSiteName(getCurrentSiteType());
  console.log(`开始执行${siteName}主函数...`);
  addDownloadButton();
}, 1500);

// 优化的MutationObserver
let observerTimeout;
const observer = new MutationObserver(() => {
  // 使用防抖，避免频繁触发
  clearTimeout(observerTimeout);
  observerTimeout = setTimeout(() => {
    const siteName = getSiteName(getCurrentSiteType());
    console.log(`${siteName}页面发生变化，检查和清理按钮...`);
    addDownloadButton(); // 这个函数内部会先调用cleanupInvalidButtons()
  }, 1000); // 增加延迟到1秒
});

observer.observe(document.body, { 
  childList: true, 
  subtree: true 
});

console.log('通用去水印脚本设置完成！'); 