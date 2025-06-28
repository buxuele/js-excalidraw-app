import { useState, useEffect, useCallback } from 'react';
import { Excalidraw } from "@excalidraw/excalidraw";
import debounce from 'lodash.debounce';

import '@excalidraw/excalidraw/index.css';
import './App.css';
import { db } from './db';

const BackToHomeButton = ({ onClick }) => (
  <button
    onClick={onClick}
    style={{
      position: 'absolute',
      top: '12px',
      left: '80px', // 按钮向右移动，避免遮挡
      zIndex: 100,
      background: 'rgba(240, 240, 240, 0.9)',
      border: '1px solid #ccc',
      padding: '8px 12px',
      borderRadius: '8px',
      cursor: 'pointer',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    }}
  >
    ← 返回主页
  </button>
);

function EditorPage({ pageId, onBack }) {
  const [page, setPage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPageData = async () => {
      if (!pageId) return;
      setIsLoading(true);
      const pageData = await db.getPageById(pageId);
      setPage(pageData);
      setIsLoading(false);
    };
    loadPageData();
  }, [pageId]);

  // --- 关键简化：onChange 只负责一件事，就是把最新的绘图数据存进数据库 ---
  const handleDrawingChange = useCallback(
    debounce(async (elements) => {
      // 从数据库获取最新的页面数据，以防 name 等字段丢失
      const currentPage = await db.getPageById(pageId);
      if (currentPage) {
        const updatedPage = { ...currentPage, data: elements };
        await db.upsertPage(updatedPage);
      }
    }, 500),
    [pageId] // 依赖项只有 pageId
  );
  
  // --- 关键简化：返回按钮现在只负责返回 ---
  const handleBack = () => {
    // 强制执行最后一次保存
    handleDrawingChange.flush();
    onBack();
  };

  if (isLoading) return <div>正在加载绘图...</div>;
  if (!page) return <div>错误：找不到页面数据。</div>;

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <BackToHomeButton onClick={handleBack} />
      <div className="excalidraw-wrapper">
        <Excalidraw
          key={page.id}
          initialData={{ elements: page.data }}
          onChange={handleDrawingChange}
        />
      </div>
    </div>
  );
}

export default EditorPage;