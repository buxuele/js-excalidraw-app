import React, { useState, useEffect } from 'react';
import { exportToBlob } from '@excalidraw/excalidraw';
import { db } from './db';
import { generateRandomName } from './utils/nameGenerator';
import './App.css';

const ContextMenu = ({ x, y, page, onRename, onDelete, onClose }) => {
  useEffect(() => {
    const handleClickOutside = () => onClose();
    // 使用 mousedown 可以比 click 更早捕获事件，防止意外触发
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div className="context-menu" style={{ top: y, left: x }} onClick={(e) => e.stopPropagation()}>
      <button className="context-menu-item" onClick={() => { onRename(page); onClose(); }}>重命名</button>
      <button
        className="context-menu-item delete"
        onClick={() => {
          // 只调用 onDelete，关闭菜单的逻辑由 HomePage 的主函数负责
          onDelete(page.id);
        }}>
        删除页面
      </button>
    </div>
  );
};

const ProjectThumbnail = ({ pageData }) => {
  const [thumbnail, setThumbnail] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (pageData.thumbnail || !pageData.data || pageData.data.length === 0 || isGenerating) {
      if (pageData.thumbnail) setThumbnail(pageData.thumbnail);
      return;
    }

    const generate = async () => {
      setIsGenerating(true);
      try {
        const blob = await exportToBlob({
          elements: pageData.data,
          appState: { exportBackground: true, viewBackgroundColor: '#ffffff' },
          files: null, mimeType: 'image/png', quality: 0.5, width: 280, height: 180,
        });

        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result;
          db.upsertPage({ ...pageData, thumbnail: base64data });
          setThumbnail(base64data);
          setIsGenerating(false);
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        console.error("生成缩略图失败:", error);
        setIsGenerating(false);
      }
    };

    generate();
  }, [pageData, isGenerating]);

  if (thumbnail) {
    return <img src={thumbnail} alt={pageData.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
  }
  return <div style={{ color: '#aaa' }}>{isGenerating ? '生成中...' : '没有预览图'}</div>;
};

const ProjectCard = ({ page, ...props }) => {
  return (
    <div className="project-card" onContextMenu={(e) => props.onContextMenu(e, page)}>
      <div className="card-thumbnail" onClick={() => props.onSelect(page.id)}>
        <ProjectThumbnail pageData={page} />
      </div>
      <div className="card-info">
        {props.renamingPageId === page.id ? (
          <input type="text" className="rename-input-card" value={props.renameInputValue} onChange={(e) => props.setRenameInputValue(e.target.value)} onBlur={() => props.onRenameSubmit()} onKeyDown={(e) => { if (e.key === 'Enter') props.onRenameSubmit(); else if (e.key === 'Escape') props.onRenameSubmit(true); }} onClick={(e) => e.stopPropagation()} autoFocus />
        ) : (
          <span className="page-name" onClick={() => props.onSelect(page.id)}>{page.name}</span>
        )}
      </div>
    </div>
  );
};

function HomePage({ onNavigateToPage }) {
  const [pages, setPages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, page: null });
  const [renamingPageId, setRenamingPageId] = useState(null);
  const [renameInputValue, setRenameInputValue] = useState('');

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    setIsLoading(true);
    let dbPages = await db.getAllPages();
    dbPages.sort((a, b) => b.id.localeCompare(a.id));
    setPages(dbPages);
    setIsLoading(false);
  };

  const handleAddNewPage = async () => {
    const newPage = { id: `page-${Date.now()}`, name: generateRandomName(), data: [], thumbnail: null };
    await db.upsertPage(newPage);
    onNavigateToPage(newPage.id);
  };

  // --- 关键修改：重写删除逻辑 ---
  const handleDeletePage = async (pageId) => {
    // 1. 立即关闭右键菜单，防止任何误触
    setContextMenu({ visible: false, x: 0, y: 0, page: null });

    // 2. 使用 setTimeout 将 confirm 推迟到下一个事件循环
    //    这能确保 React 有时间渲染菜单消失的状态，避免事件冲突
    setTimeout(() => {
      if (window.confirm("你确定要删除这个绘图吗？此操作不可撤销。")) {
        // 3. 异步执行删除
        const deleteInDb = async () => {
          await db.deletePage(pageId);
          // 4. 直接从 state 中移除，UI 响应更迅速，体验更好
          setPages(prevPages => prevPages.filter(p => p.id !== pageId));
        }
        deleteInDb();
      }
    }, 50); // 50ms 延迟足够让UI更新
  };

  const handleContextMenu = (e, page) => {
    e.preventDefault();
    e.stopPropagation();
    setRenamingPageId(null);
    setContextMenu({ visible: true, x: e.pageX, y: e.pageY, page: page });
  };

  const startRename = (page) => {
    setRenamingPageId(page.id);
    setRenameInputValue(page.name);
  };

  const handleRenameSubmit = async (isCancel = false) => {
    if (!renamingPageId) return;
    if (!isCancel) {
      const finalName = renameInputValue.trim() || "未命名草稿";
      const pageToUpdate = pages.find(p => p.id === renamingPageId);
      if (pageToUpdate && pageToUpdate.name !== finalName) {
        const updatedPage = { ...pageToUpdate, name: finalName };
        await db.upsertPage(updatedPage);
        setPages(pages.map(p => p.id === renamingPageId ? updatedPage : p));
      }
    }
    setRenamingPageId(null);
  };

  if (isLoading) return <div>正在加载作品集...</div>;

  return (
    <div className="home-page-container">
      <h1>我的作品集</h1>
      <div className="projects-grid">
        <div className="project-card new-project-card" onClick={handleAddNewPage}>
          <div className="plus-icon">+</div>
        </div>
        {pages.map(page => (
          <ProjectCard
            key={page.id}
            page={page}
            onSelect={onNavigateToPage}
            onContextMenu={handleContextMenu}
            onRenameSubmit={handleRenameSubmit}
            renamingPageId={renamingPageId}
            setRenameInputValue={setRenameInputValue}
            renameInputValue={renameInputValue}
          />
        ))}
      </div>
      {contextMenu.visible && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          page={contextMenu.page}
          onRename={startRename}
          onDelete={handleDeletePage} // 直接传递新的 handleDeletePage 函数
          onClose={() => setContextMenu({ ...contextMenu, visible: false })}
        />
      )}
    </div>
  );
}

export default HomePage;