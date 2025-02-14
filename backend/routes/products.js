const express = require("express");
const router = express.Router();
const db = require("../config/database");
const upload = require("../middleware/upload");
const fs = require("fs").promises;
const path = require("path");
const authMiddleware = require("../middleware/auth");

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "../uploads/products");
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

// Serve static files
router.use("/images", express.static("uploads/products"));

// Get all products with pagination and filtering
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const category = req.query.category;
    const search = req.query.search;

    let query = `
        SELECT p.*, c.name as category_name, 
               GROUP_CONCAT(pi.filename) as images
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN product_images pi ON p.id = pi.product_id
      `;
    let countQuery = "SELECT COUNT(DISTINCT p.id) as total FROM products p";
    let queryParams = [];

    if (category || search) {
      query += " WHERE";
      countQuery += " WHERE";

      if (category) {
        query += " p.category_id = ?";
        countQuery += " p.category_id = ?";
        queryParams.push(category);
      }

      if (search) {
        if (category) {
          query += " AND";
          countQuery += " AND";
        }
        query += " p.name LIKE ?";
        countQuery += " p.name LIKE ?";
        queryParams.push(`%${search}%`);
      }
    }

    query += " GROUP BY p.id LIMIT ? OFFSET ?";
    queryParams.push(limit, offset);

    const [products] = await db.query(query, queryParams);
    const [totalRows] = await db.query(countQuery, queryParams.slice(0, -2));

    const totalPages = Math.ceil(totalRows[0].total / limit);

    res.json({
      products,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalRows[0].total,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Error fetching products" });
  }
});

// Get product by ID
router.get("/:id", async (req, res) => {
  try {
    const [product] = await db.query(
      `
        SELECT p.*, c.name as category_name,
               GROUP_CONCAT(pi.filename) as images
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        LEFT JOIN product_images pi ON p.id = pi.product_id
        WHERE p.id = ?
        GROUP BY p.id
      `,
      [req.params.id]
    );

    if (product.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product[0]);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Error fetching product" });
  }
});

// Create new product with image upload
router.post(
  "/",
  authMiddleware,
  upload.array("images", 5),
  async (req, res) => {
    const { name, description, price, category_id, stock } = req.body;

    try {
      // Validate input
      if (!name || !price) {
        // Delete uploaded files if validation fails
        if (req.files) {
          await Promise.all(
            req.files.map((file) => fs.unlink(file.path).catch(console.error))
          );
        }
        return res.status(400).json({ message: "Name and price are required" });
      }

      // Start transaction
      await db.query("START TRANSACTION");

      // Insert product
      const [result] = await db.query(
        "INSERT INTO products (name, description, price, category_id, stock) VALUES (?, ?, ?, ?, ?)",
        [name, description, price, category_id, stock]
      );

      // Handle image uploads
      if (req.files && req.files.length > 0) {
        const imageValues = req.files.map((file) => [
          result.insertId,
          file.filename,
          file.path,
        ]);

        await db.query(
          "INSERT INTO product_images (product_id, filename, filepath) VALUES ?",
          [imageValues]
        );
      }

      // Commit transaction
      await db.query("COMMIT");

      // Get the created product with images
      const [newProduct] = await db.query(
        `
      SELECT p.*, GROUP_CONCAT(pi.filename) as images
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE p.id = ?
      GROUP BY p.id
    `,
        [result.insertId]
      );

      res.status(201).json(newProduct[0]);
    } catch (error) {
      // Rollback transaction on error
      await db.query("ROLLBACK");
      console.error("Error:", error);
      res.status(500).json({ message: "Error creating product" });
    }
  }
);

// Update product
router.put(
  "/:id",
  authMiddleware,
  upload.array("images", 5),
  async (req, res) => {
    const { name, description, price, category_id, stock } = req.body;
    const productId = req.params.id;

    try {
      // Check if product exists
      const [existingProduct] = await db.query(
        "SELECT * FROM products WHERE id = ?",
        [productId]
      );

      if (existingProduct.length === 0) {
        if (req.files) {
          await Promise.all(
            req.files.map((file) => fs.unlink(file.path).catch(console.error))
          );
        }
        return res.status(404).json({ message: "Product not found" });
      }

      // Start transaction
      await db.query("START TRANSACTION");

      // Update product details
      await db.query(
        "UPDATE products SET name = ?, description = ?, price = ?, category_id = ?, stock = ? WHERE id = ?",
        [name, description, price, category_id, stock, productId]
      );

      // Handle new image uploads
      if (req.files && req.files.length > 0) {
        const imageValues = req.files.map((file) => [
          productId,
          file.filename,
          file.path,
        ]);

        await db.query(
          "INSERT INTO product_images (product_id, filename, filepath) VALUES ?",
          [imageValues]
        );
      }

      // Commit transaction
      await db.query("COMMIT");

      // Get updated product with images
      const [updatedProduct] = await db.query(
        `
      SELECT p.*, GROUP_CONCAT(pi.filename) as images
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE p.id = ?
      GROUP BY p.id
    `,
        [productId]
      );

      res.json(updatedProduct[0]);
    } catch (error) {
      // Rollback transaction on error
      await db.query("ROLLBACK");
      console.error("Error:", error);
      res.status(500).json({ message: "Error updating product" });
    }
  }
);

// Delete product
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    // Start transaction
    await db.query("START TRANSACTION");

    // Get product images
    const [images] = await db.query(
      "SELECT filepath FROM product_images WHERE product_id = ?",
      [req.params.id]
    );

    // Delete image files
    await Promise.all(
      images.map((image) => fs.unlink(image.filepath).catch(console.error))
    );

    // Delete product images from database
    await db.query("DELETE FROM product_images WHERE product_id = ?", [
      req.params.id,
    ]);

    // Delete product
    const [result] = await db.query("DELETE FROM products WHERE id = ?", [
      req.params.id,
    ]);

    if (result.affectedRows === 0) {
      await db.query("ROLLBACK");
      return res.status(404).json({ message: "Product not found" });
    }

    // Commit transaction
    await db.query("COMMIT");

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    // Rollback transaction on error
    await db.query("ROLLBACK");
    console.error("Error:", error);
    res.status(500).json({ message: "Error deleting product" });
  }
});

// Delete product image
router.delete(
  "/:productId/images/:imageId",
  authMiddleware,
  async (req, res) => {
    try {
      // Get image details
      const [image] = await db.query(
        "SELECT * FROM product_images WHERE id = ? AND product_id = ?",
        [req.params.imageId, req.params.productId]
      );

      if (image.length === 0) {
        return res.status(404).json({ message: "Image not found" });
      }

      // Delete file
      await fs.unlink(image[0].filepath);

      // Delete from database
      await db.query("DELETE FROM product_images WHERE id = ?", [
        req.params.imageId,
      ]);

      res.json({ message: "Image deleted successfully" });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ message: "Error deleting image" });
    }
  }
);

module.exports = router;
