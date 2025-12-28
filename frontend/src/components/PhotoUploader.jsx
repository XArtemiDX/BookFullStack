import React, { useState, useRef, useEffect } from 'react';

import { useCamera } from '../hooks/useCamera';
import { useSidebarResize } from '../hooks/useSidebarResize';
import { Icons } from './Icons';
import { LANGUAGES } from '../data/constants';
import '../styles/PhotoUploader.css';

const PhotoUploader = () => {
  const [theme, setTheme] = useState('light');
  const [currentStep, setCurrentStep] = useState('upload');
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  const [language, setLanguage] = useState('ru');
  const [formData, setFormData] = useState({ 
    title: '', 
    author: '', 
    year: '', 
    publisher: '',
    text: '', 
    confidence: null,
    image_url: '',
    ocr_data: null
  });
  
  const [isDragActive, setIsDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [isMobileInputFocused, setIsMobileInputFocused] = useState(false);
  
  const blurTimerRef = useRef(null);
  const fileInputRef = useRef(null);

  const showToast = (type, text) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const processFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setCurrentStep('upload');
    } else {
      showToast('error', 'Пожалуйста, выберите файл изображения');
    }
  };

  const { 
      videoRef, 
      isActive: isCameraOpen, 
      isInitializing: isCameraLoading, 
      startCamera, 
      stopCamera, 
      capturePhoto 
  } = useCamera(processFile, (msg) => showToast('error', msg));
  
  const { width: sidebarWidth, isResizing, startResize } = useSidebarResize(360);

  const pollStatus = (jobId, imageUrl, tempBookId) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/books/status/${jobId}`);
        
        if (!res.ok) throw new Error('Network response was not ok');
        
        const data = await res.json();

        if (data.status === 'completed') {
          clearInterval(interval);
          
          setFormData(prev => ({
            ...prev,
            title: data.ocr_data.title || '',
            author: data.ocr_data.author || '',
            year: data.ocr_data.year || '',
            publisher: data.ocr_data.publisher || '',
            text: data.ocr_data.raw_text || '',
            confidence: null,
            image_url: imageUrl,
            ocr_data: data.ocr_data,
            temp_book_id: tempBookId
          }));
          
          setIsProcessing(false);
          setCurrentStep('review');
          
        } else if (data.status === 'failed') {
           clearInterval(interval);
           setIsProcessing(false);
           showToast('error', 'Ошибка обработки: ' + (data.error || 'Unknown'));
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    }, 1000);
  };

  const handleNextStep = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('image', selectedFile);
      formDataUpload.append('language', language);

      const response = await fetch('http://localhost:8000/api/books/upload', {
        method: 'POST',
        body: formDataUpload,
      });

      if (!response.ok) throw new Error('Ошибка загрузки');
      
      const data = await response.json();
      
      //бэкенд вернул jobId, следим
      if (data.jobId) {
        pollStatus(data.jobId, data.image_url, data.temp_book_id);
      } else {
        throw new Error('Не получен ID задачи');
      }

    } catch (error) {
      console.error('Ошибка:', error);
      showToast('error', 'Ошибка загрузки файла');
      setIsProcessing(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.author) {
      showToast('error', 'Заполните название и автора');
      return;
    }
    if (!formData.confidence) {
      showToast('error', 'Пожалуйста, оцените качество распознавания');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('http://localhost:8000/api/books/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title || null,
          author: formData.author || null,
          year: formData.year || null,
          publisher: formData.publisher || null,
          description: formData.text,
          language: language, 
          image_url: formData.image_url,
          ocr_data: formData.ocr_data,
          confidence: formData.confidence
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка сохранения');
      }

      const result = await response.json();
      
      setIsProcessing(false);
      showToast('success', '✔ Книга успешно сохранена в базу данных!');
      
      setTimeout(() => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setCurrentStep('upload');
        setFormData({ 
            title: '', 
            author: '', 
            year: '', 
            publisher: '', 
            confidence: null,
            text: '',
            image_url: '',
            ocr_data: null 
          });
        }, 1500);

      } catch (error) {
      console.error('Ошибка сохранения:', error);
      showToast('error', `Ошибка сохранения: ${error.message}`);
      setIsProcessing(false);
    }
  };



  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFocus = (e) => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    if (window.innerWidth <= 768) {
      setIsMobileInputFocused(true);
      setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
    }
  };

  const handleBlur = () => {
    blurTimerRef.current = setTimeout(() => setIsMobileInputFocused(false), 150);
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleDragOver = (e) => { e.preventDefault(); setIsDragActive(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragActive(false); };
  const handleDrop = (e) => { e.preventDefault(); setIsDragActive(false); processFile(e.dataTransfer.files[0]); };

  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) processFile(items[i].getAsFile());
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleRating = (rating) => {
    setFormData(prev => ({ ...prev, confidence: rating }));
  };

  return (
    <div className={`app-layout step-${currentStep} ${isMobileInputFocused ? 'input-focused' : ''}`} data-theme={theme}>
        
        {toastMessage && <div className={`toast ${toastMessage.type}`}>{toastMessage.text}</div>}
        
        <div className="mobile-theme-btn" style={{display: window.innerWidth > 768 ? 'none' : 'block'}} onClick={toggleTheme}>
           {theme === 'light' ? <Icons.Moon /> : <Icons.Sun />}
        </div>

        <div className="sidebar" style={{ width: window.innerWidth > 768 ? sidebarWidth : '100%' }}>
          <div className={`resizer-handle ${isResizing ? 'active' : ''}`} onMouseDown={startResize}></div>
          <div className="sheet-handle" onClick={() => setIsMobileInputFocused(false)}></div>
          
          <div className="header">
            <div className="brand">Цифровой <br/> Книжный Приют</div>
            <button className="theme-btn" onClick={toggleTheme}>
              {theme === 'light' ? <Icons.Moon /> : <Icons.Sun />}
            </button>
          </div>

          {currentStep === 'upload' ? (
            <>
              <input type="file" ref={fileInputRef} hidden onChange={e => processFile(e.target.files[0])} accept="image/*" />
              
              {!selectedFile && !isCameraOpen ? (
                <div className="action-grid">
                  <div className="btn-action" onClick={() => fileInputRef.current.click()}>
                    <Icons.Folder /> <span>Файл</span>
                  </div>
                  <div className="btn-action" onClick={startCamera}>
                    <Icons.Camera /> <span>Камера</span>
                  </div>
                </div>
              ) : selectedFile ? (
                <div className="file-card">
                  <div style={{fontWeight:600, fontSize:14}}>{selectedFile.name}</div>
                  <div style={{color:'var(--text-sec)', fontSize:12}}>{(selectedFile.size/1024/1024).toFixed(2)} MB</div>
                </div>
              ) : (
                 <div className="file-card" style={{justifyContent:'center', color:'var(--primary)', borderColor:'var(--primary)'}}>
                   📷 Камера активна...
                 </div>
              )}

              <div>
                <div className="label" style={{marginBottom:8, marginTop: 10}}>Язык перевода</div>
                <div className="lang-list">
                  {LANGUAGES.map(l => (
                    <div key={l.code} className={`lang-item ${language === l.code ? 'active' : ''}`} onClick={() => setLanguage(l.code)}>
                      <span style={{marginRight:8}}>{l.flag}</span> {l.label}
                      {language === l.code && window.innerWidth > 768 && <span style={{fontSize:10}}>●</span>}
                    </div>
                  ))}
                </div>
              </div>

              <button className="btn btn-primary" onClick={handleNextStep} disabled={!selectedFile || isProcessing}>
                {isProcessing ? 'Обработка...' : 'Далее'}
              </button>
            </>
          ) : (
            <>
              <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:5}}>
                <button className="btn btn-secondary" onClick={() => setCurrentStep('upload')} style={{padding:8}}>
                  <Icons.Back />
                </button>
                <div style={{fontSize:16, fontWeight:700}}>Проверка данных</div>
              </div>

              <div className="form-group">
                <div className="label">Автор</div>
                <input className="input-field" name="author" value={formData.author} onChange={handleInputChange} onFocus={handleFocus} onBlur={handleBlur} />
              </div>

              <div className="form-group">
                <div className="label">Название</div>
                <input className="input-field" name="title" value={formData.title} onChange={handleInputChange} onFocus={handleFocus} onBlur={handleBlur} />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div className="form-group" style={{ width: '30%', minWidth: '80px' }}>
                    <div className="label">Год</div>
                    <input 
                        className="input-field" 
                        name="year" 
                        type="number" 
                        value={formData.year} 
                        onChange={handleInputChange} 
                        onFocus={handleFocus} 
                        onBlur={handleBlur} 
                    />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                    <div className="label">Издательство</div>
                    <input 
                        className="input-field" 
                        name="publisher" 
                        value={formData.publisher} 
                        onChange={handleInputChange} 
                        onFocus={handleFocus} 
                        onBlur={handleBlur}
                    />
                </div>
              </div>

              <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div className="label">Остальной текст</div>
                  <textarea 
                      className="input-field textarea-field" 
                      name="text" 
                      value={formData.text} 
                      onChange={handleInputChange} 
                      onFocus={handleFocus} 
                      onBlur={handleBlur}
                      placeholder="Распознанный текст будет здесь..."
                  />
              </div>
              
              
              <div className="rating-section" style={{marginBottom: 20}}>
                <div className="label" style={{marginBottom: 8}}>Оценка уверенности распознавания</div>
                <div className="rating-buttons">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button 
                      key={num}
                      className={`rating-btn ${formData.confidence === num ? 'active' : ''}`}
                      onClick={() => handleRating(num)}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <div style={{fontSize: 11, color: 'var(--text-sec)', marginTop: 4, textAlign: 'center'}}>
                   1 — Плохо, 5 — Отлично
                </div>
              </div>


              <button 
                  className="btn btn-primary" 
                  onClick={handleSubmit} 
                  disabled={!formData.confidence} 
                  style={{marginBottom: isMobileInputFocused ? 20 : 0}}
              >
                {isProcessing ? 'Сохранение...' : 'Отправить'}
              </button>
            </>
          )}
        </div>

        <div className="main-area">
          {isCameraLoading ? (
             <div style={{color: 'var(--text-sec)', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                <div className="spinner" style={{
                    width: 40, height: 40, border: '4px solid var(--border)', 
                    borderTopColor: 'var(--primary)', borderRadius: '50%', 
                    animation: 'spin 1s linear infinite', marginBottom: 15
                }}></div>
                <div>Запуск камеры...</div>
                <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            </div>
          ) : isCameraOpen ? (
            <div className="camera-container">
              <video ref={videoRef} autoPlay playsInline muted></video>
              <div className="cam-close" onClick={stopCamera}><Icons.Close /></div>
              <div className="shutter-btn" onClick={capturePhoto}></div>
            </div>
          ) : previewUrl ? (
            <div className="img-wrap">
                <img src={previewUrl} className="preview-img" alt="preview" />
                {currentStep === 'upload' && (
                  <div className="preview-close" onClick={() => {setSelectedFile(null); setPreviewUrl(null); setCurrentStep('upload'); }}>
                    <Icons.Close />
                  </div>
                )}
            </div>
          ) : (
            <div 
                className={`drop-zone ${isDragActive ? 'active' : ''}`} 
                onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} 
                onClick={() => fileInputRef.current.click()}
            >
              <Icons.Upload />
              <div style={{marginTop:15, fontWeight:600, color:'var(--text)'}}>Перетащите фото</div>
              <div style={{fontSize:13, marginTop:5, color:'var(--text-sec)'}}>или выберите в меню</div>
            </div>
          )}
        </div>
      </div>
  );
};

export default PhotoUploader;
