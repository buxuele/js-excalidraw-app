import React, { useState } from 'react';
import HomePage from './HomePage';
import EditorPage from './EditorPage';

function App() {
  // `currentPageId` 是我们应用的核心状态。
  // 如果是 null，就显示 HomePage。
  // 如果有值（比如 'page-xxx'），就显示 EditorPage。
  const [currentPageId, setCurrentPageId] = useState(null);

  // 这个函数会由 HomePage 调用，告诉 App 我们要去某个编辑器页面了
  const handleNavigateToEditor = (pageId) => {
    setCurrentPageId(pageId);
  };

  // 这个函数会由 EditorPage 调用，告诉 App 我们要返回主页了
  const handleBackToHome = () => {
    setCurrentPageId(null);
  };

  // 根据 currentPageId 的值，决定渲染哪个视图
  return (
    <div>
      {currentPageId === null ? (
        <HomePage onNavigateToPage={handleNavigateToEditor} />
      ) : (
        <EditorPage pageId={currentPageId} onBack={handleBackToHome} />
      )}
    </div>
  );
}

export default App;