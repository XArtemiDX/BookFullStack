const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
require('dotenv').config();

const dbPath = process.env.DATABASE_URL || './books.db';
const dbDir = require('path').dirname(dbPath);

if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new sqlite3.Database(dbPath);

const initDatabase = () => {
  return new Promise((resolve, reject) => {
    
    db.run(`
      CREATE TABLE IF NOT EXISTS books (
        id TEXT PRIMARY KEY,
        title TEXT,
        author TEXT,
        year INTEGER,
        publisher TEXT,
        description TEXT,
        extracted_text TEXT,
        cover_url TEXT,
        language TEXT,
        confidence REAL DEFAULT 0,
        status TEXT DEFAULT 'draft',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) return reject(err);

      db.run("ALTER TABLE books ADD COLUMN publisher TEXT", () => {
          db.run(`
            CREATE TABLE IF NOT EXISTS book_images (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              book_id TEXT,
              image_url TEXT,
              image_type TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (book_id) REFERENCES books (id)
            )
          `, (err) => {
            if (err) return reject(err);
            
            db.run(`
              CREATE TABLE IF NOT EXISTS book_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                book_id TEXT,
                field_name TEXT,
                old_value TEXT,
                new_value TEXT,
                changed_by TEXT DEFAULT 'system',
                changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (book_id) REFERENCES books (id)
              )
            `, (err) => {
              if (err) reject(err);
              else {
                console.log('Database initialized (schema updated)');
                resolve();
              }
            });
          });
      });
    });
  });
};

module.exports = { db, initDatabase };