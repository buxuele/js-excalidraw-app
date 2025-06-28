import React, { useState, useEffect } from 'react';
import { exportToBlob } from '@excalidraw/excalidraw';
import { db } from './db';
import { generateRandomName } from './utils/nameGenerator';
import './App.css';

const ContextMenu = ({ x, y, page, onRename, onDelete, onClose }) => { /* ...代码保持不变... */ useEffect(() => { const handleClickOutside = () => onClose(); document.addEventListener('click', handleClickOutside); return () => document.removeEventListener('click', handleClickOutside); }, [onClose]); return ( <div className="context-menu" style={{ top: y, left: x }}> <button className="context-menu-item" onClick={() => { onRename(page); onClose(); }}>重命名</button> <button className="context-menu-item delete" onClick={() => { onDelete(page.id); onClose(); }}>删除页面</button> </div> ); };

// --- 关键修复：一个全新的、绝对可靠的缩略图组件 ---
const ProjectThumbnail = ({ pageData }) => {
  const [thumbnail, setThumbnail] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    // 如果页面已经有缩略图，或者没有绘图数据，或者正在生成中，就直接返回
    if (pageData.thumbnail || !pageData.data || pageData.data.length === 0 || isGenerating) {
      if(pageData.thumbnail) setThumbnail(pageData.thumbnail);
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
          // 把生成的缩略图存回数据库，下次就不用再生成了
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
  return <div style={{ color: '#aaa' }}>{isGenerating ? '生成中...' : '没有缩略图'}</div>;
};

// 作品卡片组件
const ProjectCard = ({ page, ...props }) => {
  return (
    <div className="project-card" onContextMenu={(e) => props.onContextMenu(e, page)}>
      {/* 关键：把整个 page 对象都传给缩略图组件 */}
      <div className="card-thumbnail" onClick={() => props.onSelect(page.id)}>
        <ProjectThumbnail pageData={page} />
      </div>
      <div className="card-info">
        {/* ...重命名相关的 JSX 保持不变... */}
        {props.renamingPageId === page.id ? ( <input type="text" className="rename-input-card" value={props.renameInputValue} onChange={(e) => props.setRenameInputValue(e.target.value)} onBlur={() => props.onRenameSubmit()} onKeyDown={(e) => { if (e.key === 'Enter') props.onRenameSubmit(); else if (e.key === 'Escape') props.onRenameSubmit(true); }} onClick={(e) => e.stopPropagation()} autoFocus /> ) : ( <span className="page-name" onClick={() => props.onSelect(page.id)}>{page.name}</span> )}
      </div>
    </div>
  );
};


// HomePage 主组件
function HomePage({ onNavigateToPage }) {
  // ...所有的 state 和函数都保持不变...
  const [pages, setPages] = useState([]); const [isLoading, setIsLoading] = useState(true); const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, page: null }); const [renamingPageId, setRenamingPageId] = useState(null); const [renameInputValue, setRenameInputValue] = useState(''); useEffect(() => { loadPages(); }, []); const loadPages = async () => { setIsLoading(true); let dbPages = await db.getAllPages(); dbPages.sort((a, b) => b.id.localeCompare(a.id)); setPages(dbPages); setIsLoading(false); }; const handleAddNewPage = async () => { const newPage = { id: `page-${Date.now()}`, name: generateRandomName(), data: [] }; await db.upsertPage(newPage); onNavigateToPage(newPage.id); }; const handleDeletePage = async (pageId) => { if (window.confirm("确定要删除吗？")) { await db.deletePage(pageId); loadPages(); } }; const handleContextMenu = (e, page) => { e.preventDefault(); e.stopPropagation(); setRenamingPageId(null); setContextMenu({ visible: true, x: e.pageX, y: e.pageY, page: page }); }; const startRename = (page) => { setRenamingPageId(page.id); setRenameInputValue(page.name); }; const handleRenameSubmit = async (isCancel = false) => { if (!renamingPageId) return; if (!isCancel) { const finalName = renameInputValue.trim() || "未命名草稿"; const pageToUpdate = pages.find(p => p.id === renamingPageId); if (pageToUpdate && pageToUpdate.name !== finalName) { const updatedPage = { ...pageToUpdate, name: finalName }; await db.upsertPage(updatedPage); setPages(pages.map(p => p.id === renamingPageId ? updatedPage : p)); } } setRenamingPageId(null); }; if (isLoading) return <div>正在加载作品集...</div>;

  return (
    // ...主页的 JSX 结构保持不变...
    <div className="home-page-container"> <h1>我的作品集</h1> <div className="projects-grid"> <div className="project-card new-project-card" onClick={handleAddNewPage}> <div className="plus-icon">+</div> </div> {pages.map(page => ( <ProjectCard key={page.id} page={page} onSelect={onNavigateToPage} onContextMenu={handleContextMenu} onRenameSubmit={handleRenameSubmit} renamingPageId={renamingPageId} setRenameInputValue={setRenameInputValue} renameInputValue={renameInputValue} /> ))} </div> {contextMenu.visible && ( <ContextMenu x={contextMenu.x} y={contextMenu.y} page={contextMenu.page} onRename={startRename} onDelete={handleDeletePage} onClose={() => setContextMenu({ ...contextMenu, visible: false })} /> )} </div>
  );
}

export default HomePage;