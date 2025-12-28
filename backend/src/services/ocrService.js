require('dotenv').config();
const axios = require('axios');
const fs = require('fs').promises;
const sharp = require('sharp');

class BookRecognitionService {
  constructor() {
    this.visionApiKey = process.env.YANDEX_VISION_API_KEY;
    this.gptApiKey = process.env.YANDEX_GPT_API_KEY;
    this.folderId = process.env.YANDEX_FOLDER_ID;

    if (!this.folderId || !this.visionApiKey) {
      console.warn('Warning: Yandex Credentials are missing in environment variables.');
    } else {
      console.log('Yandex Book Service ready');
    }
  }

  async preprocessImage(imagePath) {
    try {
      const buffer = await fs.readFile(imagePath);
      return await sharp(buffer)
        .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toBuffer();
    } catch (error) {
      console.error('Preprocess failed (using raw file):', error.message);
      return fs.readFile(imagePath);
    }
  }

  async recognizeTextWithVision(imageBuffer, language = 'ru') {
    try {
      const base64Image = imageBuffer.toString('base64');
      const url = 'https://vision.api.cloud.yandex.net/vision/v1/batchAnalyze';

      const response = await axios.post(url, {
        folderId: this.folderId,
        analyze_specs: [{
          content: base64Image,
          features: [{
            type: 'TEXT_DETECTION',
            text_detection_config: {
              language_codes: ['*'] 
            }
          }]
        }]
      }, {
        headers: {
          'Authorization': `Api-Key ${this.visionApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      let fullText = '';
      try {
        const blocks = response.data.results?.[0]?.results?.[0]?.textDetection?.pages?.[0]?.blocks;
        blocks.forEach(block => {
          block.lines?.forEach(line => {
            const lineText = line.words?.map(w => w.text).join(' ');
            if (lineText.trim()) fullText += lineText + '\n';
          });
        });
      } catch (e) {
        console.warn('Error parsing Vision response structure');
      }

      return fullText.trim();

    } catch (error) {
      console.error('Vision API error:', error.response?.data.error.message);
      throw new Error('Failed to recognize text');
    }
  }

  async analyzeTextWithGPT(ocrText) {
    if (!ocrText || ocrText.length < 5) return null;

    try {
      const url = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';
      
      const systemPrompt = `
        Ты — библиотекарь. Твоя задача — структурировать текст, распознанный с обложки книги.
        
        Верни ответ СТРОГО в формате JSON (без Markdown, без лишних слов) со следующими полями:
        - "title" (название книги, строка)
        - "author" (автор или авторы, строка. Обычно находится вверху или внизу изображения)
        - "year" (год издания, число)
        - "publisher" (название издательства, строка. Например: "Манн, Иванов и Фербер", "АСТ", "Эксмо")
        - "extracted_text" (весь остальной текст с обложки, который НЕ является названием, автором, годом или издательством. Сюда входят: цитаты, жанр, описание, слоганы, том, серия).

        Исправляй явные ошибки OCR (опечатки).
      `;

      const response = await axios.post(url, {
        modelUri: `gpt://${this.folderId}/yandexgpt/latest`,
        completionOptions: {
          stream: false,
          temperature: 0.1, 
          maxTokens: 1000
        },
        messages: [
          { role: 'system', text: systemPrompt },
          { role: 'user', text: `Текст с обложки:\n${ocrText}` }
        ]
      }, {
        headers: {
          'Authorization': `Api-Key ${this.gptApiKey}`,
          'x-folder-id': this.folderId
        }
      });

      let rawAnswer = response.data.result.alternatives[0].message.text;
      rawAnswer = rawAnswer.replace(/```json/g, '').replace(/```/g, '').trim();
      
      return JSON.parse(rawAnswer);

    } catch (error) {
      console.error('GPT API error:', error.response?.data || error.message);
      return null;
    }
  }

  fallbackExtract(text) {
    console.log('Using fallback regex extraction...');
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    const metadata = { 
        title: null, 
        author: null, 
        year: null, 
        publisher: null,
        extracted_text: text
    };

    if (lines.length === 0) return metadata;

    const yearRegex = /\b(19|20)\d{2}\b/;
    let yearFound = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (!yearFound) {
            const match = line.match(yearRegex);
            if (match) {
                metadata.year = parseInt(match[0]);
                yearFound = true;
                continue;
            }
        }
        if (!metadata.author && line.length > 3 && !/\d/.test(line)) {
            metadata.author = line;
            continue;
        }
        if (!metadata.title && line.length > 1) {
            metadata.title = line;
            continue;
        }
    }
    
    return metadata;
  }

  async processBookCover(imagePath) {
    console.log(`\n Processing: ${imagePath}`);
    const start = Date.now();

    try {
      const imageBuffer = await this.preprocessImage(imagePath);

      const rawText = await this.recognizeTextWithVision(imageBuffer);
      console.log(`OCR Text length: ${rawText.length} chars`);

      if (!rawText) throw new Error('No text found on image');

      let metadata = await this.analyzeTextWithGPT(rawText);

      if (!metadata) {
        metadata = this.fallbackExtract(rawText);
      } else {
        console.log('> Used YandexGPT for structure');
      }

      metadata.raw_ocr_text = rawText;
      
      console.log(`Done in ${(Date.now() - start) / 1000}s`);
      return metadata;

    } catch (error) {
      console.error('Processing failed:', error.message);
      return { error: error.message };
    }
  }
}

const service = new BookRecognitionService();
module.exports = service;