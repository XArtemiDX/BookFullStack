const Queue = require('bull');
const ocrService = require('../src/services/ocrService');

// Используем 127.0.0.1
const bookQueue = new Queue('book-processing', {
  redis: { port: 6379, host: '127.0.0.1' }
});

bookQueue.process(async (job) => {
  const { filePath, language } = job.data;
  
  console.log(`[Picture ${job.id}] Начало обработки: ${filePath}`);

  try {
    const ocrData = await ocrService.processBookCover(filePath, language);
    
    console.log(`[Picture ${job.id}] Успешно завершено`);

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
    console.error(`[Picture ${job.id}] Ошибка:`, error);
    throw error;
  }
});

module.exports = bookQueue;
