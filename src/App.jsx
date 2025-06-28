import React, { useState, useEffect, useCallback } from 'react';
import { Excalidraw } from "@excalidraw/excalidraw";
import debounce from 'lodash.debounce';

import '@excalidraw/excalidraw/index.css';
import './App.css'; 
import { db } from './db';

// 右键菜单组件（已简化，移除 history 相关功能）
const ContextMenu = ({ x, y, pageId, onRename, onDelete, onClose }) => {
  useEffect(() => {
    const handleClickOutside = () => onClose();
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  return (
    <div className="context-menu" style={{ top: y, left: x }}>
      <button className="context-menu-item" onClick={() => { onRename(); onClose(); }}>重命名</button>
      <button className="context-menu-item delete" onClick={() => { onDelete(pageId); onClose(); }}>删除页面</button>
    </div>
  );
};

// 全新的、保证能用的侧边栏开关 SVG 图标
// const SidebarToggleIcon = () => (
//   <svg fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M15.79 15.79a.75.75 0 01-1.06 0l-4.24-4.24a.75.75 0 010-1.06l4.24-4.24a.75.75 0 111.06 1.06L12.31 12l3.48 3.47a.75.75 0 010 1.06zM7.25 4.25a.75.75 0 000 1.5h3.5a.75.75 0 000-1.5h-3.5z" clipRule="evenodd"></path></svg>
// );

const SidebarToggleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M15.79 15.79a.75.75 0 01-1.06 0l-4.24-4.24a.75.75 0 010-1.06l4.24-4.24a.75.75 0 111.06 1.06L12.31 12l3.48 3.47a.75.75 0 010 1.06zM7.25 4.25a.75.75 0 000 1.5h3.5a.75.75 0 000-1.5h-3.5z" clipRule="evenodd" />
  </svg>
);


function App() {
  const [pages, setPages] = useState([]);
  const [activePageId, setActivePageId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [renamingPageId, setRenamingPageId] = useState(null);
  const [renameInputValue, setRenameInputValue] = useState('');
  const [contextMenu, setContextMenu] = useState({ visible: false });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // 从数据库加载
  useEffect(() => {
    const loadDataFromDB = async () => {
      setIsLoading(true);
      let dbPages = await db.getAllPages();
      dbPages.sort((a, b) => b.id.localeCompare(a.id));

      if (dbPages.length === 0) {
        const initialPage = { id: `page-${Date.now()}`, name: '我的第一个草稿', data: [] };
        await db.upsertPage(initialPage);
        setPages([initialPage]);
        setActivePageId(initialPage.id);
      } else {
        setPages(dbPages);
        setActivePageId(dbPages[0]?.id || null);
      }
      setIsLoading(false);
    };
    loadDataFromDB();
  }, []);

  // 简化：绘图时，找到当前页面，更新 data，然后整个存回去
  const handleDrawingChange = useCallback(
    debounce(async (elements) => {
      if (!activePageId) return;
      
      setPages(currentPages => {
        const pageToUpdate = currentPages.find(p => p.id === activePageId);
        if (pageToUpdate) {
          const updatedPage = { ...pageToUpdate, data: elements };
          db.upsertPage(updatedPage); // 异步保存，不阻塞 UI
        }
        // 不需要返回新数组，因为绘图不改变 pages 列表本身
        return currentPages;
      });
    }, 500), // 恢复到 500ms
    [activePageId]
  );
  
  // 简化：新建页面时，不再需要 history 字段
  const handleAddPage = async () => {
    const newPage = { id: `page-${Date.now()}`, name: `新草稿`, data: [] };
    setPages(currentPages => [newPage, ...currentPages]);
    setActivePageId(newPage.id);
    await db.upsertPage(newPage);
  };
  
  // 重命名和删除相关的函数保持不变...
  const startRename = (page) => { setContextMenu({ visible: false }); setRenamingPageId(page.id); setRenameInputValue(page.name); };
  const handleRenameSubmit = async () => { if (!renamingPageId) return; const finalName = renameInputValue.trim() || "未命名草稿"; const pageToUpdate = pages.find(p => p.id === renamingPageId); const updatedPage = { ...pageToUpdate, name: finalName }; setPages(pages.map(p => (p.id === renamingPageId ? updatedPage : p))); await db.upsertPage(updatedPage); setRenamingPageId(null); };
  const handleRenameKeyDown = (event) => { if (event.key === 'Enter') handleRenameSubmit(); else if (event.key === 'Escape') setRenamingPageId(null); };
  const handleDeletePage = async (pageIdToDelete) => { if (!window.confirm("确定要永久删除这个页面吗？此操作无法撤销。")) return; await db.deletePage(pageIdToDelete); const newPages = pages.filter(p => p.id !== pageIdToDelete); setPages(newPages); if (activePageId === pageIdToDelete) setActivePageId(newPages[0]?.id || null); };
  const handleContextMenu = (event, pageId) => { event.preventDefault(); setRenamingPageId(null); setContextMenu({ visible: true, x: event.pageX, y: event.pageY, pageId: pageId }); };
  
  const activePage = pages.find(p => p.id === activePageId);

  const ToggleButton = ({ isFloating = false }) => (
    <button className={`sidebar-toggle-button ${isFloating ? 'floating' : ''}`} onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
      <SidebarToggleIcon />
    </button>
  );

  if (isLoading) return <div>正在加载...</div>;

  return (
    <div className="App">
      <aside className={`sidebar ${isSidebarOpen ? '' : 'closed'}`}>
        <div className="sidebar-header">
          <h2>我的页面</h2>
          <ToggleButton />
        </div>
        {/* 省略其他JSX... */}
        <button className="add-page-button" onClick={handleAddPage}>+ 新建页面</button>
        <ul className="page-list">
          {pages.map(page => (
            <li key={page.id} onContextMenu={(e) => handleContextMenu(e, page.id)}>
              {renamingPageId === page.id ? ( <input type="text" className="rename-input" value={renameInputValue} onChange={(e) => setRenameInputValue(e.target.value)} onBlur={handleRenameSubmit} onKeyDown={handleRenameKeyDown} autoFocus /> ) : ( <button className={page.id === activePageId ? 'active' : ''} onClick={() => setActivePageId(page.id)} onDoubleClick={() => startRename(page)}> {page.name || ' '} </button> )}
            </li>
          ))}
        </ul>
      </aside>

      <main className="main-content">
        {!isSidebarOpen && <ToggleButton isFloating={true} />}
        {activePage && (
          <div className="excalidraw-wrapper">
            <Excalidraw key={activePage.id} initialData={{ elements: activePage.data }} onChange={handleDrawingChange} />
          </div>
        )}
      </main>

      {contextMenu.visible && (
        <ContextMenu 
          x={contextMenu.x} y={contextMenu.y} pageId={contextMenu.pageId}
          onRename={() => startRename(pages.find(p => p.id === contextMenu.pageId))}
          onDelete={handleDeletePage}
          onClose={() => setContextMenu({ visible: false })}
        />
      )}
    </div>
  );
}

export default App;