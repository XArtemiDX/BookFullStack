import React, { useState, useRef } from 'react';

// Простой стиль для модального окна и контейнера
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    fontFamily: 'Arial, sans-serif',
    gap: '20px',
  },
  
  button: {
    padding: '10px 20px',
    fontSize: '16px',
    cursor: 'pointer',
    backgroundColor: '#007BFF',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    minWidth: '300px',
  },
  fileInfo: {
    marginTop: '10px',
    fontStyle: 'italic',
  }
};

const PhotoUploader = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [language, setLanguage] = useState('ru'); // Значение по умолчанию
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Ссылка на скрытый input для файла
  const fileInputRef = useRef(null);

  // Обработчик выбора файла
  const handleFileChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  // Триггер для нажатия на скрытый input
  const handlePickFileClick = () => {
    fileInputRef.current.click();
  };

  // Метод для отправки данных (фото + язык)
  const sendData = async () => {
    if (!selectedFile) {
      alert('Пожалуйста, сначала выберите фото!');
      return;
    }

    // Используем FormData для отправки файлов
    const formData = new FormData();
    formData.append('photo', selectedFile);
    formData.append('language', language);

    try {
      // Пример запроса на сервер
      // Замените '/api/upload' на ваш реальный URL
      const response = await fetch('https://example.com/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        alert(`Успешно отправлено!\nЯзык: ${language}\nФайл: ${selectedFile.name}`);
      } else {
        alert('Ошибка при отправке.');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Произошла сетевая ошибка.');
    }
  };

  return (
    <div style={styles.container}>
      <h1>Загрузчик Фото</h1>

      {/* 1. Кнопка выбора фото */}
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={handleFileChange} 
      />
      <button style={styles.button} onClick={handlePickFileClick}>
        Выбрать фото
      </button>

      {selectedFile && (
        <div style={styles.fileInfo}>Выбран файл: {selectedFile.name}</div>
      )}

      {/* Кнопка для открытия окна выбора языка */}
      <button style={{...styles.button, backgroundColor: '#28A745'}} onClick={() => setIsModalOpen(true)}>
        Выбрать язык (Текущий: {language})
      </button>

      {/* Кнопка отправки */}
      <button style={{...styles.button, backgroundColor: '#FFC107', color: 'black'}} onClick={sendData}>
        Отправить данные
      </button>

      {/* 2. Отдельное окно (Модальное окно) для выбора языка */}
      {isModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          {/* stopPropagation предотвращает закрытие при клике внутри окна */}
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3>Выберите язык</h3>
            <label>
              <input 
                type="radio" 
                value="ru" 
                checked={language === 'ru'} 
                onChange={(e) => setLanguage(e.target.value)} 
              /> Русский
            </label>
            <label>
              <input 
                type="radio" 
                value="en" 
                checked={language === 'en'} 
                onChange={(e) => setLanguage(e.target.value)} 
              /> Английский
            </label>
            <label>
              <input 
                type="radio" 
                value="old_slavonic" 
                checked={language === 'old_slavonic'} 
                onChange={(e) => setLanguage(e.target.value)} 
              /> Старославянский
            </label>
            
            <button style={{...styles.button, marginTop: '20px'}} onClick={() => setIsModalOpen(false)}>
              Готово
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoUploader;
