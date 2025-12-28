const { db } = require('../db/database');

class BookController {
  async getAllBooks(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const books = await new Promise((resolve, reject) => {
        db.all(
          `SELECT * FROM books ORDER BY created_at DESC LIMIT ? OFFSET ?`,
          [parseInt(limit), parseInt(offset)],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });

      const totalResult = await new Promise((resolve, reject) => {
        db.get(`SELECT COUNT(*) as total FROM books`, [], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      res.json({
        books,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalResult.total,
          pages: Math.ceil(totalResult.total / limit)
        }
      });
    } catch (error) {
      console.error('Get all books error:', error);
      res.status(500).json({ error: 'Failed to get books' });
    }
  }

  async getBook(req, res) {
    try {
      const { id } = req.params;
      
      const book = await new Promise((resolve, reject) => {
        db.get(`SELECT * FROM books WHERE id = ?`, [id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!book) return res.status(404).json({ error: 'Book not found' });

      const images = await new Promise((resolve, reject) => {
        db.all(`SELECT * FROM book_images WHERE book_id = ?`, [id], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      book.images = images;
      res.json(book);
    } catch (error) {
      console.error('Get book error:', error);
      res.status(500).json({ error: 'Failed to get book' });
    }
  }

  async updateBook(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const currentBook = await new Promise((resolve, reject) => {
        db.get(`SELECT * FROM books WHERE id = ?`, [id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!currentBook) return res.status(404).json({ error: 'Book not found' });


      const fields = ['title', 'author', 'year', 'description', 'status', 'publisher', 'confidence'];
      const updateFields = [];
      const updateParams = [];

      fields.forEach(field => {
        if (updates[field] !== undefined && updates[field] !== currentBook[field]) {
          updateFields.push(`${field} = ?`);
          updateParams.push(updates[field]);
        }
      });

      if (updateFields.length === 0) return res.json(currentBook);

      updateParams.push(id);
      updateFields.push('updated_at = CURRENT_TIMESTAMP');

      await new Promise((resolve, reject) => {
        const query = `UPDATE books SET ${updateFields.join(', ')} WHERE id = ?`;
        db.run(query, updateParams, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const updatedBook = await new Promise((resolve, reject) => {
        db.get(`SELECT * FROM books WHERE id = ?`, [id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      res.json(updatedBook);
    } catch (error) {
      console.error('Update book error:', error);
      res.status(500).json({ error: 'Failed to update book' });
    }
  }

  async deleteBook(req, res) {
    try {
      const { id } = req.params;
      await new Promise((resolve, reject) => {
        db.run(`DELETE FROM books WHERE id = ?`, [id], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      res.json({ message: 'Book deleted successfully' });
    } catch (error) {
      console.error('Delete book error:', error);
      res.status(500).json({ error: 'Failed to delete book' });
    }
  }

  //на вырост
  async getBookHistory(req, res) {
    try {
      const { id } = req.params;
      const history = await new Promise((resolve, reject) => {
        db.all(
          `SELECT * FROM book_history WHERE book_id = ? ORDER BY changed_at DESC`,
          [id],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });
      res.json(history);
    } catch (error) {
      console.error('Get book history error:', error);
      res.status(500).json({ error: 'Failed to get book history' });
    }
  }
}

module.exports = new BookController();
