// routes/categories.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all categories
router.get('/', async (req, res) => {
  try {
    const [categories] = await db.query(`
      SELECT c.*, COUNT(p.id) as product_count 
      FROM categories c 
      LEFT JOIN products p ON c.id = p.category_id 
      GROUP BY c.id
    `);
    res.json(categories);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error fetching categories' });
  }
});

// Get category by ID with its products
router.get('/:id', async (req, res) => {
  try {
    // Get category details
    const [category] = await db.query('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    
    if (category.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Get products in this category
    const [products] = await db.query('SELECT * FROM products WHERE category_id = ?', [req.params.id]);
    
    res.json({
      ...category[0],
      products
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error fetching category' });
  }
});

// Create new category
router.post('/', async (req, res) => {
  const { name, description } = req.body;

  // Validate input
  if (!name) {
    return res.status(400).json({ message: 'Category name is required' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO categories (name, description) VALUES (?, ?)',
      [name, description]
    );

    const [newCategory] = await db.query('SELECT * FROM categories WHERE id = ?', [result.insertId]);
    
    res.status(201).json(newCategory[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error creating category' });
  }
});

// Update category
router.put('/:id', async (req, res) => {
  const { name, description } = req.body;
  const categoryId = req.params.id;

  // Validate input
  if (!name) {
    return res.status(400).json({ message: 'Category name is required' });
  }

  try {
    // Check if category exists
    const [existingCategory] = await db.query('SELECT * FROM categories WHERE id = ?', [categoryId]);
    
    if (existingCategory.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await db.query(
      'UPDATE categories SET name = ?, description = ? WHERE id = ?',
      [name, description, categoryId]
    );

    const [updatedCategory] = await db.query('SELECT * FROM categories WHERE id = ?', [categoryId]);
    
    res.json(updatedCategory[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error updating category' });
  }
});

// Delete category
router.delete('/:id', async (req, res) => {
  try {
    // Check if category exists
    const [category] = await db.query('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    
    if (category.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Check if category has products
    const [products] = await db.query('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [req.params.id]);
    
    if (products[0].count > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete category with existing products. Remove or reassign products first.' 
      });
    }

    await db.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error deleting category' });
  }
});

// Get products by category ID (alternative endpoint)
router.get('/:id/products', async (req, res) => {
  try {
    const [products] = await db.query(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      JOIN categories c ON p.category_id = c.id 
      WHERE c.id = ?
    `, [req.params.id]);
    
    if (products.length === 0) {
      return res.status(404).json({ message: 'No products found in this category' });
    }
    
    res.json(products);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error fetching products by category' });
  }
});

module.exports = router;