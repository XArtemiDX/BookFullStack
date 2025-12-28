const Queue = require('bull');
const ocrService = require('../src/services/ocrService'); // Убедитесь, что путь правильный

// Создаем подключение к Redis
// Используем 127.0.0.1, так как на Windows localhost иногда глючит с Node.js
const bookQueue = new Queue('book-processing', {
  redis: { port: 6379, host: '127.0.0.1' }
});

// ПРОЦЕССОР (WORKER)
// Этот код запускается, когда в Redis появляется новая задача
bookQueue.process(async (job) => {
  const { filePath, language } = job.data;
  
  console.log(`[Job ${job.id}] Начало обработки: ${filePath}`);

  try {
    // Вызываем тяжелую функцию OCR + GPT
    const ocrData = await ocrService.processBookCover(filePath, language);
    
    console.log(`[Job ${job.id}] Успешно завершено`);

    // Возвращаем результат. Он сохранится в Redis, и мы заберем его контроллером.
    return {
      title: ocrData.title || '',
      author: ocrData.author || '',
      year: ocrData.year || '',
      publisher: ocrData.publisher || '',
      extracted_text: ocrData.extracted_text || '',
      remaining_text: ocrData.remaining_text || '',
      raw_text: ocrData.raw_ocr_text || '',
      confidence: ocrData.confidence || 0,
      language
    };
  } catch (error) {
    console.error(`[Job ${job.id}] Ошибка:`, error);
    throw error;
  }
});

module.exports = bookQueue;
